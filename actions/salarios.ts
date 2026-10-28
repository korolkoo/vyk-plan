"use server";

import { db } from "@/lib/db";
import { salaryRecords } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { SalaryRecord } from "@/types/types";

/**
 * Busca todo o histórico e evolução salarial do usuário logado
 */
export async function getSalaryRecordsAction(): Promise<SalaryRecord[]> {
  const user = await requireUser();

  const records = await db
    .select()
    .from(salaryRecords)
    .where(eq(salaryRecords.userId, user.id))
    .orderBy(asc(salaryRecords.startDate));

  return records;
}

export interface CreateSalaryRecordInput {
  title: string;
  company: string;
  amountCents: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD ou null para emprego atual
  notes?: string | null;
}

/**
 * Cria um novo registro salarial para o usuário logado
 */
export async function createSalaryRecordAction(
  data: CreateSalaryRecordInput
): Promise<SalaryRecord> {
  const user = await requireUser();

  if (!data.title.trim()) {
    throw new Error("O cargo / função é obrigatório");
  }
  if (!data.company.trim()) {
    throw new Error("A empresa é obrigatória");
  }
  if (!data.startDate) {
    throw new Error("A data de início é obrigatória");
  }
  if (!data.amountCents || data.amountCents <= 0) {
    throw new Error("Informe um valor de salário válido");
  }

  const id = `sal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const [newRecord] = await db
    .insert(salaryRecords)
    .values({
      id,
      userId: user.id,
      title: data.title.trim(),
      company: data.company.trim(),
      amountCents: data.amountCents,
      startDate: data.startDate,
      endDate: data.endDate || null,
      notes: data.notes?.trim() || null,
    })
    .returning();

  revalidatePath("/financas");
  return newRecord;
}

export interface UpdateSalaryRecordInput {
  title: string;
  company: string;
  amountCents: number;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

/**
 * Atualiza um registro salarial existente do usuário logado
 */
export async function updateSalaryRecordAction(
  id: string,
  data: UpdateSalaryRecordInput
): Promise<SalaryRecord> {
  const user = await requireUser();

  if (!data.title.trim()) {
    throw new Error("O cargo / função é obrigatório");
  }
  if (!data.company.trim()) {
    throw new Error("A empresa é obrigatória");
  }
  if (!data.startDate) {
    throw new Error("A data de início é obrigatória");
  }
  if (!data.amountCents || data.amountCents <= 0) {
    throw new Error("Informe um valor de salário válido");
  }

  const [updatedRecord] = await db
    .update(salaryRecords)
    .set({
      title: data.title.trim(),
      company: data.company.trim(),
      amountCents: data.amountCents,
      startDate: data.startDate,
      endDate: data.endDate || null,
      notes: data.notes?.trim() || null,
    })
    .where(and(eq(salaryRecords.id, id), eq(salaryRecords.userId, user.id)))
    .returning();

  if (!updatedRecord) {
    throw new Error("Registro salarial não encontrado ou acesso não autorizado");
  }

  revalidatePath("/financas");
  return updatedRecord;
}

/**
 * Remove um registro salarial do usuário logado
 */
export async function deleteSalaryRecordAction(id: string): Promise<boolean> {
  const user = await requireUser();

  const deleted = await db
    .delete(salaryRecords)
    .where(and(eq(salaryRecords.id, id), eq(salaryRecords.userId, user.id)))
    .returning({ id: salaryRecords.id });

  if (deleted.length === 0) {
    throw new Error("Registro salarial não encontrado ou acesso não autorizado");
  }

  revalidatePath("/financas");
  return true;
}
