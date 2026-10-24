"use server";

import { db } from "@/lib/db";
import {
  weddingSettings,
  weddingItems,
  weddingInstallments,
  weddingFundEntries,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { eq, desc, sql, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface WeddingInstallmentItem {
  id: string;
  itemId: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
}

export interface WeddingItemWithInstallments {
  id: string;
  name: string;
  supplier: string | null;
  contact: string | null;
  totalCents: number;
  eventDate: string | null;
  status: "quoting" | "closed" | "paid";
  notes: string | null;
  installments: WeddingInstallmentItem[];
  paidCents: number;
}

export interface WeddingFundEntryItem {
  id: string;
  amountCents: number;
  date: string;
  note: string | null;
  linkedTransactionId: string | null;
}

export interface WeddingSummaryData {
  settings: {
    weddingDate: string | null;
    totalBudgetCents: number | null;
  };
  reserveCents: number;
  committedCents: number;
  paidCents: number;
  remainingCents: number;
  daysRemaining: number;
  projectedPayoffDate: string | null;
  items: WeddingItemWithInstallments[];
  fundEntries: WeddingFundEntryItem[];
}

const SETTINGS_ID = "wedding_global";

/**
 * Busca todas as informações financeiras compartilhadas do casamento
 */
export async function getWeddingDataAction(): Promise<{
  success: boolean;
  data?: WeddingSummaryData;
  error?: string;
}> {
  try {
    // Ambos Yuri e Vithória têm acesso total
    await requireUser();

    // 1. Configurações
    let [settingsRow] = await db
      .select()
      .from(weddingSettings)
      .where(eq(weddingSettings.id, SETTINGS_ID));

    if (!settingsRow) {
      await db.insert(weddingSettings).values({
        id: SETTINGS_ID,
        weddingDate: "2026-11-21",
        totalBudgetCents: 10000000, // R$ 100.000,00
      });
      [settingsRow] = await db
        .select()
        .from(weddingSettings)
        .where(eq(weddingSettings.id, SETTINGS_ID));
    }

    // 2. Itens do Casamento
    const itemsRows = await db
      .select()
      .from(weddingItems)
      .orderBy(desc(weddingItems.totalCents));

    // 3. Parcelas
    const installmentsRows = await db
      .select()
      .from(weddingInstallments)
      .orderBy(asc(weddingInstallments.dueDate));

    const installmentsByItem: Record<string, WeddingInstallmentItem[]> = {};
    let totalPaidFromInstallments = 0;

    for (const inst of installmentsRows) {
      if (!installmentsByItem[inst.itemId]) {
        installmentsByItem[inst.itemId] = [];
      }
      installmentsByItem[inst.itemId].push({
        id: inst.id,
        itemId: inst.itemId,
        amountCents: inst.amountCents,
        dueDate: inst.dueDate,
        paidAt: inst.paidAt,
      });

      if (inst.paidAt) {
        totalPaidFromInstallments += inst.amountCents;
      }
    }

    let totalCommittedCents = 0;
    const itemsWithInstallments: WeddingItemWithInstallments[] = itemsRows.map(
      (item) => {
        totalCommittedCents += item.totalCents;
        const itemInsts = installmentsByItem[item.id] || [];
        const itemPaid = itemInsts
          .filter((i) => i.paidAt !== null)
          .reduce((acc, i) => acc + i.amountCents, 0);

        return {
          id: item.id,
          name: item.name,
          supplier: item.supplier,
          contact: item.contact,
          totalCents: item.totalCents,
          eventDate: item.eventDate,
          status: item.status as "quoting" | "closed" | "paid",
          notes: item.notes,
          installments: itemInsts,
          paidCents: item.status === "paid" && itemInsts.length === 0 ? item.totalCents : itemPaid,
        };
      }
    );

    // 4. Aportes no Cofrinho / Reserva
    const fundRows = await db
      .select()
      .from(weddingFundEntries)
      .orderBy(desc(weddingFundEntries.date));

    let reserveCents = 0;
    const fundEntries: WeddingFundEntryItem[] = fundRows.map((f) => {
      reserveCents += f.amountCents;
      return {
        id: f.id,
        amountCents: f.amountCents,
        date: f.date,
        note: f.note,
        linkedTransactionId: f.linkedTransactionId,
      };
    });

    // 5. Cálculos derivados
    const remainingCents = Math.max(
      0,
      totalCommittedCents - (totalPaidFromInstallments + reserveCents)
    );

    let daysRemaining = 0;
    if (settingsRow.weddingDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [year, month, day] = settingsRow.weddingDate.split("-").map(Number);
      const target = new Date(year, month - 1, day);
      const diffTime = target.getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Projeção simples de quitação: estimativa baseada na média ou 3 meses antes da data
    let projectedPayoffDate: string | null = null;
    if (settingsRow.weddingDate) {
      const [y, m, d] = settingsRow.weddingDate.split("-").map(Number);
      const payoff = new Date(y, m - 1 - 2, d); // 2 meses antes do casamento
      projectedPayoffDate = payoff.toISOString().split("T")[0];
    }

    return {
      success: true,
      data: {
        settings: {
          weddingDate: settingsRow.weddingDate,
          totalBudgetCents: settingsRow.totalBudgetCents,
        },
        reserveCents,
        committedCents: totalCommittedCents,
        paidCents: totalPaidFromInstallments,
        remainingCents,
        daysRemaining,
        projectedPayoffDate,
        items: itemsWithInstallments,
        fundEntries,
      },
    };
  } catch (error: any) {
    console.error("Erro em getWeddingDataAction:", error);
    return { success: false, error: error.message || "Falha ao carregar dados do casamento" };
  }
}

/**
 * Atualiza data ou orçamento do casamento
 */
export async function updateWeddingSettingsAction(data: {
  weddingDate?: string | null;
  totalBudgetCents?: number | null;
}) {
  try {
    await requireUser();

    await db
      .update(weddingSettings)
      .set({
        weddingDate: data.weddingDate,
        totalBudgetCents: data.totalBudgetCents,
        updatedAt: new Date(),
      })
      .where(eq(weddingSettings.id, SETTINGS_ID));

    revalidatePath("/casamento");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Erro em updateWeddingSettingsAction:", error);
    return { success: false, error: error.message || "Erro ao atualizar configurações" };
  }
}

/**
 * Cria um novo item de casamento com parcelamento automático
 */
export async function createWeddingItemAction(data: {
  name: string;
  supplier?: string | null;
  contact?: string | null;
  totalCents: number;
  status: "quoting" | "closed" | "paid";
  notes?: string | null;
  installmentsCount?: number;
  firstDueDate?: string;
}) {
  try {
    await requireUser();

    if (!data.name?.trim()) {
      return { success: false, error: "Nome do item é obrigatório" };
    }
    if (!data.totalCents || data.totalCents <= 0) {
      return { success: false, error: "Valor total deve ser maior que zero" };
    }

    const itemId = `witem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(weddingItems).values({
      id: itemId,
      name: data.name.trim(),
      supplier: data.supplier?.trim() || null,
      contact: data.contact?.trim() || null,
      totalCents: data.totalCents,
      status: data.status,
      notes: data.notes?.trim() || null,
    });

    // Se tiver parcelas
    const count = data.installmentsCount || 1;
    if (count > 0 && data.firstDueDate) {
      const [yearStr, monthStr, dayStr] = data.firstDueDate.split("-");
      let startYear = parseInt(yearStr, 10);
      let startMonth = parseInt(monthStr, 10); // 1 a 12
      const dueDay = parseInt(dayStr, 10);

      const baseAmount = Math.floor(data.totalCents / count);
      const remainder = data.totalCents % count;

      for (let i = 1; i <= count; i++) {
        const instAmount = i === 1 ? baseAmount + remainder : baseAmount;

        let m = startMonth + (i - 1);
        let y = startYear;
        while (m > 12) {
          m -= 12;
          y += 1;
        }

        const maxDay = new Date(y, m, 0).getDate();
        const finalDay = Math.min(dueDay, maxDay);
        const dueDate = `${y}-${String(m).padStart(2, "0")}-${String(finalDay).padStart(2, "0")}`;

        const isPaid = data.status === "paid";

        await db.insert(weddingInstallments).values({
          id: `winst_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          itemId,
          amountCents: instAmount,
          dueDate,
          paidAt: isPaid ? new Date().toISOString() : null,
        });
      }
    }

    revalidatePath("/casamento");
    revalidatePath("/");
    revalidatePath("/calendario");
    return { success: true, itemId };
  } catch (error: any) {
    console.error("Erro em createWeddingItemAction:", error);
    return { success: false, error: error.message || "Erro ao salvar item" };
  }
}

/**
 * Atualiza um item de casamento
 */
export async function updateWeddingItemAction(
  id: string,
  data: {
    name?: string;
    supplier?: string | null;
    contact?: string | null;
    totalCents?: number;
    status?: "quoting" | "closed" | "paid";
    notes?: string | null;
  }
) {
  try {
    await requireUser();

    await db
      .update(weddingItems)
      .set({
        name: data.name?.trim(),
        supplier: data.supplier?.trim() || null,
        contact: data.contact?.trim() || null,
        totalCents: data.totalCents,
        status: data.status,
        notes: data.notes?.trim() || null,
      })
      .where(eq(weddingItems.id, id));

    revalidatePath("/casamento");
    revalidatePath("/");
    revalidatePath("/calendario");
    return { success: true };
  } catch (error: any) {
    console.error("Erro em updateWeddingItemAction:", error);
    return { success: false, error: error.message || "Erro ao atualizar item" };
  }
}

/**
 * Exclui um item de casamento e suas parcelas
 */
export async function deleteWeddingItemAction(id: string) {
  try {
    await requireUser();

    await db.delete(weddingItems).where(eq(weddingItems.id, id));

    revalidatePath("/casamento");
    revalidatePath("/");
    revalidatePath("/calendario");
    return { success: true };
  } catch (error: any) {
    console.error("Erro em deleteWeddingItemAction:", error);
    return { success: false, error: error.message || "Erro ao excluir item" };
  }
}

/**
 * Alterna status de pagamento de uma parcela
 */
export async function toggleWeddingInstallmentPaidAction(
  installmentId: string,
  isPaid: boolean
) {
  try {
    await requireUser();

    await db
      .update(weddingInstallments)
      .set({
        paidAt: isPaid ? new Date().toISOString() : null,
      })
      .where(eq(weddingInstallments.id, installmentId));

    revalidatePath("/casamento");
    revalidatePath("/");
    revalidatePath("/calendario");
    return { success: true };
  } catch (error: any) {
    console.error("Erro em toggleWeddingInstallmentPaidAction:", error);
    return { success: false, error: error.message || "Erro ao atualizar parcela" };
  }
}

/**
 * Registra um aporte manual na reserva do casamento
 */
export async function addWeddingFundEntryAction(data: {
  amountCents: number;
  date: string;
  note?: string | null;
}) {
  try {
    await requireUser();

    if (!data.amountCents || data.amountCents <= 0) {
      return { success: false, error: "Valor do aporte deve ser maior que zero" };
    }

    const entryId = `wfund_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(weddingFundEntries).values({
      id: entryId,
      amountCents: data.amountCents,
      date: data.date,
      note: data.note?.trim() || null,
    });

    revalidatePath("/casamento");
    revalidatePath("/");
    return { success: true, entryId };
  } catch (error: any) {
    console.error("Erro em addWeddingFundEntryAction:", error);
    return { success: false, error: error.message || "Erro ao registrar aporte" };
  }
}

/**
 * Remove um aporte da reserva do casamento
 */
export async function deleteWeddingFundEntryAction(entryId: string) {
  try {
    await requireUser();

    await db.delete(weddingFundEntries).where(eq(weddingFundEntries.id, entryId));

    revalidatePath("/casamento");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Erro em deleteWeddingFundEntryAction:", error);
    return { success: false, error: error.message || "Erro ao excluir aporte" };
  }
}
