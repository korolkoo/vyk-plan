"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MoneyText } from "@/components/ui/MoneyText";
import { getDashboardDataAction, type DashboardData } from "@/actions/dashboard";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  Gem,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getDashboardDataAction();
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar dashboard";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading || !data) {
    return (
      <div className="py-24 text-center text-sm text-muted animate-pulse">
        Carregando painel financeiro...
      </div>
    );
  }

  const { user, monthLabel, metrics, availability, wedding, cards, recentTransactions } = data;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Boas-vindas Minimalista */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-muted">
            Visão Geral · {monthLabel}
          </span>
          <h1 className="text-3xl sm:text-4xl text-foreground font-display font-black tracking-tight mt-1">
            Olá, {user.name}
          </h1>
        </div>
      </header>

      {/* Grid de Balanço e Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Saldo em Contas (Alice Yellow) */}
        <Card variant="alice" className="relative overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Saldo em Contas
            </span>
            <p className="text-3xl font-extrabold tabular text-navy dark:text-aurora">
              <MoneyText cents={metrics.totalBalanceCents} />
            </p>
            <p className="text-xs text-muted">
              Distribuído em {metrics.activeAccountsCount} conta(s) ativa(s)
            </p>
          </CardContent>
        </Card>

        {/* Receitas Recebidas */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Receitas Recebidas
              </span>
              <TrendingUp className="w-4 h-4 text-income" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold tabular text-income">
              <MoneyText cents={metrics.incomePaidCents} prefix="+" />
            </p>
            <p className="text-xs text-muted">Salário e rendimentos no mês</p>
          </CardContent>
        </Card>

        {/* Despesas Pagas */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Despesas Pagas
              </span>
              <TrendingDown className="w-4 h-4 text-expense" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold tabular text-foreground">
              <MoneyText cents={metrics.expensePaidCents} prefix="-" />
            </p>
            <p className="text-xs text-muted">Contas e compras liquidadas</p>
          </CardContent>
        </Card>

        {/* Contas a Pagar / Pendentes */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                A Pagar (Pendentes)
              </span>
              <Badge variant="warning" size="sm">
                Atenção
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-bold tabular text-expense">
              <MoneyText cents={metrics.expensePendingCents} />
            </p>
            <p className="text-xs text-muted">Previsões e contas em aberto</p>
          </CardContent>
        </Card>
      </div>

      {/* DISPONIBILIDADE REAL DO DINHEIRO (Ponto 3) */}
      <Card className="border-border/80 bg-gradient-to-br from-surface to-surface/40 overflow-hidden shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-lg">Disponibilidade Real do Dinheiro</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                O que você realmente tem livre para gastar após descontar metas, faturas de cartão e contas pendentes.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Saldo Realmente Livre:
              </span>
              <span className="text-lg font-extrabold tabular text-emerald-600 dark:text-emerald-400">
                <MoneyText cents={availability.availableFreeCents} />
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barra Segmentada Visual */}
          <div className="space-y-1.5">
            <div className="w-full h-3.5 rounded-full bg-border overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${availability.freePercentage}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Saldo Livre: ${availability.freePercentage}%`}
              />
              <div
                style={{ width: `${availability.goalsPercentage}%` }}
                className="bg-navy dark:bg-powder h-full transition-all"
                title={`Metas & Gastos Futuros: ${availability.goalsPercentage}%`}
              />
              <div
                style={{ width: `${availability.weddingPercentage}%` }}
                className="bg-naples h-full transition-all"
                title={`Casamento: ${availability.weddingPercentage}%`}
              />
              <div
                style={{ width: `${availability.obligationsPercentage}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Faturas & Contas: ${availability.obligationsPercentage}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>0%</span>
              <span className="font-semibold text-foreground">
                {availability.freePercentage}% do seu dinheiro está livre ({formatCurrency(availability.availableFreeCents)})
              </span>
              <span>100%</span>
            </div>
          </div>

          {/* Grid dos Blocos de Dedução */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-[10px] text-muted uppercase font-semibold block">
                1. Saldo em Contas
              </span>
              <span className="text-sm font-bold tabular text-foreground block mt-0.5">
                <MoneyText cents={availability.totalBalanceCents} />
              </span>
              <span className="text-[10px] text-muted">Total bruto</span>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-[10px] text-muted uppercase font-semibold block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-navy dark:bg-powder shrink-0" /> Metas & Futuro
              </span>
              <span className="text-sm font-bold tabular text-foreground block mt-0.5">
                -<MoneyText cents={availability.goalsReserveCents} />
              </span>
              <span className="text-[10px] text-muted">Faculdade / Reservas ({availability.goalsPercentage}%)</span>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-[10px] text-muted uppercase font-semibold block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-naples shrink-0" /> Casamento
              </span>
              <span className="text-sm font-bold tabular text-accent-foreground dark:text-naples block mt-0.5">
                -<MoneyText cents={availability.weddingReserveCents} />
              </span>
              <span className="text-[10px] text-muted">Cofrinho ({availability.weddingPercentage}%)</span>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-[10px] text-muted uppercase font-semibold block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" /> Faturas & Contas
              </span>
              <span className="text-sm font-bold tabular text-expense block mt-0.5">
                -<MoneyText cents={availability.openInvoicesCents + availability.pendingExpensesCents} />
              </span>
              <span className="text-[10px] text-muted">Cartões + boletos abertos</span>
            </div>
          </div>

          {/* Detalhamento das Deduções (Cartões Atrelados e Metas/Compromissos) */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            {/* Faturas dos Cartões Atrelados */}
            {availability.cardsInvoicesList && availability.cardsInvoicesList.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted font-medium flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-expense" />
                  Faturas atreladas:
                </span>
                {availability.cardsInvoicesList.map((card) => (
                  <Link
                    key={card.id}
                    href={`/cartoes/${card.id}`}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface border border-border hover:border-foreground/30 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: card.color }}
                    />
                    <span className="font-semibold text-foreground">{card.name}:</span>
                    <span className="font-bold tabular text-expense">
                      <MoneyText cents={card.openInvoiceCents} />
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Metas & Compromissos Futuros (Faculdade, Emergência...) */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted font-medium">
                  Metas & Gastos Futuros protegidos:
                </span>
                {availability.goalsList && availability.goalsList.length > 0 ? (
                  availability.goalsList.map((g) => (
                    <Link
                      key={g.id}
                      href="/metas"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface border border-border hover:border-foreground/30 transition-colors"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      <span className="font-semibold text-foreground">{g.name}:</span>
                      <span className="font-bold tabular text-foreground">
                        <MoneyText cents={g.currentCents} />
                      </span>
                    </Link>
                  ))
                ) : (
                  <span className="text-muted italic">Nenhuma reserva ativa</span>
                )}
              </div>

              <Link
                href="/metas"
                className="text-[11px] font-semibold text-navy dark:text-naples hover:underline flex items-center gap-1"
                title="Cadastre gastos futuros (ex: Faculdade em 6 meses, IPVA) para retirar do saldo livre"
              >
                + Proteger Gasto Futuro / Meta
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Destaque Compartilhado: Casamento Yuri & Vithória */}
      <Card
        interactive
        className="bg-gradient-to-r from-surface via-surface to-accent/10 border-accent/30"
      >
        <Link href="/casamento" className="block p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/30 text-accent-foreground text-xs font-bold">
                  <Gem className="w-3.5 h-3.5" />
                  <span>Casamento Yuri & Vithória</span>
                </span>
                <span className="text-xs text-muted">
                  Ambiente Compartilhado
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                  {wedding.weddingDate
                    ? `Faltam ${wedding.daysRemaining} dias para o grande dia`
                    : "Planejamento do Casamento"}
                </h3>
                <p className="text-sm text-muted mt-1">
                  Reserva acumulada de <MoneyText cents={wedding.reserveCents} /> e {wedding.progressPercentage}% do orçamento garantido.
                </p>
              </div>

              <div className="max-w-md pt-1">
                <ProgressBar
                  value={wedding.progressPercentage}
                  size="md"
                  color="accent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:block text-right">
                <p className="text-xs text-muted">Total Comprometido</p>
                <p className="text-lg font-bold tabular text-foreground">
                  <MoneyText cents={wedding.committedCents} />
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-xs">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Link>
      </Card>

      {/* Grid: Últimos Lançamentos + Faturas de Cartão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lançamentos Recentes (2 colunas no desktop) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Últimas Movimentações
            </h2>
            <Link
              href="/financas"
              className="text-xs font-semibold text-navy dark:text-naples hover:underline flex items-center gap-1"
            >
              Ver tudo
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted space-y-3">
                  <p>Nenhuma transação recente registrada.</p>
                  <Link
                    href="/financas"
                    className="inline-flex items-center gap-2 text-xs font-bold text-navy dark:text-naples hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Criar primeiro lançamento
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentTransactions.map((tx) => {
                    const isIncome = tx.type === "income";

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 sm:px-6 hover:bg-surface/50 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              isIncome
                                ? "bg-income/10 text-income"
                                : "bg-expense/10 text-expense"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {tx.description}
                            </p>
                            <p className="text-xs text-muted">
                              {formatDateShort(tx.date)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold tabular ${
                              isIncome ? "text-income" : "text-foreground"
                            }`}
                          >
                            <MoneyText
                              cents={tx.amountCents}
                              prefix={isIncome ? "+" : "-"}
                            />
                          </p>
                          <Badge
                            variant={tx.status === "paid" ? "success" : "warning"}
                            size="sm"
                          >
                            {tx.status === "paid" ? "Liquidado" : "Pendente"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Faturas de Cartão (1 coluna no desktop) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Cartões de Crédito
            </h2>
            <Link
              href="/cartoes"
              className="text-xs font-semibold text-navy dark:text-naples hover:underline flex items-center gap-1"
            >
              Gerenciar
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {cards.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-xs text-muted">
                  Nenhum cartão cadastrado ainda.
                </CardContent>
              </Card>
            ) : (
              cards.map((c) => (
                <Card key={c.id} interactive>
                  <Link href={`/cartoes/${c.id}`} className="block p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                          style={{ backgroundColor: c.color }}
                        >
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted">
                            Vence dia {c.dueDay}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted">Fatura Aberta</p>
                        <p className="text-base font-bold tabular text-foreground">
                          <MoneyText cents={c.openInvoiceCents} />
                        </p>
                      </div>
                    </div>
                  </Link>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-24 text-center text-sm text-muted animate-pulse">
          Carregando painel financeiro...
        </div>
      }
    >
      <DashboardContent />
    </React.Suspense>
  );
}
