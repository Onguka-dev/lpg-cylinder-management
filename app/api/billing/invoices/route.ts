import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import {
  calculateTax,
  generateInvoiceNumber,
  invoiceCreateSchema
} from "@/lib/billing";
import { requireBillingManageSession, requireBillingViewSession } from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = requireBillingViewSession(await getCurrentSession());
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const invoices = await prisma.invoice.findMany({
    where: query
      ? {
          OR: [
            { invoiceNumber: { contains: query, mode: "insensitive" } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
            { customer: { phone: { contains: query, mode: "insensitive" } } },
            { customerOrder: { orderNumber: { contains: query, mode: "insensitive" } } },
            { refillOrder: { orderNumber: { contains: query, mode: "insensitive" } } }
          ]
        }
      : undefined,
    include: { customer: true, customerOrder: true, refillOrder: true, payments: true },
    orderBy: { updatedAt: "desc" },
    take: 150
  });

  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const auth = requireBillingManageSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the invoice form." }, { status: 400 });
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const deliveryFee = new Prisma.Decimal(parsed.data.deliveryFeeAmount ?? 0);
      const discount = new Prisma.Decimal(parsed.data.discountAmount ?? 0);
      const source = parsed.data.sourceType === "CUSTOMER_ORDER"
        ? await loadOrderSource(tx, parsed.data.customerOrderId!)
        : await loadRefillSource(tx, parsed.data.refillOrderId!);

      const subtotal = source.lines.reduce((sum, line) => sum.plus(line.lineTotal), new Prisma.Decimal(0));
      const tax = calculateTax(subtotal);
      const total = subtotal.plus(tax).plus(deliveryFee).minus(discount).toDecimalPlaces(2);
      if (total.lessThan(0)) throw new Error("NEGATIVE_TOTAL");

      const outstanding = await tx.invoice.aggregate({
        where: { customerId: source.customerId, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } },
        _sum: { balanceAmount: true }
      });
      const existingDue = outstanding._sum.balanceAmount ?? new Prisma.Decimal(0);
      const customer = await tx.customer.findUnique({ where: { id: source.customerId } });
      const creditLimit = customer?.creditLimit ?? null;
      const creditLimitExceeded = creditLimit ? existingDue.plus(total).greaterThan(creditLimit) : false;
      if (creditLimitExceeded) throw new Error("CREDIT_LIMIT_EXCEEDED");

      const created = await tx.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          sourceType: parsed.data.sourceType,
          customerId: source.customerId,
          customerOrderId: parsed.data.sourceType === "CUSTOMER_ORDER" ? parsed.data.customerOrderId : null,
          refillOrderId: parsed.data.sourceType === "RETAIL_REFILL" ? parsed.data.refillOrderId : null,
          subtotalAmount: subtotal,
          taxAmount: tax,
          deliveryFeeAmount: deliveryFee,
          discountAmount: discount,
          promotionPlaceholder: parsed.data.promotionPlaceholder?.trim() || null,
          totalAmount: total,
          amountPaid: new Prisma.Decimal(0),
          balanceAmount: total,
          creditLimitChecked: true,
          creditLimitExceeded,
          refundPlaceholder: "Refund handling is a placeholder in Stage 10.",
          notes: parsed.data.notes?.trim() || null,
          createdById: session?.user.id,
          lines: { create: source.lines }
        },
        include: { customer: true, lines: true, payments: true, customerOrder: true, refillOrder: true }
      });

      await tx.auditLog.create({
        data: {
          action: "INVOICE_CREATED",
          details: `${created.invoiceNumber} created for ${created.customer.name}.`,
          userId: session?.user.id
        }
      });

      return created;
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        ORDER_NOT_FOUND: "Selected order was not found.",
        ORDER_NOT_DELIVERED: "Invoices for customer orders can only be generated after delivery.",
        REFILL_NOT_FOUND: "Selected retail sale was not found.",
        REFILL_NOT_CLOSED: "Invoices for retail sales can only be generated after the sale is closed.",
        NEGATIVE_TOTAL: "Invoice total cannot be negative after discounts.",
        CREDIT_LIMIT_EXCEEDED: "This invoice would exceed the customer's credit limit."
      };
      if (messages[error.message]) return NextResponse.json({ error: messages[error.message] }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An invoice already exists for this source or generated invoice number." }, { status: 409 });
    }
    throw error;
  }
}

async function loadOrderSource(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.customerOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { sku: true } }, customer: true }
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "DELIVERED" && order.status !== "CLOSED") throw new Error("ORDER_NOT_DELIVERED");

  const lines = [];
  for (const item of order.items) {
    const unitAmount = await priceForSku(tx, item.skuId, item.sku.code);
    lines.push({
      description: item.sku.name,
      quantity: item.quantity,
      unitAmount,
      lineTotal: unitAmount.mul(item.quantity).toDecimalPlaces(2)
    });
  }

  return { customerId: order.customerId, lines };
}

async function loadRefillSource(tx: Prisma.TransactionClient, refillOrderId: string) {
  const refill = await tx.refillOrder.findUnique({
    where: { id: refillOrderId },
    include: { sku: true, customer: true }
  });
  if (!refill) throw new Error("REFILL_NOT_FOUND");
  if (refill.status !== "CLOSED") throw new Error("REFILL_NOT_CLOSED");

  return {
    customerId: refill.customerId,
    lines: [{
      description: refill.sku.name,
      quantity: 1,
      unitAmount: refill.subtotalAmount,
      lineTotal: refill.subtotalAmount
    }]
  };
}

async function priceForSku(tx: Prisma.TransactionClient, skuId: string, skuCode: string) {
  const price = await tx.masterDataRecord.findFirst({
    where: {
      type: "PRICE",
      isActive: true,
      OR: [{ parentId: skuId }, { code: `PRICE-${skuCode.replace(/^LPG-/, "")}` }]
    },
    orderBy: { updatedAt: "desc" }
  });
  return price?.amount ?? new Prisma.Decimal(0);
}
