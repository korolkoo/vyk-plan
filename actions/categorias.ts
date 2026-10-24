"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import type { Category, CategoryKind, CategorySystemKey } from "@/types/types";

/**
 * Busca todas as categorias disponíveis para o usuário:
 * Categorias globais do sistema (userId = null) + categorias personalizadas do usuário logado.
 */
export async function getCategoriesAction(): Promise<Category[]> {
  const user = await requireUser();

  const results = await db
    .select()
    .from(categories)
    .where(
      or(
        isNull(categories.userId),
        eq(categories.userId, user.id)
      )
    )
    .orderBy(asc(categories.name));

  return results.map((c) => ({
    id: c.id,
    userId: c.userId,
    name: c.name,
    kind: c.kind as CategoryKind,
    icon: c.icon,
    color: c.color,
    systemKey: c.systemKey as CategorySystemKey | null,
  }));
}

/**
 * Cria uma nova categoria personalizada para o usuário autenticado.
 */
export async function createCategoryAction(data: {
  name: string;
  kind: CategoryKind;
  icon?: string;
  color?: string;
}) {
  const user = await requireUser();

  if (!data.name || !data.name.trim()) {
    throw new Error("O nome da categoria é obrigatório.");
  }

  const id = "cat_" + Math.random().toString(36).substring(2, 10);

  await db.insert(categories).values({
    id,
    userId: user.id,
    name: data.name.trim(),
    kind: data.kind,
    icon: data.icon || (data.kind === "income" ? "TrendingUp" : "Tag"),
    color: data.color || (data.kind === "income" ? "#2F9E6F" : "#A3C5EB"),
    systemKey: null,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/financas");
  revalidatePath("/");
  return { success: true, id };
}

/**
 * Remove uma categoria personalizada criada pelo usuário.
 * Categorias padrão do sistema (userId = null) não podem ser removidas.
 */
export async function deleteCategoryAction(id: string) {
  const user = await requireUser();

  const deleted = await db
    .delete(categories)
    .where(
      and(
        eq(categories.id, id),
        eq(categories.userId, user.id) // Proteção estrita: só deleta se pertencer ao usuário
      )
    );

  revalidatePath("/configuracoes");
  revalidatePath("/financas");
  revalidatePath("/");
  return { success: true };
}
