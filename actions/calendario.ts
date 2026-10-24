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
        status: "paid",
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
