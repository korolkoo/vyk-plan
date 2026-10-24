"use client";

import React from "react";
import Link from "next/link";
import {
  calculatePercentage,
  formatCurrency,
  formatDateShort,
  getDaysRemaining,
} from "@/utils/format";
import {
  mockBankAccounts,
  mockCreditCards,
  mockInvoices,
  mockTransactions,
} from "@/mocks/financas";
import {
  mockWeddingSettings,
  mockWeddingSummary,
} from "@/mocks/casamento";
import { mockCurrentUser } from "@/mocks/usuarios";
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
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  Gem,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  // Cálculos do mês (Outubro 2026)
  const totalBalance = mockBankAccounts.reduce(
    (acc, b) => acc + b.currentBalanceCents,
    0
  );

  const incomePaid = mockTransactions
    .filter((tx) => tx.type === "income" && tx.status === "paid")
    .reduce((acc, tx) => acc + tx.amountCents, 0);

  const expensePaid = mockTransactions
    .filter((tx) => tx.type === "expense" && tx.status === "paid")
    .reduce((acc, tx) => acc + tx.amountCents, 0);

  const expensePending = mockTransactions
    .filter((tx) => tx.type === "expense" && tx.status === "pending")
    .reduce((acc, tx) => acc + tx.amountCents, 0);

  // Cartão com fatura aberta
  const openInvoicesTotal = mockInvoices
    .filter((inv) => inv.status === "open" || inv.status === "closed")
    .reduce((acc, inv) => acc + inv.totalCents, 0);

  // Casamento
  const [daysRemaining, setDaysRemaining] = React.useState<number>(0);

  React.useEffect(() => {
    if (mockWeddingSettings.weddingDate) {
      setDaysRemaining(getDaysRemaining(mockWeddingSettings.weddingDate));
    }
  }, []);

  const totalCommitted = mockWeddingSummary.committedCents;
  const totalCovered =
    mockWeddingSummary.paidCents + mockWeddingSummary.reserveCents;
  const weddingProgressPct = calculatePercentage(totalCovered, totalCommitted);

  // Últimas 5 transações
  const recentTransactions = [...mockTransactions].slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Boas-vindas Minimalista */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-muted">
            Visão Geral · Outubro de 2026
          </span>
          <h1 className="text-3xl sm:text-4xl text-foreground font-bold tracking-tight mt-1">
            Olá, {mockCurrentUser.name}
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
              <MoneyText cents={totalBalance} />
            </p>
            <p className="text-xs text-muted">
              Distribuído em {mockBankAccounts.length} contas ativas
            </p>
          </CardContent>
        </Card>

        {/* Receitas do Mês */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Receitas Recebidas
              </span>
              <TrendingUp className="w-4 h-4 text-income" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold tabular text-income">
              <MoneyText cents={incomePaid} prefix="+" />
            </p>
            <p className="text-xs text-muted">Salário e rendimentos</p>
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
              <MoneyText cents={expensePaid} prefix="-" />
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
              <MoneyText cents={expensePending} />
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
                  Faltam {daysRemaining} dias para o grande dia
                </h3>
                <p className="text-sm text-muted mt-1">
                  Reserva acumulada de {formatCurrency(mockWeddingSummary.reserveCents)} e {weddingProgressPct}% dos contratos já garantidos.
                </p>
              </div>

              <div className="max-w-md pt-1">
                <ProgressBar
                  value={weddingProgressPct}
                  size="md"
                  color="accent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:block text-right">
                <p className="text-xs text-muted">Total Comprometido</p>
                <p className="text-lg font-bold tabular text-foreground">
                  {formatCurrency(totalCommitted)}
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
                          {isIncome ? "+" : isTransfer ? "" : "-"}
                          {formatCurrency(tx.amountCents)}
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
            {mockCreditCards.map((card) => {
              const invoice = mockInvoices.find(
                (inv) => inv.creditCardId === card.id && inv.status === "open"
              );

              return (
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
                        {invoice ? formatCurrency(invoice.totalCents) : "R$ 0,00"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
