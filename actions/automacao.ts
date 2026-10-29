"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  categories,
  creditCards,
  transactions,
  weddingFundEntries,
  weddingInstallments,
  weddingItems,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

export interface PendingAutoTransaction {
  id: string;
  type: "income" | "expense" | "transfer";
  amountCents: number;
  description: string;
  date: string;
  establishment?: string;
  channel?: "pix" | "credit_card" | "debit" | "invoice";
  suggestedCategoryId?: string | null;
  suggestedCategoryName?: string | null;
  createdAt: string;
}

export interface DueReminder {
  id: string;
  title: string;
  amountCents?: number;
  dueDate: string;
  isToday: boolean;
  isTomorrow: boolean;
  isWedding: boolean;
}

export interface RemindersSummary {
  reminders: DueReminder[];
  totalTodayCents: number;
  totalTomorrowCents: number;
}

/**
 * Busca todas as movimentações capturadas automaticamente (via notificação/SMS)
 * que ainda estão pendentes de categorização pelo usuário logado.
 */
export async function getPendingAutoTransactionsAction(): Promise<PendingAutoTransaction[]> {
  const user = await requireUser();

  const results = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.source, "auto"),
        isNull(transactions.categoryId)
      )
    )
    .orderBy(desc(transactions.createdAt));

  return results.map((tx) => {
    let establishment: string | undefined;
    let channel: "pix" | "credit_card" | "debit" | "invoice" | undefined;
    let suggestedCategoryId: string | null = null;
    let suggestedCategoryName: string | null = null;

    if (tx.notes) {
      try {
        const parsedNotes = JSON.parse(tx.notes);
        establishment = parsedNotes.establishment;
        channel = parsedNotes.channel;
        suggestedCategoryId = parsedNotes.suggestedCategoryId || null;
        suggestedCategoryName = parsedNotes.suggestedCategoryName || null;
      } catch {
        // Ignora se não for JSON
      }
    }

    return {
      id: tx.id,
      type: tx.type as "income" | "expense" | "transfer",
      amountCents: tx.amountCents,
      description: tx.description,
      date: tx.date,
      establishment,
      channel,
      suggestedCategoryId,
      suggestedCategoryName,
      createdAt: tx.createdAt.toISOString(),
    };
  });
}

/**
 * Confirma a categoria de uma transação automática com 1 toque.
 * Marca o status como 'paid' (já efetuada).
 */
export async function confirmAutoTransactionCategoryAction(
  transactionId: string,
  categoryId: string
) {
  const user = await requireUser();

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)))
    .limit(1);

  if (!tx) {
    throw new Error("Transação não encontrada.");
  }

  // Atualiza com a categoria escolhida e marca como liquidada
  await db
    .update(transactions)
    .set({
      categoryId,
      status: "paid",
    })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)));

  // Se a categoria selecionada for a de Casamento, cria o aporte vinculado no casamento
  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  if (cat?.systemKey === "wedding") {
    const fundEntryId = "wfe_" + Math.random().toString(36).substring(2, 10);
    await db.insert(weddingFundEntries).values({
      id: fundEntryId,
      amountCents: tx.amountCents,
      date: tx.date,
      note: tx.description,
      linkedTransactionId: tx.id,
    });
  }

  revalidatePath("/");
  revalidatePath("/financas");
  revalidatePath("/calendario");

  return { success: true };
}

/**
 * Descarta ou exclui uma movimentação automática não desejada.
 */
export async function dismissAutoTransactionAction(transactionId: string) {
  const user = await requireUser();

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)));

  revalidatePath("/");
  revalidatePath("/financas");
  revalidatePath("/calendario");

  return { success: true };
}

/**
 * Busca lembretes de contas e faturas a vencer HOJE e AMANHÃ:
 * - Contas pendentes do usuário
 * - Faturas de cartão com vencimento hoje ou amanhã
 * - Parcelas do Casamento (alerta compartilhado para Yuri e Vithória)
 */
export async function getDueRemindersAction(): Promise<RemindersSummary> {
  const user = await requireUser();

  const now = new Date();
  const todayIso = now.toISOString().split("T")[0];

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowIso = tomorrowDate.toISOString().split("T")[0];

  const reminders: DueReminder[] = [];
  let totalTodayCents = 0;
  let totalTomorrowCents = 0;

  // 1. Contas pendentes do usuário para hoje e amanhã
  const pendingTxs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.status, "pending"),
        inArray(transactions.date, [todayIso, tomorrowIso])
      )
    );

  for (const tx of pendingTxs) {
    if (tx.type === "expense") {
      const isToday = tx.date === todayIso;
      const isTomorrow = tx.date === tomorrowIso;

      if (isToday) totalTodayCents += tx.amountCents;
      if (isTomorrow) totalTomorrowCents += tx.amountCents;

      reminders.push({
        id: tx.id,
        title: tx.description,
        amountCents: tx.amountCents,
        dueDate: tx.date,
        isToday,
        isTomorrow,
        isWedding: false,
      });
    }
  }

  // 2. Parcelas do Casamento (Compartilhadas para os dois noivos!)
  const weddingInsts = await db
    .select({
      id: weddingInstallments.id,
      amountCents: weddingInstallments.amountCents,
      dueDate: weddingInstallments.dueDate,
      itemName: weddingItems.name,
    })
    .from(weddingInstallments)
    .innerJoin(weddingItems, eq(weddingInstallments.itemId, weddingItems.id))
    .where(
      and(
        isNull(weddingInstallments.paidAt),
        inArray(weddingInstallments.dueDate, [todayIso, tomorrowIso])
      )
    );

  for (const inst of weddingInsts) {
    const isToday = inst.dueDate === todayIso;
    const isTomorrow = inst.dueDate === tomorrowIso;

    if (isToday) totalTodayCents += inst.amountCents;
    if (isTomorrow) totalTomorrowCents += inst.amountCents;

    reminders.push({
      id: inst.id,
      title: `💍 Casamento: ${inst.itemName}`,
      amountCents: inst.amountCents,
      dueDate: inst.dueDate,
      isToday,
      isTomorrow,
      isWedding: true,
    });
  }

  return {
    reminders,
    totalTodayCents,
    totalTomorrowCents,
  };
}

