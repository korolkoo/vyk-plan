"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categories, transactions, weddingFundEntries } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, desc, eq, like, SQL } from "drizzle-orm";
import type {
  Transaction,
  TransactionSource,
  TransactionStatus,
  TransactionType,
} from "@/types/types";

/**
 * Busca todas as transações do usuário logado, com filtros opcionais
 * por mês de competência (YYYY-MM), categoria ou status.
 */
export async function getTransactionsAction(filters?: {
  month?: string; // Formato YYYY-MM
  categoryId?: string;
  status?: TransactionStatus;
}): Promise<Transaction[]> {
  const user = await requireUser();

  const conditions: SQL[] = [eq(transactions.userId, user.id)];

  if (filters?.month) {
    // Filtra pelo prefixo do mês no formato YYYY-MM
    conditions.push(like(transactions.date, `${filters.month}%`));
  }

  if (filters?.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  }

  if (filters?.status) {
    conditions.push(eq(transactions.status, filters.status));
  }

  const results = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  return results.map((t) => ({
    id: t.id,
    userId: t.userId,
    type: t.type as TransactionType,
    amountCents: t.amountCents,
    description: t.description,
    date: t.date,
    status: t.status as TransactionStatus,
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
    source: t.source as TransactionSource,
    notes: t.notes,
  }));
}

/**
 * Cria uma nova transação financeira no banco Neon.
 * Regra do produto: se a categoria tiver a systemKey "wedding",
 * cria automaticamente um aporte correspondente no fundo do Casamento.
 */
export async function createTransactionAction(data: {
  type: TransactionType;
  amountCents: number;
  description: string;
  date: string; // YYYY-MM-DD
  status?: TransactionStatus;
  isForecast?: boolean;
  categoryId?: string | null;
  bankAccountId?: string | null;
  creditCardId?: string | null;
  transferToAccountId?: string | null;
  notes?: string | null;
}) {
  const user = await requireUser();

  if (!data.description || !data.description.trim()) {
    throw new Error("A descrição do lançamento é obrigatória.");
  }

  if (!data.amountCents || data.amountCents <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }

  if (!data.date) {
    throw new Error("A data do lançamento é obrigatória.");
  }

  const id = "tx_" + Math.random().toString(36).substring(2, 10);
  const status: TransactionStatus = data.status || "paid";

  // 1. Insere o lançamento
  await db.insert(transactions).values({
    id,
    userId: user.id,
    type: data.type,
    amountCents: Math.round(data.amountCents),
    description: data.description.trim(),
    date: data.date,
    status,
    isForecast: data.isForecast ?? false,
    categoryId: data.categoryId || null,
    bankAccountId: data.bankAccountId || null,
    creditCardId: data.creditCardId || null,
    transferToAccountId: data.transferToAccountId || null,
    source: "manual",
    notes: data.notes?.trim() || null,
  });

  // 2. Se a categoria for a de Casamento, cria o aporte vinculado no casamento
  if (data.categoryId) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, data.categoryId))
      .limit(1);

    if (cat?.systemKey === "wedding") {
      const fundEntryId = "wfe_" + Math.random().toString(36).substring(2, 10);
      await db.insert(weddingFundEntries).values({
        id: fundEntryId,
        amountCents: Math.round(data.amountCents),
        date: data.date,
        note: data.description.trim(),
        linkedTransactionId: id,
      });
    }
  }

  // 3. Revalida todas as rotas impactadas
  revalidatePath("/financas");
  revalidatePath("/contas");
  revalidatePath("/casamento");
  revalidatePath("/calendario");
  revalidatePath("/");

  return { success: true, id };
}

/**
 * Alterna o status de um lançamento entre 'paid' e 'pending'.
 * Se for uma previsão confirmada, também desativa isForecast.
 */
export async function toggleTransactionStatusAction(id: string) {
  const user = await requireUser();

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);

  if (!tx) {
    throw new Error("Lançamento não encontrado.");
  }

  const newStatus: TransactionStatus = tx.status === "paid" ? "pending" : "paid";
  const newForecast = newStatus === "paid" ? false : tx.isForecast;

  await db
    .update(transactions)
    .set({
      status: newStatus,
      isForecast: newForecast,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/financas");
  revalidatePath("/contas");
  revalidatePath("/calendario");
  revalidatePath("/");

  return { success: true, newStatus };
}

/**
 * Atualiza os dados de um lançamento existente.
 * Se tiver vínculo com o fundo de casamento, reflete os dados também.
 */
export async function updateTransactionAction(
  id: string,
  data: {
    description?: string;
    amountCents?: number;
    date?: string;
    status?: TransactionStatus;
    categoryId?: string | null;
    bankAccountId?: string | null;
    notes?: string | null;
  }
) {
  const user = await requireUser();

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);

  if (!tx) {
    throw new Error("Lançamento não encontrado.");
  }

  const updates: Record<string, unknown> = {};
  if (data.description !== undefined) updates.description = data.description.trim();
  if (data.amountCents !== undefined) updates.amountCents = Math.round(data.amountCents);
  if (data.date !== undefined) updates.date = data.date;
  if (data.status !== undefined) updates.status = data.status;
  if (data.categoryId !== undefined) updates.categoryId = data.categoryId;
  if (data.bankAccountId !== undefined) updates.bankAccountId = data.bankAccountId;
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;

  await db
    .update(transactions)
    .set(updates)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  // Atualiza aporte de casamento se houver
  const linkedUpdates: Record<string, unknown> = {};
  if (data.amountCents !== undefined) linkedUpdates.amountCents = Math.round(data.amountCents);
  if (data.date !== undefined) linkedUpdates.date = data.date;
  if (data.description !== undefined) linkedUpdates.note = data.description.trim();

  if (Object.keys(linkedUpdates).length > 0) {
    await db
      .update(weddingFundEntries)
      .set(linkedUpdates)
      .where(eq(weddingFundEntries.linkedTransactionId, id));
  }

  revalidatePath("/financas");
  revalidatePath("/contas");
  revalidatePath("/casamento");
  revalidatePath("/calendario");
  revalidatePath("/");

  return { success: true };
}

/**
 * Exclui um lançamento financeiro.
 * Se houver aporte no fundo do casamento vinculado a este lançamento, remove-o também.
 */
export async function deleteTransactionAction(id: string) {
  const user = await requireUser();

  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);

  if (!tx) {
    throw new Error("Lançamento não encontrado.");
  }

  // Remove aporte vinculado no casamento se houver
  await db
    .delete(weddingFundEntries)
    .where(eq(weddingFundEntries.linkedTransactionId, id));

  // Remove o lançamento
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/financas");
  revalidatePath("/contas");
  revalidatePath("/casamento");
  revalidatePath("/calendario");
  revalidatePath("/");

  return { success: true };
}
