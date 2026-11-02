"use server";

import { db } from "@/lib/db";
import {
  bankAccounts,
  categories,
  recurrences,
  transactions,
} from "@/lib/db/schema";
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
  netCents: number;
}

export interface ProjectionPoint {
  month: string; // YYYY-MM
  label: string; // "Dez/26", "Jan/27"
  projectedIncomeCents: number;
  projectedExpenseCents: number;
  projectedNetCents: number; // sobra líquida projetada no mês
  accumulatedBalanceCents: number; // saldo patrimonial estimado acumulado
}

export interface ProjectionSummary {
  monthsCount: number;
  totalIncomeCents: number;
  totalExpenseCents: number;
  totalNetCents: number;
  finalBalanceCents: number;
}

export interface FinancialProjection {
  baselineMonthlyIncomeCents: number;
  baselineMonthlyExpenseCents: number;
  baselineMonthlyNetCents: number;
  currentBalanceCents: number;
  points6m: ProjectionPoint[];
  points12m: ProjectionPoint[];
  points24m: ProjectionPoint[];
  summary6m: ProjectionSummary;
  summary12m: ProjectionSummary;
  summary24m: ProjectionSummary;
}

export interface SpendingAnalytics {
  selectedMonth: string; // YYYY-MM
  monthLabel: string;
  totalExpenseCents: number;
  totalIncomeCents: number;
  netCents: number;
  categoryBreakdown: CategorySpending[];
  topMerchants: MerchantSpending[];
  monthlyTrends: MonthlyTrend[];
  projection: FinancialProjection;
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
 * Retorna as estatísticas analíticas de gastos e projeções futuras do usuário logado:
 * - ONDE gasta (ranking de estabelecimentos)
 * - QUE CATEGORIA gasta (distribuição percentual e ranking para gráfico de pizza)
 * - QUANDO gasta (comparativo histórico mês a mês dos últimos 6 meses)
 * - PROJEÇÃO PREDITIVA (6 meses, 1 ano, 2 anos com receitas, despesas, sobra e saldo acumulado)
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

  const expenseTxs = monthTxs.filter((t) => t.type === "expense");
  const incomeTxs = monthTxs.filter((t) => t.type === "income");

  const totalExpenseCents = expenseTxs.reduce((sum, t) => sum + t.amountCents, 0);
  const totalIncomeCents = incomeTxs.reduce((sum, t) => sum + t.amountCents, 0);
  const netCents = totalIncomeCents - totalExpenseCents;

  // 3. Agrupamento por Categoria (para o Gráfico de Pizza / Donut)
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

  // 4. Ranking de Estabelecimentos (ONDE GASTA MAIS)
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
    .slice(0, 10);

  // 5. Histórico Mês a Mês (QUANDO GASTA: Últimos 6 meses)
  const monthlyTrends: MonthlyTrend[] = [];
  const historicalIncomes: number[] = [];
  const historicalExpenses: number[] = [];

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
      netCents: incSum - expSum,
    });

    if (incSum > 0) historicalIncomes.push(incSum);
    if (expSum > 0) historicalExpenses.push(expSum);
  }

  // 6. MODELAGEM PREDITIVA E PROJEÇÃO FINANCEIRA (6M, 1A, 2A)
  // Busca saldo atual em contas
  const userAccounts = await db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.userId, user.id), eq(bankAccounts.archived, false)));

  const allPaidTransactions = await db
    .select({
      type: transactions.type,
      amountCents: transactions.amountCents,
      bankAccountId: transactions.bankAccountId,
      transferToAccountId: transactions.transferToAccountId,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.status, "paid")));

  let currentBalanceCents = 0;
  for (const acc of userAccounts) {
    let balance = acc.initialBalanceCents;
    for (const tx of allPaidTransactions) {
      if (tx.bankAccountId === acc.id) {
        if (tx.type === "income") balance += tx.amountCents;
        else if (tx.type === "expense") balance -= tx.amountCents;
        else if (tx.type === "transfer") balance -= tx.amountCents;
      }
      if (tx.type === "transfer" && tx.transferToAccountId === acc.id) {
        balance += tx.amountCents;
      }
    }
    currentBalanceCents += balance;
  }

  // Busca recorrências ativas do usuário para embasar a média fixa
  const userRecurrences = await db
    .select()
    .from(recurrences)
    .where(and(eq(recurrences.userId, user.id), eq(recurrences.active, true)));

  let recurringIncomeCents = 0;
  let recurringExpenseCents = 0;
  for (const rec of userRecurrences) {
    if (rec.type === "income") recurringIncomeCents += rec.amountCents;
    else if (rec.type === "expense") recurringExpenseCents += rec.amountCents;
  }

  // Média ponderada histórica de receitas e despesas
  const avgHistIncome =
    historicalIncomes.length > 0
      ? Math.round(historicalIncomes.reduce((a, b) => a + b, 0) / historicalIncomes.length)
      : 0;

  const avgHistExpense =
    historicalExpenses.length > 0
      ? Math.round(historicalExpenses.reduce((a, b) => a + b, 0) / historicalExpenses.length)
      : 0;

  // Baseline robusto: máximo entre a média histórica recente e os compromissos fixos cadastrados
  const baselineMonthlyIncomeCents = Math.max(avgHistIncome, recurringIncomeCents);
  const baselineMonthlyExpenseCents = Math.max(avgHistExpense, recurringExpenseCents);
  const baselineMonthlyNetCents = baselineMonthlyIncomeCents - baselineMonthlyExpenseCents;

  // Gera a série temporal contínua dos próximos 24 meses
  const allProjectionPoints: ProjectionPoint[] = [];
  let runningAccumulatedBalance = currentBalanceCents;

  for (let k = 1; k <= 24; k++) {
    let targetM = monthNum + k;
    let targetY = year;
    while (targetM > 12) {
      targetM -= 12;
      targetY += 1;
    }

    const mKey = `${targetY}-${String(targetM).padStart(2, "0")}`;
    const dt = new Date(targetY, targetM - 1, 15);
    const shortName = dt.toLocaleDateString("pt-BR", {
      month: "short",
    }).replace(".", "");
    const formattedShort = shortName.charAt(0).toUpperCase() + shortName.slice(1);
    const label = `${formattedShort}/${String(targetY).slice(-2)}`;

    runningAccumulatedBalance += baselineMonthlyNetCents;

    allProjectionPoints.push({
      month: mKey,
      label,
      projectedIncomeCents: baselineMonthlyIncomeCents,
      projectedExpenseCents: baselineMonthlyExpenseCents,
      projectedNetCents: baselineMonthlyNetCents,
      accumulatedBalanceCents: runningAccumulatedBalance,
    });
  }

  const points6m = allProjectionPoints.slice(0, 6);
  const points12m = allProjectionPoints.slice(0, 12);
  const points24m = allProjectionPoints.slice(0, 24);

  const projection: FinancialProjection = {
    baselineMonthlyIncomeCents,
    baselineMonthlyExpenseCents,
    baselineMonthlyNetCents,
    currentBalanceCents,
    points6m,
    points12m,
    points24m,
    summary6m: {
      monthsCount: 6,
      totalIncomeCents: baselineMonthlyIncomeCents * 6,
      totalExpenseCents: baselineMonthlyExpenseCents * 6,
      totalNetCents: baselineMonthlyNetCents * 6,
      finalBalanceCents: currentBalanceCents + baselineMonthlyNetCents * 6,
    },
    summary12m: {
      monthsCount: 12,
      totalIncomeCents: baselineMonthlyIncomeCents * 12,
      totalExpenseCents: baselineMonthlyExpenseCents * 12,
      totalNetCents: baselineMonthlyNetCents * 12,
      finalBalanceCents: currentBalanceCents + baselineMonthlyNetCents * 12,
    },
    summary24m: {
      monthsCount: 24,
      totalIncomeCents: baselineMonthlyIncomeCents * 24,
      totalExpenseCents: baselineMonthlyExpenseCents * 24,
      totalNetCents: baselineMonthlyNetCents * 24,
      finalBalanceCents: currentBalanceCents + baselineMonthlyNetCents * 24,
    },
  };

  return {
    selectedMonth: activeMonth,
    monthLabel,
    totalExpenseCents,
    totalIncomeCents,
    netCents,
    categoryBreakdown,
    topMerchants,
    monthlyTrends,
    projection,
  };
}
