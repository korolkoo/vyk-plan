"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recurrences, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, asc, eq, like } from "drizzle-orm";
import type { Recurrence, RecurrenceFrequency, TransactionType } from "@/types/types";
import { getNthBusinessDay, countDaysOfWeekInMonth, countAcademicDaysInMonth } from "@/utils/dates";

/**
 * Busca todas as regras de recorrência do usuário logado.
 */
export async function getRecurrencesAction(): Promise<Recurrence[]> {
  const user = await requireUser();

  const results = await db
    .select()
    .from(recurrences)
    .where(eq(recurrences.userId, user.id))
    .orderBy(asc(recurrences.dayOfMonth));

  return results.map((r) => ({
    id: r.id,
    userId: r.userId,
    type: r.type as Exclude<TransactionType, "transfer">,
    description: r.description,
    amountCents: r.amountCents,
    categoryId: r.categoryId,
    bankAccountId: r.bankAccountId,
    creditCardId: r.creditCardId,
    frequency: r.frequency as RecurrenceFrequency,
    dayOfMonth: r.dayOfMonth,
    startDate: r.startDate,
    endDate: r.endDate,
    active: r.active,
    calculationMode: (r.calculationMode as "fixed" | "per_day") || "fixed",
    dailyRateCents: r.dailyRateCents,
    applicableDays: r.applicableDays,
    exemptMonths: r.exemptMonths,
    billingShift: r.billingShift,
  }));
}

/**
 * Cria uma nova regra de recorrência financeira.
 */
export async function createRecurrenceAction(data: {
  type: Exclude<TransactionType, "transfer">;
  description: string;
  amountCents: number;
  categoryId?: string | null;
  bankAccountId?: string | null;
  frequency: RecurrenceFrequency;
  dayOfMonth: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
  calculationMode?: "fixed" | "per_day";
  dailyRateCents?: number | null;
  applicableDays?: string | null;
  exemptMonths?: string | null;
  billingShift?: number;
}) {
  const user = await requireUser();

  if (!data.description || !data.description.trim()) {
    throw new Error("A descrição da recorrência é obrigatória.");
  }

  const calculationMode = data.calculationMode || "fixed";
  const dailyRateCents = data.dailyRateCents ?? null;
  const amountCents =
    calculationMode === "per_day" && dailyRateCents
      ? dailyRateCents
      : Math.round(data.amountCents);

  if (amountCents <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }

  const id = "rec_" + Math.random().toString(36).substring(2, 10);

  await db.insert(recurrences).values({
    id,
    userId: user.id,
    type: data.type,
    description: data.description.trim(),
    amountCents,
    categoryId: data.categoryId || null,
    bankAccountId: data.bankAccountId || null,
    frequency: data.frequency,
    dayOfMonth: data.dayOfMonth,
    startDate: data.startDate,
    endDate: data.endDate || null,
    active: true,
    calculationMode,
    dailyRateCents,
    applicableDays: data.applicableDays || null,
    exemptMonths: data.exemptMonths || null,
    billingShift: data.billingShift ?? 0,
  });

  revalidatePath("/financas/recorrencias");
  revalidatePath("/financas");
  revalidatePath("/calendario");
  revalidatePath("/");

  return { success: true, id };
}

/**
 * Atualiza os dados de uma regra de recorrência existente.
 */
export async function updateRecurrenceAction(
  id: string,
  data: {
    description?: string;
    amountCents?: number;
    categoryId?: string | null;
    bankAccountId?: string | null;
    frequency?: RecurrenceFrequency;
    dayOfMonth?: number;
    startDate?: string;
    endDate?: string | null;
    active?: boolean;
    calculationMode?: "fixed" | "per_day";
    dailyRateCents?: number | null;
    applicableDays?: string | null;
    exemptMonths?: string | null;
    billingShift?: number;
  }
) {
  const user = await requireUser();

  const updates: Record<string, unknown> = {};
  if (data.description !== undefined) updates.description = data.description.trim();
  if (data.amountCents !== undefined) updates.amountCents = Math.round(data.amountCents);
  if (data.categoryId !== undefined) updates.categoryId = data.categoryId;
  if (data.bankAccountId !== undefined) updates.bankAccountId = data.bankAccountId;
  if (data.frequency !== undefined) updates.frequency = data.frequency;
  if (data.dayOfMonth !== undefined) updates.dayOfMonth = data.dayOfMonth;
  if (data.startDate !== undefined) updates.startDate = data.startDate;
  if (data.endDate !== undefined) updates.endDate = data.endDate;
  if (data.active !== undefined) updates.active = data.active;
  if (data.calculationMode !== undefined) updates.calculationMode = data.calculationMode;
  if (data.dailyRateCents !== undefined) updates.dailyRateCents = data.dailyRateCents;
  if (data.applicableDays !== undefined) updates.applicableDays = data.applicableDays;
  if (data.exemptMonths !== undefined) updates.exemptMonths = data.exemptMonths;
  if (data.billingShift !== undefined) updates.billingShift = data.billingShift;

  await db
    .update(recurrences)
    .set(updates)
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, user.id)));

  revalidatePath("/financas/recorrencias");
  revalidatePath("/financas");
  revalidatePath("/calendario");
  revalidatePath("/");

  return { success: true };
}


/**
 * Ativa ou desativa uma regra de recorrência.
 */
export async function toggleRecurrenceActiveAction(id: string, active: boolean) {
  const user = await requireUser();

  await db
    .update(recurrences)
    .set({ active })
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, user.id)));

  revalidatePath("/financas");
  return { success: true };
}

/**
 * Exclui uma regra de recorrência e remove transações previstas pendentes vinculadas.
 */
export async function deleteRecurrenceAction(id: string) {
  const user = await requireUser();

  // 1. Remove transações previstas geradas por essa recorrência que ainda estejam pendentes
  await db
    .delete(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.recurrenceId, id),
        eq(transactions.isForecast, true),
        eq(transactions.status, "pending")
      )
    );

  // 2. Remove a regra de recorrência
  await db
    .delete(recurrences)
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, user.id)));

  revalidatePath("/financas/recorrencias");
  revalidatePath("/financas");
  revalidatePath("/calendario");
  revalidatePath("/");

  return { success: true };
}


/**
 * Gera transações previstas (isForecast = true, status = 'pending') para o mês
 * especificado (YYYY-MM) com base nas recorrências ativas que ainda não tenham
 * um lançamento gerado naquele mês.
 */
export async function generateForecastsAction(month: string) {
  const user = await requireUser();

  const userRecurrences = await db
    .select()
    .from(recurrences)
    .where(and(eq(recurrences.userId, user.id), eq(recurrences.active, true)));

  let generatedCount = 0;

  for (const rec of userRecurrences) {
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, m, 0).getDate();

    // 2. Verifica se o mês corrente está na lista de isenção (ex.: Janeiro e Fevereiro)
    const exemptList = rec.exemptMonths
      ? rec.exemptMonths.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean)
      : [];

    if (exemptList.includes(m)) {
      continue;
    }

    // 3. Calcula valor e descrição dinâmica se for modo por dia (considerando calendário acadêmico Univates e feriados)
    let finalAmountCents = rec.amountCents;
    let finalDescription = rec.description;

    if (rec.calculationMode === "per_day") {
      const daysOfWeek = rec.applicableDays
        ? rec.applicableDays
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n))
        : [1, 2, 3, 4]; // Padrão: Segunda a Quinta

      const dailyRate = rec.dailyRateCents || rec.amountCents;

      if (rec.billingShift === 1) {
        // Cobrança referente aos dias do mês anterior
        const prevDate = new Date(year, m - 2, 1);
        const refYear = prevDate.getFullYear();
        const refMonth = prevDate.getMonth() + 1;

        const daysCount = countAcademicDaysInMonth(refYear, refMonth, daysOfWeek);
        if (daysCount === 0) {
          continue;
        }

        finalAmountCents = daysCount * dailyRate;
        const monthNamesShort = [
          "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
          "Jul", "Ago", "Set", "Out", "Nov", "Dez"
        ];
        const refMonthLabel = monthNamesShort[refMonth - 1];
        finalDescription = `${rec.description} (Ref. ${refMonthLabel} - ${daysCount} dias)`;
      } else {
        // Cobrança referente aos dias do mês corrente
        const daysCount = countAcademicDaysInMonth(year, m, daysOfWeek);
        if (daysCount === 0) {
          continue;
        }
        finalAmountCents = daysCount * dailyRate;
        finalDescription = `${rec.description} (${daysCount} dias)`;
      }
    }

    // 4. Verifica se já existe um lançamento com esta recurrenceId no mês
    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.recurrenceId, rec.id),
          like(transactions.date, `${month}%`)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Se for uma previsão ainda pendente e os dados divergirem do cálculo acadêmico, sincroniza
      const tx = existing[0];
      if (
        tx.isForecast &&
        tx.status === "pending" &&
        (tx.amountCents !== finalAmountCents || tx.description !== finalDescription)
      ) {
        await db
          .update(transactions)
          .set({
            amountCents: finalAmountCents,
            description: finalDescription,
          })
          .where(eq(transactions.id, tx.id));
        generatedCount++;
      }
      continue;
    }

      // 4. Calcula o dia de vencimento / lançamento
      const safeDay =
        rec.dayOfMonth === 0
          ? getNthBusinessDay(year, m, 5)
          : Math.min(Math.max(1, rec.dayOfMonth), daysInMonth);

      const targetDate = `${month}-${String(safeDay).padStart(2, "0")}`;

      // Verifica validade da data em relação a startDate e endDate
      if (rec.startDate && targetDate < rec.startDate) {
        continue;
      }
      if (rec.endDate && targetDate > rec.endDate) {
        continue;
      }

      const txId = "tx_fc_" + Math.random().toString(36).substring(2, 10);
      await db.insert(transactions).values({
        id: txId,
        userId: user.id,
        type: rec.type,
        amountCents: finalAmountCents,
        description: finalDescription,
        date: targetDate,
        status: "pending",
        isForecast: true,
        categoryId: rec.categoryId,
        bankAccountId: rec.bankAccountId,
        recurrenceId: rec.id,
        source: "manual",
      });

      generatedCount++;
    }

  if (generatedCount > 0) {
    revalidatePath("/financas");
    revalidatePath("/calendario");
    revalidatePath("/");
  }

  return { success: true, count: generatedCount };
}
