"use server";

import { db } from "@/lib/db";
import {
  bankAccounts,
  cardInvoices,
  creditCards,
  transactions,
  weddingFundEntries,
  weddingItems,
  weddingSettings,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, desc, eq, inArray, like } from "drizzle-orm";
import { calculateInvoiceDates } from "@/utils/invoices";
import { getDaysRemaining } from "@/utils/format";
import type { Transaction, TransactionType } from "@/types/types";

export interface DashboardCardSummary {
  id: string;
  name: string;
  color: string;
  dueDay: number;
  openInvoiceCents: number;
}

export interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  currentMonth: string; // YYYY-MM
  monthLabel: string;
  metrics: {
    totalBalanceCents: number;
    activeAccountsCount: number;
    incomePaidCents: number;
    expensePaidCents: number;
    expensePendingCents: number;
    monthBalanceCents: number;
  };
  wedding: {
    weddingDate: string | null;
    daysRemaining: number;
    reserveCents: number;
    committedCents: number;
    progressPercentage: number;
  };
  cards: DashboardCardSummary[];
  recentTransactions: Transaction[];
}

/**
 * Agrega todos os dados da tela inicial do usuário logado em uma única query consolidada.
 */
export async function getDashboardDataAction(): Promise<DashboardData> {
  const user = await requireUser();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonth = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;
  const today = now.toISOString().split("T")[0];

  const monthName = now.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // 1. Contas Bancárias e Saldo Real
  const userAccounts = await db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.userId, user.id), eq(bankAccounts.archived, false)));

  const allPaidTransactions = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.status, "paid")));

  let totalBalanceCents = 0;
  for (const acc of userAccounts) {
    let balance = acc.initialBalanceCents;
    for (const tx of allPaidTransactions) {
      if (tx.bankAccountId === acc.id) {
        if (tx.type === "income") balance += tx.amountCents;
        else if (tx.type === "expense") balance -= tx.amountCents;
        else if (tx.type === "transfer") balance -= tx.amountCents;
      }
      if (tx.type === "transfer" && tx.transferToAccountId === acc.id) {
        balance += tx.amountCents;
      }
    }
    totalBalanceCents += balance;
  }

  // 2. Transações do Mês Corrente
  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        like(transactions.date, `${currentMonth}%`)
      )
    );

  let incomePaidCents = 0;
  let expensePaidCents = 0;
  let expensePendingCents = 0;

  for (const tx of monthTransactions) {
    if (tx.type === "income" && tx.status === "paid") {
      incomePaidCents += tx.amountCents;
    } else if (tx.type === "expense" && tx.status === "paid") {
      expensePaidCents += tx.amountCents;
    } else if (tx.type === "expense" && tx.status === "pending") {
      expensePendingCents += tx.amountCents;
    }
  }

  const monthBalanceCents = incomePaidCents - expensePaidCents;

  // 3. Cartões de Crédito e Faturas Abertas
  const userCards = await db
    .select()
    .from(creditCards)
    .where(eq(creditCards.userId, user.id));

  const cardSummaries: DashboardCardSummary[] = [];

  if (userCards.length > 0) {
    const cardIds = userCards.map((c) => c.id);

    const invoices = await db
      .select()
      .from(cardInvoices)
      .where(inArray(cardInvoices.creditCardId, cardIds));

    const cardTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          inArray(transactions.creditCardId, cardIds)
        )
      );

    for (const card of userCards) {
      const cardInvs = invoices.filter((i) => i.creditCardId === card.id);
      let openInv = cardInvs.find((i) => i.status === "open");

      let openInvoiceCents = 0;
      if (openInv) {
        openInvoiceCents = cardTxs
          .filter((t) => t.invoiceId === openInv?.id)
          .reduce((sum, t) => sum + t.amountCents, 0);
      }

      cardSummaries.push({
        id: card.id,
        name: card.name,
        color: card.color,
        dueDay: card.dueDay,
        openInvoiceCents,
      });
    }
  }

  // 4. Últimas 5 Transações
  const recentRaw = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, user.id))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(5);

  const recentTransactions: Transaction[] = recentRaw.map((t) => ({
    id: t.id,
    userId: t.userId,
    type: t.type as TransactionType,
    amountCents: t.amountCents,
    description: t.description,
    date: t.date,
    status: t.status as "pending" | "paid",
    isForecast: t.isForecast,
    categoryId: t.categoryId,
    bankAccountId: t.bankAccountId,
    creditCardId: t.creditCardId,
    invoiceId: t.invoiceId,
    transferToAccountId: t.transferToAccountId,
    installmentGroupId: t.installmentGroupId,
    installmentNumber: t.installmentNumber,
    installmentTotal: t.installmentTotal,
    recurrenceId: t.recurrenceId,
    source: (t.source as "manual" | "auto") || "manual",
    notes: t.notes,
  }));

  // 5. Casamento Compartilhado
  const [wedding] = await db
    .select()
    .from(weddingSettings)
    .where(eq(weddingSettings.id, "wedding_global"))
    .limit(1);

  const fundEntries = await db.select().from(weddingFundEntries);
  const totalReserveCents = fundEntries.reduce((sum, e) => sum + e.amountCents, 0);

  const items = await db.select().from(weddingItems);
  const totalCommittedCents = items.reduce((sum, i) => sum + i.totalCents, 0);

  const daysRemaining = wedding?.weddingDate
    ? getDaysRemaining(wedding.weddingDate)
    : 0;

  const progressPercentage =
    totalCommittedCents > 0
      ? Math.min(100, Math.round((totalReserveCents / totalCommittedCents) * 100))
      : 0;

  return {
    user: {
      id: user.id,
      name: user.name || "Usuário",
      email: user.email,
    },
    currentMonth,
    monthLabel,
    metrics: {
      totalBalanceCents,
      activeAccountsCount: userAccounts.length,
      incomePaidCents,
      expensePaidCents,
      expensePendingCents,
      monthBalanceCents,
    },
    wedding: {
      weddingDate: wedding?.weddingDate || null,
      daysRemaining,
      reserveCents: totalReserveCents,
      committedCents: totalCommittedCents,
      progressPercentage,
    },
    cards: cardSummaries,
    recentTransactions,
  };
}
