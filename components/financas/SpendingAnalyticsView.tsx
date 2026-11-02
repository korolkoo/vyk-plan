"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  type ProjectionPoint,
} from "@/actions/relatorios";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  Line,
} from "recharts";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  CreditCard,
  MapPin,
  PieChart as PieIcon,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

type ProjectionHorizon = "6m" | "12m" | "24m";

// Formatação amigável para eixos Y monetários (ex: 2.5k, 10k, 50k)
function formatCompactCurrency(value: number): string {
  if (value === 0) return "R$ 0";
  const abs = Math.abs(value);
  if (abs >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

export function SpendingAnalyticsView() {
  const [analytics, setAnalytics] = useState<SpendingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [horizon, setHorizon] = useState<ProjectionHorizon>("6m");
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

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

  // Dados transformados para o gráfico de pizza (em Reais, com cores)
  const pieChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.categoryBreakdown.map((cat) => ({
      name: cat.categoryName,
      value: cat.totalCents / 100,
      cents: cat.totalCents,
      color: cat.categoryColor || "#94A3B8",
      percentage: cat.percentage,
      count: cat.transactionCount,
    }));
  }, [analytics]);

  // Dados da projeção conforme o horizonte escolhido
  const activeProjectionData = useMemo(() => {
    if (!analytics) return { points: [], summary: null };
    const p = analytics.projection;
    let points: ProjectionPoint[] = p.points6m;
    let summary = p.summary6m;

    if (horizon === "12m") {
      points = p.points12m;
      summary = p.summary12m;
    } else if (horizon === "24m") {
      points = p.points24m;
      summary = p.summary24m;
    }

    const formattedPoints = points.map((pt) => ({
      ...pt,
      incomeReais: pt.projectedIncomeCents / 100,
      expenseReais: pt.projectedExpenseCents / 100,
      netReais: pt.projectedNetCents / 100,
      accumulatedReais: pt.accumulatedBalanceCents / 100,
    }));

    return { points: formattedPoints, summary };
  }, [analytics, horizon]);

  // Dados do histórico comparativo dos últimos 6 meses (em Reais)
  const historyBarData = useMemo(() => {
    if (!analytics) return [];
    return analytics.monthlyTrends.map((t) => ({
      month: t.month,
      label: t.label,
      despesas: t.expenseCents / 100,
      receitas: t.incomeCents / 100,
      sobra: t.netCents / 100,
      despesasCents: t.expenseCents,
      receitasCents: t.incomeCents,
      sobraCents: t.netCents,
    }));
  }, [analytics]);

  if (isLoading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-muted animate-pulse">
        <BarChart3 className="w-12 h-12 mb-3 text-powder" />
        <p className="text-sm font-semibold">Carregando Business Intelligence financeiro...</p>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Barra Superior Executiva de Controle do Mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Painel de Inteligência & BI Financeiro
            </span>
            <Badge variant="neutral" size="sm">
              Visão Sênior
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground capitalize mt-0.5">
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
          <div className="px-3.5 py-1.5 rounded-xl bg-background border border-border text-sm font-bold text-foreground">
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

      {/* Grid de KPIs Financeiros (Sem dados descartáveis) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gasto no Mês */}
        <Card>
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total de Despesas
              </span>
              <TrendingDown className="w-4 h-4 text-expense" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tabular text-expense">
              <MoneyText cents={analytics.totalExpenseCents} prefix="-" />
            </p>
            <p className="text-xs text-muted">Gastos liquidados e obrigações no mês</p>
          </CardContent>
        </Card>

        {/* Total Recebido no Mês */}
        <Card>
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total de Receitas
              </span>
              <TrendingUp className="w-4 h-4 text-income" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tabular text-income">
              <MoneyText cents={analytics.totalIncomeCents} prefix="+" />
            </p>
            <p className="text-xs text-muted">Salários e entradas confirmadas</p>
          </CardContent>
        </Card>

        {/* Sobra Líquida do Mês */}
        <Card>
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Resultado Líquido (Mês)
              </span>
              <Coins className="w-4 h-4 text-naples" />
            </div>
            <p
              className={`text-2xl sm:text-3xl font-extrabold tabular ${
                analytics.netCents >= 0 ? "text-income" : "text-expense"
              }`}
            >
              <MoneyText cents={analytics.netCents} prefix={analytics.netCents > 0 ? "+" : ""} />
            </p>
            <p className="text-xs text-muted">
              {analytics.netCents >= 0 ? "Superávit financeiro mensal" : "Déficit financeiro no período"}
            </p>
          </CardContent>
        </Card>

        {/* Saldo Patrimonial em Contas */}
        <Card variant="alice">
          <CardContent className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Patrimônio em Contas
              </span>
              <Wallet className="w-4 h-4 text-navy dark:text-aurora" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tabular text-navy dark:text-aurora">
              <MoneyText cents={analytics.projection.currentBalanceCents} />
            </p>
            <p className="text-xs text-muted">Ponto de partida do seu saldo real</p>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 1: PROJEÇÃO FINANCEIRA FUTURA (6 Meses, 1 Ano, 2 Anos) */}
      <Card className="border-powder/40 overflow-hidden shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-powder" />
                <CardTitle className="text-lg sm:text-xl font-bold">
                  Projeção Financeira Futura (BI Preditivo)
                </CardTitle>
                <Badge variant="neutral" size="sm">
                  Interativo
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Simulação baseada na sua média de gastos, receitas e despesas fixas. Passe o mouse sobre a linha para inspecionar cada mês.
              </CardDescription>
            </div>

            {/* Seletor de Horizonte Temporal */}
            <div className="flex items-center bg-background border border-border p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setHorizon("6m")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  horizon === "6m"
                    ? "bg-navy text-aurora dark:bg-naples dark:text-navy shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                6 Meses
              </button>
              <button
                onClick={() => setHorizon("12m")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  horizon === "12m"
                    ? "bg-navy text-aurora dark:bg-naples dark:text-navy shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                1 Ano (12M)
              </button>
              <button
                onClick={() => setHorizon("24m")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  horizon === "24m"
                    ? "bg-navy text-aurora dark:bg-naples dark:text-navy shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                2 Anos (24M)
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          {/* Métricas do Período Selecionado */}
          {activeProjectionData.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-background/80 border border-border/70">
              <div>
                <span className="text-[11px] font-semibold text-muted uppercase">
                  Receita Prevista ({activeProjectionData.summary.monthsCount}M)
                </span>
                <p className="text-lg sm:text-xl font-bold tabular text-income mt-0.5">
                  <MoneyText cents={activeProjectionData.summary.totalIncomeCents} prefix="+" />
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted uppercase">
                  Despesa Prevista ({activeProjectionData.summary.monthsCount}M)
                </span>
                <p className="text-lg sm:text-xl font-bold tabular text-expense mt-0.5">
                  <MoneyText cents={activeProjectionData.summary.totalExpenseCents} prefix="-" />
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted uppercase">
                  Sobra Estimada no Período
                </span>
                <p
                  className={`text-lg sm:text-xl font-bold tabular mt-0.5 ${
                    activeProjectionData.summary.totalNetCents >= 0 ? "text-income" : "text-expense"
                  }`}
                >
                  <MoneyText
                    cents={activeProjectionData.summary.totalNetCents}
                    prefix={activeProjectionData.summary.totalNetCents > 0 ? "+" : ""}
                  />
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted uppercase">
                  Patrimônio Final Estimado
                </span>
                <p className="text-lg sm:text-xl font-extrabold tabular text-foreground mt-0.5">
                  <MoneyText cents={activeProjectionData.summary.finalBalanceCents} />
                </p>
              </div>
            </div>
          )}

          {/* Gráfico de Linha/Área da Projeção */}
          <div className="w-full h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeProjectionData.points}
                margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A3C5EB" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#A3C5EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis
                  dataKey="label"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatCompactCurrency}
                  dx={-4}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload as (typeof activeProjectionData.points)[0];
                    return (
                      <div className="p-3.5 rounded-xl bg-surface/95 border border-border shadow-xl backdrop-blur-md min-w-[200px] text-xs space-y-1.5">
                        <p className="font-bold text-foreground text-sm border-b border-border/60 pb-1">
                          {data.label} (Mês Projetado)
                        </p>
                        <div className="flex items-center justify-between text-income">
                          <span>Ganho Esperado:</span>
                          <span className="font-bold tabular">
                            {formatCurrency(data.projectedIncomeCents)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-expense">
                          <span>Gasto Esperado:</span>
                          <span className="font-bold tabular">
                            {formatCurrency(data.projectedExpenseCents)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-powder font-semibold border-t border-border/40 pt-1">
                          <span>Sobra no Mês:</span>
                          <span className="tabular">
                            {formatCurrency(data.projectedNetCents)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-foreground font-bold">
                          <span>Saldo Acumulado:</span>
                          <span className="tabular">
                            {formatCurrency(data.accumulatedBalanceCents)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="accumulatedReais"
                  name="Saldo Patrimonial Acumulado"
                  stroke="#A3C5EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#balanceGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="incomeReais"
                  name="Receita Mensal Esperada"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#22C55E" }}
                />
                <Line
                  type="monotone"
                  dataKey="expenseReais"
                  name="Despesa Mensal Esperada"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#EF4444" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: GRÁFICO DE PIZZA (QUE CATEGORIA GASTA MAIS) + RANKING DE ESTABELECIMENTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO DE PIZZA / DONUT INTERATIVO DE CATEGORIAS */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-powder" />
                <CardTitle className="text-base sm:text-lg">
                  Gastos por Categoria (Gráfico de Pizza)
                </CardTitle>
              </div>
              <Badge variant="neutral" size="sm">
                {analytics.categoryBreakdown.length} categorias
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Passe o mouse sobre as fatias para inspecionar valores e percentuais em tempo real
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between pt-2">
            {pieChartData.length === 0 ? (
              <div className="p-12 text-center text-muted text-sm my-auto">
                Nenhuma despesa categorizada no mês selecionado.
              </div>
            ) : (
              <>
                {/* Gráfico de Pizza SVG Recharts */}
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="transparent"
                            style={{
                              transform:
                                activePieIndex === index ? "scale(1.05)" : "scale(1)",
                              transformOrigin: "center center",
                              transition: "transform 0.2s ease-in-out",
                              cursor: "pointer",
                            }}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const data = payload[0].payload as (typeof pieChartData)[0];
                          return (
                            <div className="p-3 rounded-xl bg-surface/95 border border-border shadow-xl backdrop-blur-md text-xs space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: data.color }}
                                />
                                <span className="font-bold text-foreground text-sm">
                                  {data.name}
                                </span>
                              </div>
                              <p className="font-extrabold text-base tabular text-foreground">
                                {formatCurrency(data.cents)}
                              </p>
                              <p className="text-[11px] text-muted">
                                {data.percentage}% do total de gastos ({data.count}x)
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista Legenda Interativa das Categorias */}
                <div className="space-y-2 mt-4 max-h-56 overflow-y-auto pr-1">
                  {analytics.categoryBreakdown.map((cat, idx) => (
                    <div
                      key={cat.categoryId}
                      onMouseEnter={() => setActivePieIndex(idx)}
                      onMouseLeave={() => setActivePieIndex(null)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        activePieIndex === idx
                          ? "bg-surface-hover border-powder shadow-2xs"
                          : "bg-background/60 border-border/70 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.categoryColor }}
                        />
                        <span className="text-sm font-semibold text-foreground truncate">
                          {cat.categoryName}
                        </span>
                        <span className="text-xs text-muted shrink-0 hidden sm:inline">
                          ({cat.transactionCount}x)
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold tabular text-foreground">
                          {formatCurrency(cat.totalCents)}
                        </span>
                        <span className="text-[11px] text-muted ml-1.5 font-medium">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ONDE VOCÊ MAIS GASTA (Ranking de Estabelecimentos) */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-naples" />
                <CardTitle className="text-base sm:text-lg">
                  Onde você mais gasta (Estabelecimentos)
                </CardTitle>
              </div>
              <Badge variant="neutral" size="sm">
                Top 10
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Locais, lojas, restaurantes e destinatários de Pix com maior volume
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 space-y-2.5 pt-2">
            {analytics.topMerchants.length === 0 ? (
              <div className="p-12 text-center text-muted text-sm my-auto">
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
                        • {merchant.transactionCount} compra(s)
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

                  {/* Barra de Progresso Relativo */}
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
      </div>

      {/* SEÇÃO 3: GRÁFICO HISTÓRICO DE BARRAS DOS ÚLTIMOS 6 MESES (BI) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <CardTitle className="text-base sm:text-lg">
                Evolução Histórica Real (Últimos 6 Meses)
              </CardTitle>
            </div>
            <Badge variant="neutral" size="sm">
              BI Comparativo
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Acompanhe a relação real entre receitas recebidas e despesas pagas mês a mês
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={historyBarData}
                margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis
                  dataKey="label"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatCompactCurrency}
                  dx={-4}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload as (typeof historyBarData)[0];
                    return (
                      <div className="p-3.5 rounded-xl bg-surface/95 border border-border shadow-xl backdrop-blur-md min-w-[190px] text-xs space-y-1.5">
                        <p className="font-bold text-foreground text-sm border-b border-border/60 pb-1">
                          {data.label} (Histórico Real)
                        </p>
                        <div className="flex items-center justify-between text-income">
                          <span>Receitas:</span>
                          <span className="font-bold tabular">
                            {formatCurrency(data.receitasCents)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-expense">
                          <span>Despesas:</span>
                          <span className="font-bold tabular">
                            {formatCurrency(data.despesasCents)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-foreground font-bold border-t border-border/40 pt-1">
                          <span>Sobra Real:</span>
                          <span className="tabular">
                            {formatCurrency(data.sobraCents)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                />
                <Bar
                  dataKey="receitas"
                  name="Receitas Recebidas"
                  fill="#22C55E"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="despesas"
                  name="Despesas Pagas"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
