"use server";

import { db } from "@/lib/db";
import {
  companySettings,
  companyCostItems,
  companyFundEntries,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CompanySummaryData {
  settings: {
    targetLaunchDate: string | null;
    targetCapitalCents: number;
  };
  reserveCents: number;
  totalCostsCents: number;
  paidCostsCents: number;
  daysRemaining: number;
  costItems: {
    id: string;
    name: string;
    category: "legal" | "equipment" | "marketing" | "operating";
    amountCents: number;
    status: "planned" | "paid";
    notes: string | null;
  }[];
  fundEntries: {
    id: string;
    amountCents: number;
    date: string;
    note: string | null;
    linkedTransactionId: string | null;
  }[];
}

const SETTINGS_ID = "company_global";

export async function getCompanyDataAction(): Promise<{
  success: boolean;
  data?: CompanySummaryData;
  error?: string;
}> {
  try {
    await requireUser();

    // 1. Configurações
    let [settings] = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.id, SETTINGS_ID));

    if (!settings) {
      await db.insert(companySettings).values({
        id: SETTINGS_ID,
        targetLaunchDate: "2027-06-01",
        targetCapitalCents: 5000000, // R$ 50.000,00
      });
      [settings] = await db
        .select()
        .from(companySettings)
        .where(eq(companySettings.id, SETTINGS_ID));
    }

    // 2. Custos
    const costs = await db
      .select()
      .from(companyCostItems)
      .orderBy(desc(companyCostItems.amountCents));

    let totalCostsCents = 0;
    let paidCostsCents = 0;
    for (const c of costs) {
      totalCostsCents += c.amountCents;
      if (c.status === "paid") {
        paidCostsCents += c.amountCents;
      }
    }

    // 3. Fundo
    const funds = await db
      .select()
      .from(companyFundEntries)
      .orderBy(desc(companyFundEntries.date));

    let reserveCents = 0;
    for (const f of funds) {
      reserveCents += f.amountCents;
    }

    // 4. Dias restantes
    let daysRemaining = 0;
    if (settings.targetLaunchDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [year, month, day] = settings.targetLaunchDate.split("-").map(Number);
      const target = new Date(year, month - 1, day);
      const diffTime = target.getTime() - today.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return {
      success: true,
      data: {
        settings: {
          targetLaunchDate: settings.targetLaunchDate,
          targetCapitalCents: settings.targetCapitalCents,
        },
        reserveCents,
        totalCostsCents,
        paidCostsCents,
        daysRemaining,
        costItems: costs.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category as any,
          amountCents: c.amountCents,
          status: c.status as any,
          notes: c.notes,
        })),
        fundEntries: funds.map((f) => ({
          id: f.id,
          amountCents: f.amountCents,
          date: f.date,
          note: f.note,
          linkedTransactionId: f.linkedTransactionId,
        })),
      },
    };
  } catch (error: any) {
    console.error("Erro em getCompanyDataAction:", error);
    return { success: false, error: error.message || "Erro ao carregar dados da empresa" };
  }
}

export async function addCompanyFundEntryAction(data: {
  amountCents: number;
  date: string;
  note?: string | null;
}) {
  try {
    await requireUser();

    if (!data.amountCents || data.amountCents <= 0) {
      return { success: false, error: "Valor inválido" };
    }

    const entryId = `cfund_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(companyFundEntries).values({
      id: entryId,
      amountCents: data.amountCents,
      date: data.date,
      note: data.note?.trim() || null,
    });

    revalidatePath("/empresa");
    return { success: true, entryId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCompanyCostAction(data: {
  name: string;
  category: "legal" | "equipment" | "marketing" | "operating";
  amountCents: number;
  status: "planned" | "paid";
  notes?: string | null;
}) {
  try {
    await requireUser();

    if (!data.name?.trim()) return { success: false, error: "Nome obrigatório" };
    if (!data.amountCents || data.amountCents <= 0) return { success: false, error: "Valor obrigatório" };

    const costId = `ccost_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(companyCostItems).values({
      id: costId,
      name: data.name.trim(),
      category: data.category,
      amountCents: data.amountCents,
      status: data.status,
      notes: data.notes?.trim() || null,
    });

    revalidatePath("/empresa");
    return { success: true, costId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleCompanyCostStatusAction(
  id: string,
  newStatus: "planned" | "paid"
) {
  try {
    await requireUser();

    await db
      .update(companyCostItems)
      .set({ status: newStatus })
      .where(eq(companyCostItems.id, id));

    revalidatePath("/empresa");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCompanyCostAction(id: string) {
  try {
    await requireUser();

    await db.delete(companyCostItems).where(eq(companyCostItems.id, id));

    revalidatePath("/empresa");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
