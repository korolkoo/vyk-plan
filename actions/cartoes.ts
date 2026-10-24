"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { cardInvoices, creditCards, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, desc, eq, inArray } from "drizzle-orm";
import { calculateInvoiceDates } from "@/utils/invoices";
import type { CreditCardWithDetails, CardInvoiceWithTotal, InvoiceStatus } from "@/types/types";

/**
 * Busca todos os cartões de crédito do usuário logado, com a fatura aberta atual,
 * total comprometido e limite disponível calculados em tempo real.
 */
export async function getCreditCardsAction(): Promise<CreditCardWithDetails[]> {
  const user = await requireUser();

  // 1. Busca os cartões do usuário
  const cards = await db
    .select()
    .from(creditCards)
    .where(eq(creditCards.userId, user.id))
    .orderBy(desc(creditCards.createdAt));

  if (cards.length === 0) {
    return [];
  }

  const cardIds = cards.map((c) => c.id);

  // 2. Busca todas as faturas desses cartões
  const allInvoices = await db
    .select()
    .from(cardInvoices)
    .where(inArray(cardInvoices.creditCardId, cardIds));

  // 3. Busca todas as transações vinculadas a esses cartões
  const allTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        inArray(transactions.creditCardId, cardIds)
      )
    );

  const today = new Date().toISOString().split("T")[0];

  // 4. Monta o retorno com cálculos para cada cartão
  const results: CreditCardWithDetails[] = [];

  for (const card of cards) {
    const cardInvList = allInvoices.filter((i) => i.creditCardId === card.id);

    // Identifica fatura aberta ou cria se não existir
    let openInvoice = cardInvList.find((i) => i.status === "open");

    if (!openInvoice) {
      // Garante uma fatura aberta para o mês de referência atual
      const dates = calculateInvoiceDates(today, card.closingDay, card.dueDay);
      const newInvId = "inv_" + Math.random().toString(36).substring(2, 10);

      await db.insert(cardInvoices).values({
        id: newInvId,
        creditCardId: card.id,
        referenceMonth: dates.referenceMonth,
        closingDate: dates.closingDate,
        dueDate: dates.dueDate,
        status: "open",
      });

      openInvoice = {
        id: newInvId,
        creditCardId: card.id,
        referenceMonth: dates.referenceMonth,
        closingDate: dates.closingDate,
        dueDate: dates.dueDate,
        status: "open",
      };
      cardInvList.push(openInvoice);
    }

    // Calcula total de compras da fatura aberta
    const openInvoicePurchases = allTransactions.filter(
      (t) => t.invoiceId === openInvoice?.id
    );
    const currentInvoiceCents = openInvoicePurchases.reduce(
      (sum, t) => sum + t.amountCents,
      0
    );

    // Calcula limite comprometido total (todas as faturas não pagas do cartão)
    const unpaidInvoiceIds = new Set(
      cardInvList.filter((i) => i.status !== "paid").map((i) => i.id)
    );

    const usedLimitCents = allTransactions
      .filter((t) => t.creditCardId === card.id && t.invoiceId && unpaidInvoiceIds.has(t.invoiceId))
      .reduce((sum, t) => sum + t.amountCents, 0);

    const availableLimitCents = Math.max(0, card.limitCents - usedLimitCents);

    const currentInvoiceWithTotal: CardInvoiceWithTotal = {
      id: openInvoice.id,
      creditCardId: openInvoice.creditCardId,
      referenceMonth: openInvoice.referenceMonth,
      closingDate: openInvoice.closingDate,
      dueDate: openInvoice.dueDate,
      status: openInvoice.status as InvoiceStatus,
      totalCents: currentInvoiceCents,
    };

    results.push({
      id: card.id,
      userId: card.userId,
      name: card.name,
      limitCents: card.limitCents,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      color: card.color,
      paymentAccountId: card.paymentAccountId,
      currentInvoice: currentInvoiceWithTotal,
      usedLimitCents,
      availableLimitCents,
    });
  }

  return results;
}

/**
 * Cadastra um novo cartão de crédito para o usuário logado e gera sua primeira fatura aberta.
 */
export async function createCreditCardAction(data: {
  name: string;
  limitCents: number;
  closingDay: number;
  dueDay: number;
  color?: string;
  paymentAccountId?: string | null;
}) {
  const user = await requireUser();

  if (!data.name || !data.name.trim()) {
    throw new Error("O nome do cartão é obrigatório.");
  }

  if (data.limitCents === undefined || data.limitCents < 0) {
    throw new Error("O limite do cartão não pode ser negativo.");
  }

  if (data.closingDay < 1 || data.closingDay > 31) {
    throw new Error("O dia de fechamento deve estar entre 1 e 31.");
  }

  if (data.dueDay < 1 || data.dueDay > 31) {
    throw new Error("O dia de vencimento deve estar entre 1 e 31.");
  }

  const cardId = "card_" + Math.random().toString(36).substring(2, 10);
  const color = data.color || "#173B64"; // Navy default

  // 1. Insere o cartão
  await db.insert(creditCards).values({
    id: cardId,
    userId: user.id,
    name: data.name.trim(),
    limitCents: Math.round(data.limitCents),
    closingDay: data.closingDay,
    dueDay: data.dueDay,
    color,
    paymentAccountId: data.paymentAccountId || null,
  });

  // 2. Cria a primeira fatura aberta inicial para o mês corrente
  const today = new Date().toISOString().split("T")[0];
  const dates = calculateInvoiceDates(today, data.closingDay, data.dueDay);
  const invoiceId = "inv_" + Math.random().toString(36).substring(2, 10);

  await db.insert(cardInvoices).values({
    id: invoiceId,
    creditCardId: cardId,
    referenceMonth: dates.referenceMonth,
    closingDate: dates.closingDate,
    dueDate: dates.dueDate,
    status: "open",
  });

  revalidatePath("/cartoes");
  revalidatePath("/");
  revalidatePath("/financas");

  return { success: true, id: cardId };
}

/**
 * Atualiza os dados de um cartão de crédito existente.
 */
export async function updateCreditCardAction(
  id: string,
  data: {
    name?: string;
    limitCents?: number;
    closingDay?: number;
    dueDay?: number;
    color?: string;
    paymentAccountId?: string | null;
  }
) {
  const user = await requireUser();

  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, user.id)))
    .limit(1);

  if (!card) {
    throw new Error("Cartão de crédito não encontrado.");
  }

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.limitCents !== undefined) updates.limitCents = Math.round(data.limitCents);
  if (data.closingDay !== undefined) updates.closingDay = data.closingDay;
  if (data.dueDay !== undefined) updates.dueDay = data.dueDay;
  if (data.color !== undefined) updates.color = data.color;
  if (data.paymentAccountId !== undefined) updates.paymentAccountId = data.paymentAccountId;

  await db
    .update(creditCards)
    .set(updates)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, user.id)));

  revalidatePath("/cartoes");
  revalidatePath("/");
  return { success: true };
}

/**
 * Exclui um cartão de crédito e remove as faturas e vínculos associados.
 */
export async function deleteCreditCardAction(id: string) {
  const user = await requireUser();

  const [card] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, user.id)))
    .limit(1);

  if (!card) {
    throw new Error("Cartão de crédito não encontrado.");
  }

  // Remove o cartão (faturas são removidas via cascade na base Neon)
  await db
    .delete(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.userId, user.id)));

  revalidatePath("/cartoes");
  revalidatePath("/");
  revalidatePath("/financas");

  return { success: true };
}
