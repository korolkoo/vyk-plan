"use server";

import { db } from "@/lib/db";
import {
  cardInvoices,
  creditCards,
  transactions,
  weddingInstallments,
  weddingItems,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, eq, inArray, like } from "drizzle-orm";
import { generateForecastsAction, createRecurrenceAction } from "@/actions/recorrencias";
import { revalidatePath } from "next/cache";

export type CalendarEventType =
  | "income"
  | "expense"
  | "card_closing"
  | "card_due"
  | "wedding";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amountCents?: number;
  type: CalendarEventType;
  status: "pending" | "paid";
  color?: string;
  cardName?: string;
  isForecast?: boolean;
}

/**
 * Retorna todos os eventos do calendário para um mês específico:
 * - Transações do usuário (receitas, despesas, transferências)
 * - Dias de fechamento e vencimento de cada cartão de crédito ativo
 * - Parcelas a vencer do Casamento compartilhado
 */
export async function getCalendarEventsAction(
  year: number,
  month: number // 1 a 12
): Promise<CalendarEvent[]> {
  const user = await requireUser();

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Garante que previsões do mês (incluindo salário do 5º dia útil) existam
  try {
    await generateForecastsAction(monthStr);
  } catch (e) {
    console.error("Erro ao gerar previsões no calendário:", e);
  }

  const events: CalendarEvent[] = [];

  // 1. Transações do Mês (receitas e despesas)
  const userTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        like(transactions.date, `${monthStr}%`)
      )
    );

  for (const tx of userTransactions) {
    if (tx.type === "transfer") continue; // Não polui a grade com transferências internas

    events.push({
      id: tx.id,
      title: tx.description,
      date: tx.date,
      amountCents: tx.amountCents,
      type: tx.type === "income" ? "income" : "expense",
      status: tx.status as "pending" | "paid",
      isForecast: tx.isForecast,
    });
  }

  // 2. Cartões de Crédito (Fechamento e Vencimento)
  const userCards = await db
    .select()
    .from(creditCards)
    .where(eq(creditCards.userId, user.id));

  if (userCards.length > 0) {
    const cardIds = userCards.map((c) => c.id);

    // Busca faturas do mês
    const invoices = await db
      .select()
      .from(cardInvoices)
      .where(
        and(
          inArray(cardInvoices.creditCardId, cardIds),
          eq(cardInvoices.referenceMonth, monthStr)
        )
      );

    for (const card of userCards) {
      const inv = invoices.find((i) => i.creditCardId === card.id);

      // Data de Fechamento do Cartão no mês
      const safeClosingDay = Math.min(card.closingDay, daysInMonth);
      const closingDate = `${monthStr}-${String(safeClosingDay).padStart(2, "0")}`;

      events.push({
        id: `card_close_${card.id}_${monthStr}`,
        title: `Fechamento ${card.name}`,
        date: closingDate,
        type: "card_closing",
        status: "paid", // informativo
        color: card.color,
        cardName: card.name,
      });

      // Data de Vencimento da Fatura no mês
      const safeDueDay = Math.min(card.dueDay, daysInMonth);
      const dueDate = `${monthStr}-${String(safeDueDay).padStart(2, "0")}`;

      // Calcula valor total da fatura se houver
      let invoiceTotalCents = 0;
      if (inv) {
        const invTxs = await db
          .select({ amountCents: transactions.amountCents })
          .from(transactions)
          .where(eq(transactions.invoiceId, inv.id));
        invoiceTotalCents = invTxs.reduce((sum, t) => sum + t.amountCents, 0);
      }

      events.push({
        id: `card_due_${card.id}_${monthStr}`,
        title: `Vencimento ${card.name}`,
        date: dueDate,
        amountCents: invoiceTotalCents > 0 ? invoiceTotalCents : undefined,
        type: "card_due",
        status: inv?.status === "paid" ? "paid" : "pending",
        color: card.color,
        cardName: card.name,
      });
    }
  }

  // 3. Parcelas do Casamento Compartilhado
  const installments = await db
    .select({
      id: weddingInstallments.id,
      amountCents: weddingInstallments.amountCents,
      dueDate: weddingInstallments.dueDate,
      paidAt: weddingInstallments.paidAt,
      itemName: weddingItems.name,
    })
    .from(weddingInstallments)
    .innerJoin(weddingItems, eq(weddingInstallments.itemId, weddingItems.id))
    .where(like(weddingInstallments.dueDate, `${monthStr}%`));

  for (const inst of installments) {
    events.push({
      id: inst.id,
      title: `💍 ${inst.itemName}`,
      date: inst.dueDate,
      amountCents: inst.amountCents,
      type: "wedding",
      status: inst.paidAt ? "paid" : "pending",
    });
  }

  // Ordena por data e título
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Cria um lançamento financeiro diretamente a partir de um clique no dia do calendário.
 */
export async function createCalendarTransactionAction(data: {
  date: string;
  type: "income" | "expense";
  description: string;
  amountCents: number;
  categoryId?: string | null;
  bankAccountId?: string | null;
  isRecurring?: boolean;
}) {
  const user = await requireUser();

  if (!data.description || !data.description.trim()) {
    throw new Error("Descrição é obrigatória.");
  }
  if (!data.amountCents || data.amountCents <= 0) {
    throw new Error("Valor deve ser maior que zero.");
  }

  const txId = "tx_cal_" + Math.random().toString(36).substring(2, 10);

  await db.insert(transactions).values({
    id: txId,
    userId: user.id,
    type: data.type,
    amountCents: Math.round(data.amountCents),
    description: data.description.trim(),
    date: data.date,
    status: "pending",
    isForecast: false,
    categoryId: data.categoryId || null,
    bankAccountId: data.bankAccountId || null,
    source: "manual",
  });

  // Se o usuário marcou para repetir todo mês
  if (data.isRecurring) {
    const day = parseInt(data.date.split("-")[2], 10) || 5;
    await createRecurrenceAction({
      type: data.type,
      description: data.description.trim(),
      amountCents: Math.round(data.amountCents),
      frequency: "monthly",
      dayOfMonth: day,
      startDate: data.date,
      categoryId: data.categoryId || null,
      bankAccountId: data.bankAccountId || null,
    });
  }

  revalidatePath("/calendario");
  revalidatePath("/financas");
  revalidatePath("/");
  return { success: true, id: txId };
}

/**
 * Alterna status de um lançamento (Liquidado / Pendente) pelo calendário
 */
export async function toggleTransactionStatusAction(
  transactionId: string,
  newStatus: "pending" | "paid"
) {
  const user = await requireUser();

  await db
    .update(transactions)
    .set({ status: newStatus })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)));

  revalidatePath("/calendario");
  revalidatePath("/financas");
  revalidatePath("/");
  return { success: true };
}

/**
 * Exclui um lançamento financeiro pelo calendário
 */
export async function deleteCalendarTransactionAction(transactionId: string) {
  const user = await requireUser();

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)));

  revalidatePath("/calendario");
  revalidatePath("/financas");
  revalidatePath("/");
  return { success: true };
}
