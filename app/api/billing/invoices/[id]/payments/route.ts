import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { billingPaymentSchema, generateReceiptNumber, invoiceStatusForAmounts } from "@/lib/billing";
import { requireBillingManageSession } from "@/lib/billing-access";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  const auth = requireBillingManageSession(session);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = billingPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the payment form." }, { status: 400 });
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id: params.id }, include: { customer: true } });
      if (!existing) throw new Error("INVOICE_NOT_FOUND");
      if (existing.status === "PAID") throw new Error("INVOICE_ALREADY_PAID");

      const amount = new Prisma.Decimal(parsed.data.amount);
      if (amount.greaterThan(existing.balanceAmount)) throw new Error("PAYMENT_EXCEEDS_BALANCE");
      const amountPaid = existing.amountPaid.plus(amount).toDecimalPlaces(2);
      const balance = existing.totalAmount.minus(amountPaid).toDecimalPlaces(2);
      const status = invoiceStatusForAmounts(existing.totalAmount, amountPaid);

      await tx.billingPayment.create({
        data: {
          receiptNumber: generateReceiptNumber(),
          invoiceId: existing.id,
          customerId: existing.customerId,
          method: parsed.data.method,
          status: "PAID",
          amount,
          reference: parsed.data.reference?.trim() || null,
          refundPlaceholder: parsed.data.refundPlaceholder?.trim() || "Refund processing is a placeholder in Stage 10.",
          recordedById: session?.user.id
        }
      });

      const updated = await tx.invoice.update({
        where: { id: existing.id },
        data: { amountPaid, balanceAmount: balance, status },
        include: { customer: true, lines: true, payments: { orderBy: { createdAt: "desc" } }, customerOrder: true, refillOrder: true }
      });

      await tx.auditLog.create({
        data: {
          action: "PAYMENT_RECORDED",
          details: `${updated.invoiceNumber} payment recorded; balance ${updated.balanceAmount.toString()}.`,
          userId: session?.user.id
        }
      });

      return updated;
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        INVOICE_NOT_FOUND: "Invoice not found.",
        INVOICE_ALREADY_PAID: "This invoice has already been paid.",
        PAYMENT_EXCEEDS_BALANCE: "Payment amount cannot exceed the invoice balance."
      };
      if (messages[error.message]) return NextResponse.json({ error: messages[error.message] }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A generated receipt number already exists. Please try again." }, { status: 409 });
    }
    throw error;
  }
}
