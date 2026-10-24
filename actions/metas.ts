"use server";

import { db } from "@/lib/db";
import { goals, goalContributions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { eq, and, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface GoalWithDetails {
  id: string;
  userId: string;
  name: string;
  targetCents: number;
  targetDate: string | null;
  icon: string;
  color: string;
  savedCents: number;
  contributionsCount: number;
  createdAt: Date;
}

export interface GoalContributionItem {
  id: string;
  goalId: string;
  amountCents: number;
  date: string;
  note: string | null;
}

/**
 * Busca todas as metas do usuário com soma dos aportes realizados
 */
export async function getGoalsAction(): Promise<{
  success: boolean;
  goals?: GoalWithDetails[];
  totalSavedCents?: number;
  totalTargetCents?: number;
  error?: string;
}> {
  try {
    const user = await requireUser();

    // Buscar metas do usuário
    const userGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, user.id))
      .orderBy(desc(goals.createdAt));

    // Buscar soma e contagem de contribuições por meta
    const goalIds = userGoals.map((g) => g.id);

    let contributionsSummary: Record<string, { savedCents: number; count: number }> = {};

    if (goalIds.length > 0) {
      const summaryRows = await db
        .select({
          goalId: goalContributions.goalId,
          totalSaved: sql<number>`COALESCE(SUM(${goalContributions.amountCents}), 0)`,
          count: sql<number>`COUNT(${goalContributions.id})`,
        })
        .from(goalContributions)
        .groupBy(goalContributions.goalId);

      for (const row of summaryRows) {
        contributionsSummary[row.goalId] = {
          savedCents: Number(row.totalSaved) || 0,
          count: Number(row.count) || 0,
        };
      }
    }

    let totalSavedCents = 0;
    let totalTargetCents = 0;

    const formattedGoals: GoalWithDetails[] = userGoals.map((g) => {
      const summary = contributionsSummary[g.id] || { savedCents: 0, count: 0 };
      totalSavedCents += summary.savedCents;
      totalTargetCents += g.targetCents;

      return {
        id: g.id,
        userId: g.userId,
        name: g.name,
        targetCents: g.targetCents,
        targetDate: g.targetDate,
        icon: g.icon,
        color: g.color,
        savedCents: summary.savedCents,
        contributionsCount: summary.count,
        createdAt: g.createdAt,
      };
    });

    return {
      success: true,
      goals: formattedGoals,
      totalSavedCents,
      totalTargetCents,
    };
  } catch (error: any) {
    console.error("Erro em getGoalsAction:", error);
    return { success: false, error: error.message || "Falha ao carregar metas" };
  }
}

/**
 * Cria uma nova meta
 */
export async function createGoalAction(data: {
  name: string;
  targetCents: number;
  targetDate?: string | null;
  icon?: string;
  color?: string;
  initialDepositCents?: number;
}) {
  try {
    const user = await requireUser();

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Nome da meta é obrigatório" };
    }
    if (!data.targetCents || data.targetCents <= 0) {
      return { success: false, error: "Valor alvo deve ser maior que zero" };
    }

    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(goals).values({
      id: goalId,
      userId: user.id,
      name: data.name.trim(),
      targetCents: data.targetCents,
      targetDate: data.targetDate || null,
      icon: data.icon || "Target",
      color: data.color || "#173B64",
    });

    // Se houver depósito inicial
    if (data.initialDepositCents && data.initialDepositCents > 0) {
      const today = new Date().toISOString().split("T")[0];
      await db.insert(goalContributions).values({
        id: `gcontrib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        goalId: goalId,
        amountCents: data.initialDepositCents,
        date: today,
        note: "Aporte inicial",
      });
    }

    revalidatePath("/metas");
    revalidatePath("/");
    return { success: true, goalId };
  } catch (error: any) {
    console.error("Erro em createGoalAction:", error);
    return { success: false, error: error.message || "Falha ao criar meta" };
  }
}

/**
 * Atualiza uma meta existente
 */
export async function updateGoalAction(
  goalId: string,
  data: {
    name?: string;
    targetCents?: number;
    targetDate?: string | null;
    icon?: string;
    color?: string;
  }
) {
  try {
    const user = await requireUser();

    const [existing] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, user.id)));

    if (!existing) {
      return { success: false, error: "Meta não encontrada ou sem permissão" };
    }

    await db
      .update(goals)
      .set({
        name: data.name?.trim() ?? existing.name,
        targetCents: data.targetCents ?? existing.targetCents,
        targetDate: data.targetDate !== undefined ? data.targetDate : existing.targetDate,
        icon: data.icon ?? existing.icon,
        color: data.color ?? existing.color,
      })
      .where(eq(goals.id, goalId));

    revalidatePath("/metas");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Erro em updateGoalAction:", error);
    return { success: false, error: error.message || "Falha ao atualizar meta" };
  }
}

/**
 * Exclui uma meta e seus aportes (cascade)
 */
export async function deleteGoalAction(goalId: string) {
  try {
    const user = await requireUser();

    const [existing] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, user.id)));

    if (!existing) {
      return { success: false, error: "Meta não encontrada ou sem permissão" };
    }

    await db.delete(goals).where(eq(goals.id, goalId));

    revalidatePath("/metas");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Erro em deleteGoalAction:", error);
    return { success: false, error: error.message || "Falha ao excluir meta" };
  }
}

/**
 * Registra um novo aporte na meta
 */
export async function contributeGoalAction(data: {
  goalId: string;
  amountCents: number;
  date: string;
  note?: string | null;
}) {
  try {
    const user = await requireUser();

    if (!data.amountCents || data.amountCents <= 0) {
      return { success: false, error: "Valor do aporte deve ser maior que zero" };
    }

    // Verificar se a meta pertence ao usuário
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, data.goalId), eq(goals.userId, user.id)));

    if (!goal) {
      return { success: false, error: "Meta não encontrada" };
    }

    const contribId = `gcontrib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(goalContributions).values({
      id: contribId,
      goalId: data.goalId,
      amountCents: data.amountCents,
      date: data.date,
      note: data.note?.trim() || null,
    });

    revalidatePath("/metas");
    revalidatePath("/");
    return { success: true, contributionId: contribId };
  } catch (error: any) {
    console.error("Erro em contributeGoalAction:", error);
    return { success: false, error: error.message || "Falha ao registrar aporte" };
  }
}

/**
 * Busca histórico de contribuições de uma meta
 */
export async function getGoalContributionsAction(goalId: string): Promise<{
  success: boolean;
  contributions?: GoalContributionItem[];
  error?: string;
}> {
  try {
    const user = await requireUser();

    // Validar propriedade da meta
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, user.id)));

    if (!goal) {
      return { success: false, error: "Meta não encontrada" };
    }

    const rows = await db
      .select()
      .from(goalContributions)
      .where(eq(goalContributions.goalId, goalId))
      .orderBy(desc(goalContributions.date));

    return {
      success: true,
      contributions: rows.map((r) => ({
        id: r.id,
        goalId: r.goalId,
        amountCents: r.amountCents,
        date: r.date,
        note: r.note,
      })),
    };
  } catch (error: any) {
    console.error("Erro em getGoalContributionsAction:", error);
    return { success: false, error: error.message || "Falha ao obter histórico" };
  }
}

/**
 * Remove um aporte individual da meta
 */
export async function deleteContributionAction(contributionId: string) {
  try {
    const user = await requireUser();

    // Buscar aporte e verificar meta do usuário
    const [contrib] = await db
      .select({
        id: goalContributions.id,
        goalId: goalContributions.goalId,
        userId: goals.userId,
      })
      .from(goalContributions)
      .innerJoin(goals, eq(goalContributions.goalId, goals.id))
      .where(and(eq(goalContributions.id, contributionId), eq(goals.userId, user.id)));

    if (!contrib) {
      return { success: false, error: "Aporte não encontrado ou sem permissão" };
    }

    await db.delete(goalContributions).where(eq(goalContributions.id, contributionId));

    revalidatePath("/metas");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Erro em deleteContributionAction:", error);
    return { success: false, error: error.message || "Falha ao excluir aporte" };
  }
}
