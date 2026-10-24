"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { cardInvoices, creditCards, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, desc, eq } from "drizzle-orm";
import { calculateInvoiceDates } from "@/utils/invoices";
import type { CardInvoiceWithTotal, InvoiceStatus, Transaction } from "@/types/types";

/**
 * Busca todas as faturas de um cartão de crédito específico,
 * ordenadas da mais recente para a mais antiga, com seus totais calculados.
 */
export async function getCardInvoicesAction(
  cardId: string
): Promise<CardInvoiceWithTotal[]> {
  const user = await requireUser();

  // 1. Valida se o cartão pertence ao usuário
  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, user.id)))
    .limit(1);

  if (!card) {
    throw new Error("Cartão não encontrado.");
  }

  // 2. Busca as faturas do cartão
  const invoices = await db
    .select()
    .from(cardInvoices)
    .where(eq(cardInvoices.creditCardId, cardId))
    .orderBy(desc(cardInvoices.referenceMonth));

  // 3. Busca todas as transações associadas a este cartão
  const cardTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.creditCardId, cardId)
      )
    );

  // 4. Calcula total de cada fatura
  return invoices.map((inv) => {
    const invPurchases = cardTransactions.filter((t) => t.invoiceId === inv.id);
    const totalCents = invPurchases.reduce((sum, t) => sum + t.amountCents, 0);

    return {
      id: inv.id,
      creditCardId: inv.creditCardId,
      referenceMonth: inv.referenceMonth,
      closingDate: inv.closingDate,
      dueDate: inv.dueDate,
      status: inv.status as InvoiceStatus,
      totalCents,
    };
  });
}

/**
 * Busca os detalhes de uma fatura e a lista de compras/lançamentos associados a ela.
 */
export async function getInvoiceDetailsAction(invoiceId: string) {
  const user = await requireUser();

  const [invoice] = await db
    .select()
    .from(cardInvoices)
    .where(eq(cardInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Fatura não encontrada.");
  }

  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, invoice.creditCardId), eq(creditCards.userId, user.id)))
    .limit(1);

  if (!card) {
    throw new Error("Cartão não encontrado.");
  }

  // Busca compras vinculadas a esta fatura
  const purchases = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.invoiceId, invoiceId)
      )
    )
    .orderBy(desc(transactions.date));

  const totalCents = purchases.reduce((sum, t) => sum + t.amountCents, 0);

  return {
    invoice: {
      ...invoice,
      status: invoice.status as InvoiceStatus,
      totalCents,
    },
    card,
    purchases: purchases as unknown as Transaction[],
  };
}

/**
 * Registra uma compra parcelada em N vezes no cartão de crédito, distribuindo
 * automaticamente cada parcela na fatura do mês correspondente (com criação automática
 * de faturas futuras se ainda não existirem).
 */
export async function createInstallmentPurchaseAction(data: {
  creditCardId: string;
  description: string;
  totalAmountCents: number;
  installmentsCount: number;
  purchaseDate: string; // YYYY-MM-DD
  categoryId?: string | null;
  notes?: string | null;
}) {
  const user = await requireUser();

  if (!data.description || !data.description.trim()) {
    throw new Error("A descrição da compra é obrigatória.");
  }

  if (!data.totalAmountCents || data.totalAmountCents <= 0) {
    throw new Error("O valor da compra deve ser maior que zero.");
  }

  const count = Math.max(1, Math.min(48, Math.round(data.installmentsCount || 1)));

  // 1. Busca o cartão
  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, data.creditCardId), eq(creditCards.userId, user.id)))
    .limit(1);

  if (!card) {
    throw new Error("Cartão não encontrado.");
  }

  const installmentGroupId = "ig_" + Math.random().toString(36).substring(2, 10);

  // Divisão dos centavos entre as parcelas
  const baseInstallmentCents = Math.floor(data.totalAmountCents / count);
  const remainderCents = data.totalAmountCents - baseInstallmentCents * count;

  // 2. Itera para criar cada parcela e vincular à sua fatura
  for (let i = 1; i <= count; i++) {
    const monthOffset = i - 1;
    const dates = calculateInvoiceDates(
      data.purchaseDate,
      card.closingDay,
      card.dueDay,
      monthOffset
    );

    // Verifica se já existe fatura para esse mês de referência
    const [existingInvoice] = await db
      .select()
      .from(cardInvoices)
      .where(
        and(
          eq(cardInvoices.creditCardId, card.id),
          eq(cardInvoices.referenceMonth, dates.referenceMonth)
        )
      )
      .limit(1);

    let targetInvoiceId = existingInvoice?.id;

    if (!targetInvoiceId) {
      targetInvoiceId = "inv_" + Math.random().toString(36).substring(2, 10);
      await db.insert(cardInvoices).values({
        id: targetInvoiceId,
        creditCardId: card.id,
        referenceMonth: dates.referenceMonth,
        closingDate: dates.closingDate,
        dueDate: dates.dueDate,
        status: "open",
      });
    }

    // A primeira parcela absorve os centavos restantes da dízima
    const amountCents = i === 1 ? baseInstallmentCents + remainderCents : baseInstallmentCents;

    const txId = "tx_parc_" + Math.random().toString(36).substring(2, 10);
    const itemDescription =
      count > 1
        ? `${data.description.trim()} (${i}/${count})`
        : data.description.trim();

    await db.insert(transactions).values({
      id: txId,
      userId: user.id,
      type: "expense",
      amountCents,
      description: itemDescription,
      date: i === 1 ? data.purchaseDate : dates.closingDate,
      status: "paid", // Compra já efetuada no cartão
      isForecast: false,
      categoryId: data.categoryId || null,
      creditCardId: card.id,
      invoiceId: targetInvoiceId,
      installmentGroupId,
      installmentNumber: count > 1 ? i : null,
      installmentTotal: count > 1 ? count : null,
      source: "manual",
      notes: data.notes?.trim() || null,
    });
  }

  revalidatePath("/cartoes");
  revalidatePath("/financas");
  revalidatePath("/");

  return { success: true, installmentGroupId };
}

/**
 * Quita uma fatura de cartão de crédito:
 * - Altera o status da fatura para 'paid'.
 * - Cria um lançamento de débito na conta bancária informada (ou na conta vinculada ao cartão).
 */
export async function payInvoiceAction(
  invoiceId: string,
  paymentAccountId: string
) {
  const user = await requireUser();

  const [invoice] = await db
    .select()
    .from(cardInvoices)
    .where(eq(cardInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Fatura não encontrada.");
  }

  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, invoice.creditCardId), eq(creditCards.userId, user.id)))
    .limit(1);

  if (!card) {
    throw new Error("Cartão não encontrado.");
  }

  // 1. Calcula o total da fatura
  const purchases = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.invoiceId, invoiceId)
      )
    );

  const totalCents = purchases.reduce((sum, t) => sum + t.amountCents, 0);

  if (totalCents <= 0) {
    throw new Error("Não é possível pagar uma fatura zerada.");
  }

  // 2. Marca a fatura como paga
  await db
    .update(cardInvoices)
    .set({ status: "paid" })
    .where(eq(cardInvoices.id, invoiceId));

  // 3. Cria a transação de débito na conta bancária
  const today = new Date().toISOString().split("T")[0];
  const txId = "tx_pay_" + Math.random().toString(36).substring(2, 10);

  await db.insert(transactions).values({
    id: txId,
    userId: user.id,
    type: "expense",
    amountCents: totalCents,
    description: `Pagamento Fatura ${card.name} (${invoice.referenceMonth})`,
    date: today,
    status: "paid",
    isForecast: false,
    bankAccountId: paymentAccountId,
    source: "manual",
  });

  revalidatePath("/cartoes");
  revalidatePath("/contas");
  revalidatePath("/financas");
  revalidatePath("/");

  return { success: true };
}
