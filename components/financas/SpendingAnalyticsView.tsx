"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { formatCurrency, formatDateShort } from "@/utils/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/ui/MoneyText";
import {
  getSpendingAnalyticsAction,
  type SpendingAnalytics,
  type CategorySpending,
  type MerchantSpending,
  type MonthlyTrend,
} from "@/actions/relatorios";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MapPin,
  PieChart,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";

export function SpendingAnalyticsView() {
  const [analytics, setAnalytics] = useState<SpendingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const loadAnalytics = useCallback(async (month?: string) => {
    try {
      setIsLoading(true);
      const data = await getSpendingAnalyticsAction(month);
      setAnalytics(data);
      if (!selectedMonth) {
        setSelectedMonth(data.selectedMonth);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar relatórios";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handlePrevMonth = () => {
    if (!analytics) return;
    const [yStr, mStr] = analytics.selectedMonth.split("-");
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    const newMonth = `${y}-${String(m).padStart(2, "0")}`;
    setSelectedMonth(newMonth);
    loadAnalytics(newMonth);
  };

  const handleNextMonth = () => {
    if (!analytics) return;
    const [yStr, mStr] = analytics.selectedMonth.split("-");
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const newMonth = `${y}-${String(m).padStart(2, "0")}`;
    setSelectedMonth(newMonth);
    loadAnalytics(newMonth);
  };

  if (isLoading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted animate-pulse">
        <BarChart3 className="w-10 h-10 mb-3 text-powder" />
        <p className="text-sm">Carregando painel de gastos...</p>
      </div>
    );
  }

  if (!analytics) return null;

  // Encontra o valor máximo entre os últimos 6 meses para calcular altura proporcional das barras
  const maxTrendExpense = Math.max(
    1,
    ...analytics.monthlyTrends.map((t) => Math.max(t.expenseCents, t.incomeCents))
  );

  return (
    <div className="space-y-6">
      {/* Navegação de Mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Análise & Inteligência de Gastos
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground capitalize">
            {analytics.monthLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-border hover:bg-surface-hover active:scale-95 transition-all text-muted hover:text-foreground"
            title="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-background border border-border text-sm font-semibold text-foreground">
            {analytics.selectedMonth}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-border hover:bg-surface-hover active:scale-95 transition-all text-muted hover:text-foreground"
            title="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid de Métricas Principais (Quando / Quanto / Onde) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gasto no Mês */}
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total Gasto
              </span>
              <TrendingDown className="w-4 h-4 text-expense" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tabular text-expense">
              <MoneyText cents={analytics.totalExpenseCents} prefix="-" />
            </p>
            <p className="text-xs text-muted">
              {analytics.totalIncomeCents > 0
                ? `Receitas: ${formatCurrency(analytics.totalIncomeCents)}`
                : "Sem receitas liquidadas no mês"}
            </p>
          </CardContent>
        </Card>

        {/* Média Diária */}
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Média Diária
              </span>
              <Zap className="w-4 h-4 text-naples" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tabular text-foreground">
              <MoneyText cents={analytics.dailyAverageCents} />
            </p>
            <p className="text-xs text-muted">
              Base de {analytics.daysConsidered} dia(s) no mês
            </p>
          </CardContent>
        </Card>

        {/* Categoria Mais Pesada */}
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Maior Categoria
              </span>
              <PieChart className="w-4 h-4 text-powder" />
            </div>
            {analytics.topCategory ? (
              <>
                <p className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {analytics.topCategory.name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="sm">
                    {analytics.topCategory.percentage}% dos gastos
                  </Badge>
                  <span className="text-xs text-muted tabular">
                    {formatCurrency(analytics.topCategory.totalCents)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Nenhum gasto registrado</p>
            )}
          </CardContent>
        </Card>

        {/* Maior Compra Individual */}
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Maior Compra
              </span>
              <ShoppingBag className="w-4 h-4 text-emerald-500" />
            </div>
            {analytics.topSingleExpense ? (
              <>
                <p className="text-lg sm:text-xl font-bold text-foreground truncate">
                  <MoneyText cents={analytics.topSingleExpense.amountCents} />
                </p>
                <p className="text-xs text-muted truncate">
                  {analytics.topSingleExpense.description} ({formatDateShort(analytics.topSingleExpense.date)})
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">Nenhuma compra</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Onde Gasta (Estabelecimentos) e Que Categoria Gasta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ONDE VOCÊ GASTA MAIS (Ranking de Estabelecimentos) */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-naples" />
                <CardTitle className="text-base sm:text-lg">
                  Onde você mais gasta
                </CardTitle>
              </div>
              <Badge variant="neutral" size="sm">
                Top Estabelecimentos
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Lugares, restaurantes, lojas e destinatários com maior volume
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {analytics.topMerchants.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">
                Nenhum estabelecimento identificado neste mês.
              </div>
            ) : (
              analytics.topMerchants.map((merchant, idx) => (
                <div
                  key={merchant.name + idx}
                  className="p-3 rounded-xl bg-background/60 border border-border/70 hover:border-border transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-powder/20 text-powder text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-sm text-foreground truncate">
                        {merchant.name}
                      </span>
                      <span className="text-xs text-muted shrink-0 hidden sm:inline">
                        ({merchant.transactionCount}x)
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm tabular text-foreground">
                        {formatCurrency(merchant.totalCents)}
                      </span>
                      <span className="text-[11px] text-muted ml-1.5">
                        {merchant.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso do Estabelecimento */}
                  <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-naples to-amber-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, merchant.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* QUE CATEGORIA VOCÊ GASTA MAIS (Distribuição por Categorias) */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-powder" />
                <CardTitle className="text-base sm:text-lg">
                  Gastos por Categoria
                </CardTitle>
              </div>
              <Badge variant="neutral" size="sm">
                {analytics.categoryBreakdown.length} categorias
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Divisão percentual e valores totais por tipo de despesa
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {analytics.categoryBreakdown.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">
                Nenhum gasto categorizado neste mês.
              </div>
            ) : (
              analytics.categoryBreakdown.map((cat) => (
                <div
                  key={cat.categoryId}
                  className="p-3 rounded-xl bg-background/60 border border-border/70 hover:border-border transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.categoryColor }}
                      />
                      <span className="font-semibold text-sm text-foreground truncate">
                        {cat.categoryName}
                      </span>
                      <span className="text-xs text-muted shrink-0 hidden sm:inline">
                        • {cat.transactionCount} lançamentos
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm tabular text-foreground">
                        {formatCurrency(cat.totalCents)}
                      </span>
                      <span className="text-[11px] text-muted ml-1.5">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Barra Colorida da Categoria */}
                  <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, cat.percentage)}%`,
                        backgroundColor: cat.categoryColor,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* QUANDO VOCÊ GASTA (Comparativo Mês a Mês - Últimos 6 meses) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <CardTitle className="text-base sm:text-lg">
                Evolução Mês a Mês (Últimos 6 meses)
              </CardTitle>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-expense" />
                <span>Despesas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-income" />
                <span>Receitas</span>
              </div>
            </div>
          </div>
          <CardDescription className="text-xs">
            Acompanhe quando seus gastos sobem ou descem ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2 sm:gap-4 pt-6 pb-2 items-end min-h-[180px]">
            {analytics.monthlyTrends.map((trend) => {
              const expPercent =
                maxTrendExpense > 0
                  ? Math.max(8, Math.round((trend.expenseCents / maxTrendExpense) * 100))
                  : 8;
              const incPercent =
                maxTrendExpense > 0
                  ? Math.max(8, Math.round((trend.incomeCents / maxTrendExpense) * 100))
                  : 8;
              const isSelected = trend.month === analytics.selectedMonth;

              return (
                <div
                  key={trend.month}
                  onClick={() => {
                    setSelectedMonth(trend.month);
                    loadAnalytics(trend.month);
                  }}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-powder/15 border border-powder"
                      : "hover:bg-surface-hover border border-transparent"
                  }`}
                >
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-32">
                    {/* Barra de Despesa */}
                    <div
                      className="w-1/2 max-w-[20px] rounded-t-md bg-expense/85 hover:bg-expense transition-all"
                      style={{ height: `${expPercent}%` }}
                      title={`Despesas: ${formatCurrency(trend.expenseCents)}`}
                    />
                    {/* Barra de Receita */}
                    <div
                      className="w-1/2 max-w-[20px] rounded-t-md bg-income/85 hover:bg-income transition-all"
                      style={{ height: `${incPercent}%` }}
                      title={`Receitas: ${formatCurrency(trend.incomeCents)}`}
                    />
                  </div>

                  <div className="text-center">
                    <p
                      className={`text-[11px] sm:text-xs font-semibold ${
                        isSelected ? "text-powder font-bold" : "text-muted"
                      }`}
                    >
                      {trend.label}
                    </p>
                    <p className="text-[10px] tabular text-muted hidden sm:block">
                      {formatCurrency(trend.expenseCents)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

