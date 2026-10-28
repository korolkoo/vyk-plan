"use server";

import { db } from "@/lib/db";
import {
  bankAccounts,
  cardInvoices,
  creditCards,
  goals,
  goalContributions,
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

export interface DashboardAvailability {
  totalBalanceCents: number;
  goalsReserveCents: number;
  weddingReserveCents: number;
  openInvoicesCents: number;
  pendingExpensesCents: number;
  availableFreeCents: number;
  freePercentage: number;
  goalsPercentage: number;
  weddingPercentage: number;
  obligationsPercentage: number;
  cardsInvoicesList: {
    id: string;
    name: string;
    color: string;
    openInvoiceCents: number;
  }[];
  goalsList: {
    id: string;
    name: string;
    icon: string;
    color: string;
    currentCents: number;
  }[];
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
  availability: DashboardAvailability;
  wedding: {
    weddingDate: string | null;
    daysRemaining: number;
    reserveCents: number;
    committedCents: number;
    progressPercentage: number;
  };
  cards: DashboardCardSummary[];
  accounts: { id: string; name: string; color: string }[];
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
  let totalOpenInvoicesCents = 0;

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

      totalOpenInvoicesCents += openInvoiceCents;

      cardSummaries.push({
        id: card.id,
        name: card.name,
        color: card.color,
        dueDay: card.dueDay,
        openInvoiceCents,
      });
    }
  }

  // 4. Metas Pessoais & Gastos Futuros Reservados
  const userGoals = await db
    .select({
      id: goals.id,
      name: goals.name,
      icon: goals.icon,
      color: goals.color,
    })
    .from(goals)
    .where(eq(goals.userId, user.id));

  let goalsReserveCents = 0;
  const goalsList: {
    id: string;
    name: string;
    icon: string;
    color: string;
    currentCents: number;
  }[] = [];

  if (userGoals.length > 0) {
    const goalIds = userGoals.map((g) => g.id);
    const contribs = await db
      .select({
        goalId: goalContributions.goalId,
        amountCents: goalContributions.amountCents,
      })
      .from(goalContributions)
      .where(inArray(goalContributions.goalId, goalIds));

    for (const g of userGoals) {
      const currentCents = contribs
        .filter((c) => c.goalId === g.id)
        .reduce((sum, c) => sum + c.amountCents, 0);

      goalsReserveCents += currentCents;

      if (currentCents > 0) {
        goalsList.push({
          id: g.id,
          name: g.name,
          icon: g.icon,
          color: g.color,
          currentCents,
        });
      }
    }
  }

  // 5. Casamento Compartilhado (Cofrinho)

  const [wedding] = await db
    .select()
    .from(weddingSettings)
    .where(eq(weddingSettings.id, "wedding_global"))
    .limit(1);

  const fundEntries = await db.select().from(weddingFundEntries);
  const weddingReserveCents = fundEntries.reduce((sum, e) => sum + e.amountCents, 0);

  const items = await db.select().from(weddingItems);
  const totalCommittedCents = items.reduce((sum, i) => sum + i.totalCents, 0);

  const daysRemaining = wedding?.weddingDate
    ? getDaysRemaining(wedding.weddingDate)
    : 0;

  const progressPercentage =
    totalCommittedCents > 0
      ? Math.min(100, Math.round((weddingReserveCents / totalCommittedCents) * 100))
      : 0;

  // 6. Cálculo da Disponibilidade Real (Saldo Realmente Livre)
  // Saldo Total - Metas/Gastos Programados - Casamento - Faturas Abertas - Contas Pendentes do Mês
  const reservedObligationsCents = totalOpenInvoicesCents + expensePendingCents;
  const availableFreeCents = Math.max(
    0,
    totalBalanceCents - goalsReserveCents - weddingReserveCents - reservedObligationsCents
  );

  const totalBase = Math.max(1, totalBalanceCents);
  const freePercentage = Math.min(100, Math.round((availableFreeCents / totalBase) * 100));
  const goalsPercentage = Math.round((goalsReserveCents / totalBase) * 100);
  const weddingPercentage = Math.round((weddingReserveCents / totalBase) * 100);
  const obligationsPercentage = Math.round((reservedObligationsCents / totalBase) * 100);

  // 7. Últimas 5 Transações
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
    availability: {
      totalBalanceCents,
      goalsReserveCents,
      weddingReserveCents,
      openInvoicesCents: totalOpenInvoicesCents,
      pendingExpensesCents: expensePendingCents,
      availableFreeCents,
      freePercentage,
      goalsPercentage,
      weddingPercentage,
      obligationsPercentage,
      cardsInvoicesList: cardSummaries.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        openInvoiceCents: c.openInvoiceCents,
      })),
      goalsList,
    },

    wedding: {
      weddingDate: wedding?.weddingDate || null,
      daysRemaining,
      reserveCents: weddingReserveCents,
      committedCents: totalCommittedCents,
      progressPercentage,
    },
    cards: cardSummaries,
    accounts: userAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
    })),
    recentTransactions,
  };
}
