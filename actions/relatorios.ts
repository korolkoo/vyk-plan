"use server";

import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { and, desc, eq, like, or } from "drizzle-orm";
import { getLocalDateParts, getLocalCurrentMonthString } from "@/utils/dates";

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalCents: number;
  percentage: number; // 0 a 100
  transactionCount: number;
}

export interface MerchantSpending {
  name: string;
  totalCents: number;
  percentage: number;
  transactionCount: number;
  lastDate: string;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  label: string; // "Nov/26", "Out/26", etc.
  expenseCents: number;
  incomeCents: number;
}

export interface SpendingAnalytics {
  selectedMonth: string; // YYYY-MM
  monthLabel: string;
  totalExpenseCents: number;
  totalIncomeCents: number;
  netCents: number;
  dailyAverageCents: number;
  daysConsidered: number;
  topCategory: {
    name: string;
    totalCents: number;
    percentage: number;
    color: string;
    icon: string;
  } | null;
  topSingleExpense: {
    description: string;
    amountCents: number;
    date: string;
    categoryName?: string;
  } | null;
  categoryBreakdown: CategorySpending[];
  topMerchants: MerchantSpending[];
  monthlyTrends: MonthlyTrend[];
}

/**
 * Função utilitária para extrair e normalizar o nome do estabelecimento/local de gasto.
 */
function extractMerchantName(tx: {
  description: string;
  notes?: string | null;
}): string {
  // 1. Tenta extrair de notes JSON caso o webhook tenha salvo o estabelecimento
  if (tx.notes) {
    try {
      const parsed = JSON.parse(tx.notes);
      if (parsed.establishment && typeof parsed.establishment === "string") {
        const est = parsed.establishment.trim();
        if (est && est.toLowerCase() !== "banrisul" && est.length > 2) {
          return est;
        }
      }
    } catch {
      // Ignora erro de parse
    }
  }

  // 2. Limpa tags como [Banrisul Pix], [Contactless], [Debug], etc.
  let cleaned = tx.description
    .replace(/\[.*?\]/g, "")
    .replace(/\(\d+\/\d+\)/g, "") // remove parcelas ex: (1/3)
    .replace(/^(pix|compra|pagamento|transferência|ted|doc)\s+(enviado|recebido|no|de|para)?\s*/i, "")
    .trim();

  // Se após a limpeza sobrou um nome válido
  if (cleaned.length >= 3) {
    // Normaliza capitalização (ex: "BRASILI BURGER" -> "Brasili Burger")
    if (cleaned === cleaned.toUpperCase()) {
      cleaned = cleaned
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
    }
    return cleaned;
  }

  return tx.description.slice(0, 40);
}

/**
 * Retorna as estatísticas analíticas de gastos detalhadas do usuário logado:
 * - ONDE gasta (ranking de estabelecimentos)
 * - QUE CATEGORIA gasta (distribuição percentual e ranking)
 * - QUANDO gasta (comparativo mês a mês dos últimos 6 meses e média diária)
 * Filtro 100% isolado por userId.
 */
export async function getSpendingAnalyticsAction(
  targetMonth?: string // YYYY-MM (opcional, padrão: mês atual)
): Promise<SpendingAnalytics> {
  const user = await requireUser();

  const activeMonth = targetMonth || getLocalCurrentMonthString();
  const [yearStr, monthNumStr] = activeMonth.split("-");
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);

  // Label amigável do mês
  const dateObj = new Date(year, monthNum - 1, 15);
  const rawMonthName = dateObj.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const monthLabel =
    rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);

  // 1. Busca todas as categorias acessíveis (sistema + criadas pelo usuário)
  const userCategories = await db
    .select()
    .from(categories)
    .where(or(eq(categories.userId, user.id), eq(categories.userId, "")));

  const categoryMap = new Map(userCategories.map((c) => [c.id, c]));

  // 2. Busca todas as transações do usuário no mês selecionado
  const monthTxs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        like(transactions.date, `${activeMonth}%`)
      )
    )
    .orderBy(desc(transactions.date));

  // Filtra apenas despesas reais (inclui despesas de cartão e previsões liquidadas ou ativas)
  const expenseTxs = monthTxs.filter((t) => t.type === "expense");
  const incomeTxs = monthTxs.filter((t) => t.type === "income");

  const totalExpenseCents = expenseTxs.reduce((sum, t) => sum + t.amountCents, 0);
  const totalIncomeCents = incomeTxs.reduce((sum, t) => sum + t.amountCents, 0);
  const netCents = totalIncomeCents - totalExpenseCents;

  // Dias decorridos no mês para a média diária
  const { year: currentYear, month: currentMonth, day: currentDay } = getLocalDateParts();
  const isCurrentMonth = currentYear === year && currentMonth === monthNum;
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const daysConsidered = isCurrentMonth ? Math.max(1, currentDay) : daysInMonth;
  const dailyAverageCents = Math.round(totalExpenseCents / daysConsidered);

  // 3. Agrupamento por Categoria
  const catTotals = new Map<
    string,
    { totalCents: number; count: number; name: string; icon: string; color: string }
  >();

  for (const tx of expenseTxs) {
    const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
    const catId = cat?.id || "uncategorized";
    const catName = cat?.name || "Outros / Sem Categoria";
    const catIcon = cat?.icon || "HelpCircle";
    const catColor = cat?.color || "#94A3B8";

    const prev = catTotals.get(catId) || {
      totalCents: 0,
      count: 0,
      name: catName,
      icon: catIcon,
      color: catColor,
    };

    catTotals.set(catId, {
      ...prev,
      totalCents: prev.totalCents + tx.amountCents,
      count: prev.count + 1,
    });
  }

  const categoryBreakdown: CategorySpending[] = Array.from(catTotals.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      categoryIcon: data.icon,
      categoryColor: data.color,
      totalCents: data.totalCents,
      percentage:
        totalExpenseCents > 0
          ? Math.round((data.totalCents / totalExpenseCents) * 100)
          : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  // 4. Maior Categoria de Gastos
  const topCategory = categoryBreakdown.length > 0
    ? {
        name: categoryBreakdown[0].categoryName,
        totalCents: categoryBreakdown[0].totalCents,
        percentage: categoryBreakdown[0].percentage,
        color: categoryBreakdown[0].categoryColor,
        icon: categoryBreakdown[0].categoryIcon,
      }
    : null;

  // 5. Maior Compra Individual do Mês
  let topSingleExpense: SpendingAnalytics["topSingleExpense"] = null;
  if (expenseTxs.length > 0) {
    const sortedByAmount = [...expenseTxs].sort(
      (a, b) => b.amountCents - a.amountCents
    );
    const highest = sortedByAmount[0];
    const cat = highest.categoryId
      ? categoryMap.get(highest.categoryId)
      : undefined;

    topSingleExpense = {
      description: highest.description,
      amountCents: highest.amountCents,
      date: highest.date,
      categoryName: cat?.name,
    };
  }

  // 6. Ranking de Estabelecimentos (ONDE GASTA MAIS)
  const merchantTotals = new Map<
    string,
    { totalCents: number; count: number; lastDate: string }
  >();

  for (const tx of expenseTxs) {
    const merchantName = extractMerchantName(tx);
    const prev = merchantTotals.get(merchantName) || {
      totalCents: 0,
      count: 0,
      lastDate: tx.date,
    };

    merchantTotals.set(merchantName, {
      totalCents: prev.totalCents + tx.amountCents,
      count: prev.count + 1,
      lastDate: tx.date > prev.lastDate ? tx.date : prev.lastDate,
    });
  }

  const topMerchants: MerchantSpending[] = Array.from(merchantTotals.entries())
    .map(([name, data]) => ({
      name,
      totalCents: data.totalCents,
      percentage:
        totalExpenseCents > 0
          ? Math.round((data.totalCents / totalExpenseCents) * 100)
          : 0,
      transactionCount: data.count,
      lastDate: data.lastDate,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 10); // Top 10 lugares mais frequentes/caros

  // 7. Comparativo Mês a Mês (QUANDO GASTA: Últimos 6 meses)
  const monthlyTrends: MonthlyTrend[] = [];

  // Gera lista dos últimos 6 meses até o activeMonth
  for (let i = 5; i >= 0; i--) {
    let m = monthNum - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }

    const mKey = `${y}-${String(m).padStart(2, "0")}`;
    const dt = new Date(y, m - 1, 15);
    const shortName = dt.toLocaleDateString("pt-BR", {
      month: "short",
    }).replace(".", "");
    const formattedShort = shortName.charAt(0).toUpperCase() + shortName.slice(1);
    const label = `${formattedShort}/${String(y).slice(-2)}`;

    // Busca transações desse mês para o usuário
    const pastTxs = await db
      .select({
        type: transactions.type,
        amountCents: transactions.amountCents,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          like(transactions.date, `${mKey}%`)
        )
      );

    let expSum = 0;
    let incSum = 0;
    for (const t of pastTxs) {
      if (t.type === "expense") expSum += t.amountCents;
      else if (t.type === "income") incSum += t.amountCents;
    }

    monthlyTrends.push({
      month: mKey,
      label,
      expenseCents: expSum,
      incomeCents: incSum,
    });
  }

  return {
    selectedMonth: activeMonth,
    monthLabel,
    totalExpenseCents,
    totalIncomeCents,
    netCents,
    dailyAverageCents,
    daysConsidered,
    topCategory,
    topSingleExpense,
    categoryBreakdown,
    topMerchants,
    monthlyTrends,
  };
}

