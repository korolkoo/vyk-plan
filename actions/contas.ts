"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { bankAccounts, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, desc, eq } from "drizzle-orm";
import type { BankAccountType, BankAccountWithBalance } from "@/types/types";

/**
 * Busca todas as contas bancárias ativas do usuário logado,
 * calculando o saldo real em centavos (saldo inicial + receitas - despesas +/- transferências).
 */
export async function getAccountsAction(): Promise<BankAccountWithBalance[]> {
  const user = await requireUser();

  // 1. Busca as contas do usuário
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.userId, user.id),
        eq(bankAccounts.archived, false)
      )
    )
    .orderBy(desc(bankAccounts.createdAt));

  // 2. Busca todas as transações pagas do usuário para compor o saldo
  const userTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.status, "paid")
      )
    );

  // 3. Calcula o saldo atual de cada conta
  return accounts.map((acc) => {
    let balanceDelta = 0;

    for (const tx of userTransactions) {
      if (tx.bankAccountId === acc.id) {
        if (tx.type === "income") {
          balanceDelta += tx.amountCents;
        } else if (tx.type === "expense") {
          balanceDelta -= tx.amountCents;
        } else if (tx.type === "transfer") {
          balanceDelta -= tx.amountCents;
        }
      }

      // Se a conta for o destino de uma transferência
      if (tx.type === "transfer" && tx.transferToAccountId === acc.id) {
        balanceDelta += tx.amountCents;
      }
    }

    return {
      id: acc.id,
      userId: acc.userId,
      name: acc.name,
      type: acc.type as BankAccountType,
      initialBalanceCents: acc.initialBalanceCents,
      color: acc.color,
      archived: acc.archived,
      currentBalanceCents: acc.initialBalanceCents + balanceDelta,
    };
  });
}

/**
 * Cria uma nova conta bancária para o usuário autenticado.
 */
export async function createAccountAction(data: {
  name: string;
  type: BankAccountType;
  initialBalanceCents: number;
  color: string;
}) {
  const user = await requireUser();

  if (!data.name || !data.name.trim()) {
    throw new Error("O nome da conta é obrigatório.");
  }

  const id = "acc_" + Math.random().toString(36).substring(2, 10);

  await db.insert(bankAccounts).values({
    id,
    userId: user.id,
    name: data.name.trim(),
    type: data.type,
    initialBalanceCents: data.initialBalanceCents || 0,
    color: data.color || "#173B64",
    archived: false,
  });

  revalidatePath("/contas");
  revalidatePath("/");
  return { success: true, id };
}

/**
 * Atualiza os dados de uma conta existente pertencente ao usuário autenticado.
 */
export async function updateAccountAction(
  id: string,
  data: {
    name: string;
    type: BankAccountType;
    initialBalanceCents: number;
    color: string;
  }
) {
  const user = await requireUser();

  if (!data.name || !data.name.trim()) {
    throw new Error("O nome da conta é obrigatório.");
  }

  await db
    .update(bankAccounts)
    .set({
      name: data.name.trim(),
      type: data.type,
      initialBalanceCents: data.initialBalanceCents || 0,
      color: data.color,
    })
    .where(
      and(
        eq(bankAccounts.id, id),
        eq(bankAccounts.userId, user.id)
      )
    );

  revalidatePath("/contas");
  revalidatePath("/");
  return { success: true };
}

/**
 * Arquiva uma conta bancária sem apagar o histórico de lançamentos.
 */
export async function archiveAccountAction(id: string) {
  const user = await requireUser();

  await db
    .update(bankAccounts)
    .set({ archived: true })
    .where(
      and(
        eq(bankAccounts.id, id),
        eq(bankAccounts.userId, user.id)
      )
    );

  revalidatePath("/contas");
  revalidatePath("/");
  return { success: true };
}
