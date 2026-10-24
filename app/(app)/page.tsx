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
  TrendingDown,
  TrendingUp,
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

  const { user, monthLabel, metrics, wedding, cards, recentTransactions } = data;

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
              Últimos Lançamentos
            </h2>
            <Link
              href="/financas"
              className="text-xs font-medium text-navy dark:text-naples hover:underline inline-flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">
                  Nenhum lançamento registrado ainda.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentTransactions.map((tx) => {
                    const isIncome = tx.type === "income";
                    const isTransfer = tx.type === "transfer";

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 sm:px-5 hover:bg-surface/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isIncome
                                ? "bg-income/10 text-income"
                                : isTransfer
                                ? "bg-powder/30 text-navy dark:text-powder"
                                : "bg-expense/10 text-expense"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
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
                              prefix={isIncome ? "+" : isTransfer ? "" : "-"}
                            />
                          </p>
                          <Badge
                            variant={tx.status === "paid" ? "success" : "warning"}
                            size="sm"
                          >
                            {tx.status === "paid" ? "Pago" : "Pendente"}
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
              Faturas dos Cartões
            </h2>
            <Link
              href="/cartoes"
              className="text-xs font-medium text-navy dark:text-naples hover:underline inline-flex items-center gap-1"
            >
              <span>Detalhes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {cards.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted">
                  Nenhum cartão cadastrado.
                  <div className="mt-2">
                    <Link
                      href="/cartoes"
                      className="text-xs text-navy dark:text-naples font-bold hover:underline"
                    >
                      Cadastrar Cartão
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              cards.map((card) => (
                <Card key={card.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: card.color }}
                        />
                        <span className="text-sm font-semibold text-foreground">
                          {card.name}
                        </span>
                      </div>
                      <Badge variant="warning" size="sm">
                        Aberta
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs text-muted">
                        Vence dia {card.dueDay}
                      </span>
                      <span className="text-lg font-bold tabular text-foreground">
                        <MoneyText cents={card.openInvoiceCents} />
                      </span>
                    </div>
                  </CardContent>
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
          Carregando painel...
        </div>
      }
    >
      <DashboardContent />
    </React.Suspense>
  );
}
