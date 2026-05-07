import { z } from "zod";
import type {
  NotificationChannel,
  NotificationEventType,
  Prisma,
  PrismaClient
} from "@prisma/client";
import type { AppRole } from "@/lib/auth-types";

export const notificationEventTypes = [
  "CUSTOMER_ORDER_CONFIRMATION",
  "DELIVERY_UPDATE",
  "RECEIPT_ISSUED",
  "LOW_STOCK_ALERT",
  "PENDING_DELIVERY_ALERT",
  "MAINTENANCE_ALERT",
  "EMERGENCY_RECALL",
  "SAFETY_WARNING"
] as const;

export const notificationChannels = ["SMS", "EMAIL", "PUSH"] as const;
export const notificationStatuses = ["PENDING", "SENT", "FAILED"] as const;

export const notificationCreateSchema = z.object({
  eventType: z.enum(notificationEventTypes),
  channel: z.enum(notificationChannels),
  recipientName: z.string().trim().max(120, "Recipient name must be 120 characters or fewer.").optional().nullable(),
  recipientContact: z.string().trim().min(3, "Enter a recipient phone, email, or push target.").max(160, "Recipient contact must be 160 characters or fewer."),
  subject: z.string().trim().max(160, "Subject must be 160 characters or fewer.").optional().nullable(),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(1000, "Message must be 1000 characters or fewer.")
});

export const notificationTemplateSchema = z.object({
  eventType: z.enum(notificationEventTypes),
  channel: z.enum(notificationChannels),
  name: z.string().trim().min(2, "Template name must be at least 2 characters.").max(120, "Template name must be 120 characters or fewer."),
  subject: z.string().trim().max(160, "Subject must be 160 characters or fewer.").optional().nullable(),
  body: z.string().trim().min(10, "Template body must be at least 10 characters.").max(1200, "Template body must be 1200 characters or fewer."),
  isEnabled: z.coerce.boolean().default(true)
});

export const notificationSettingSchema = z.object({
  channel: z.enum(notificationChannels),
  isEnabled: z.coerce.boolean().default(true),
  providerPlaceholder: z.string().trim().max(120, "Provider placeholder must be 120 characters or fewer.").optional().nullable(),
  senderPlaceholder: z.string().trim().max(120, "Sender placeholder must be 120 characters or fewer.").optional().nullable()
});

export const seedNotificationTemplates = notificationEventTypes.flatMap((eventType) =>
  notificationChannels.map((channel) => ({
    eventType,
    channel,
    name: `${formatNotificationEvent(eventType)} ${formatNotificationChannel(channel)}`,
    subject: `${formatNotificationEvent(eventType)} update`,
    body: defaultTemplateBody(eventType, channel),
    isEnabled: true
  }))
);

type NotificationTx = PrismaClient | Prisma.TransactionClient;

export function canViewNotifications(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER", "AUDITOR"].includes(role);
}

export function canManageNotifications(role: AppRole) {
  return role === "ADMIN";
}

export function canSendNotifications(role: AppRole) {
  return ["ADMIN", "WAREHOUSE_MANAGER"].includes(role);
}

export function formatNotificationEvent(eventType: string) {
  return eventType.toLowerCase().split("_").map(capitalize).join(" ");
}

export function formatNotificationChannel(channel: string) {
  return channel.charAt(0) + channel.slice(1).toLowerCase();
}

export function formatNotificationStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function generateNotificationReference() {
  const now = new Date();
  return `NTF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
}

export function renderNotificationTemplate(template: string, payload: Record<string, string | number | null | undefined>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => String(payload[key] ?? ""));
}

export function mockSendNotification(input: { recipientContact: string; message: string; channel?: NotificationChannel }) {
  if (input.recipientContact.toLowerCase().includes("fail")) {
    return { status: "FAILED" as const, failureReason: "Mock send failed because recipient contains 'fail'." };
  }

  if (input.message.toLowerCase().includes("fail")) {
    return { status: "FAILED" as const, failureReason: "Mock send failed because message contains 'fail'." };
  }

  return { status: "SENT" as const, failureReason: null };
}

export async function createMockNotification(
  tx: NotificationTx,
  input: {
    eventType: NotificationEventType;
    channel?: NotificationChannel;
    recipientName?: string | null;
    recipientContact: string;
    subject?: string | null;
    message?: string | null;
    payload?: Prisma.InputJsonValue;
    createdById?: string | null;
  }
) {
  const channel = input.channel ?? "SMS";
  const setting = await tx.notificationChannelSetting.findUnique({ where: { channel } });
  const template = await tx.notificationTemplate.findUnique({
    where: { eventType_channel: { eventType: input.eventType, channel } }
  });

  const baseMessage = input.message ?? template?.body ?? formatNotificationEvent(input.eventType);
  const payloadObject = typeof input.payload === "object" && input.payload && !Array.isArray(input.payload)
    ? input.payload as Record<string, string | number | null | undefined>
    : {};
  const message = renderNotificationTemplate(baseMessage, payloadObject);
  const subject = input.subject ?? template?.subject ?? `${formatNotificationEvent(input.eventType)} update`;
  const disabledReason = !setting?.isEnabled
    ? `${formatNotificationChannel(channel)} channel is disabled.`
    : template && !template.isEnabled
      ? `${formatNotificationEvent(input.eventType)} ${formatNotificationChannel(channel)} template is disabled.`
      : null;
  const sendResult = disabledReason
    ? { status: "FAILED" as const, failureReason: disabledReason }
    : mockSendNotification({ recipientContact: input.recipientContact, message, channel });

  return tx.notification.create({
    data: {
      reference: generateNotificationReference(),
      eventType: input.eventType,
      channel,
      status: sendResult.status,
      templateId: template?.id,
      recipientName: input.recipientName?.trim() || null,
      recipientContact: input.recipientContact.trim(),
      subject,
      message,
      payload: input.payload,
      failureReason: sendResult.failureReason,
      sentAt: sendResult.status === "SENT" ? new Date() : null,
      createdById: input.createdById ?? null
    }
  });
}

function defaultTemplateBody(eventType: NotificationEventType, channel: NotificationChannel) {
  const channelLabel = formatNotificationChannel(channel);
  const bodies: Record<NotificationEventType, string> = {
    CUSTOMER_ORDER_CONFIRMATION: `Your LPG order {{reference}} has been confirmed. ${channelLabel} API integration is pending.`,
    DELIVERY_UPDATE: `Delivery {{reference}} is now {{status}}. ${channelLabel} API integration is pending.`,
    RECEIPT_ISSUED: `Receipt {{reference}} for {{amount}} has been recorded. ${channelLabel} API integration is pending.`,
    LOW_STOCK_ALERT: `Low stock alert for {{sku}} at {{location}}. Current filled stock: {{quantity}}.`,
    PENDING_DELIVERY_ALERT: `Pending delivery {{reference}} requires follow-up in {{zone}}.`,
    MAINTENANCE_ALERT: `Maintenance case {{reference}} needs action for cylinder {{cylinder}}.`,
    EMERGENCY_RECALL: `Emergency recall placeholder: {{reference}}. Follow the safety response process.`,
    SAFETY_WARNING: `Safety warning: {{reference}}. Review compliance notes and quarantine guidance.`
  };

  return bodies[eventType];
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
