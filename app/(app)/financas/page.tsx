"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { formatDateShort } from "@/utils/format";
import { mockSalaryHistory } from "@/mocks/salarios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MoneyText } from "@/components/ui/MoneyText";
import { QuickTransactionModal } from "@/components/financas/QuickTransactionModal";
import {
  getTransactionsAction,
  toggleTransactionStatusAction,
  deleteTransactionAction,
} from "@/actions/transacoes";
import { generateForecastsAction } from "@/actions/recorrencias";
import { getCategoriesAction } from "@/actions/categorias";
import type { Category, Transaction } from "@/types/types";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Briefcase,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function FinancasPage() {
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Inicializa mês atual (YYYY-MM) no cliente
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${y}-${m}`);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentMonth) return;
    try {
      setIsLoading(true);
      // Assegura geração automática de previsões em segundo plano
      await generateForecastsAction(currentMonth).catch(console.error);

      const [txList, catList] = await Promise.all([
        getTransactionsAction({ month: currentMonth }),
        getCategoriesAction(),
      ]);
      setTransactions(txList);
      setCategories(catList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar dados";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);


  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navegação entre meses
  const handlePrevMonth = () => {
    if (!currentMonth) return;
    const [y, m] = currentMonth.split("-").map(Number);
    const date = new Date(y, m - 2, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    if (!currentMonth) return;
    const [y, m] = currentMonth.split("-").map(Number);
    const date = new Date(y, m, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${newY}-${newM}`);
  };

  // Alterna status pago/pendente
  const handleToggleStatus = async (id: string) => {
    try {
      const res = await toggleTransactionStatusAction(id);
      toast.success(
        res.newStatus === "paid" ? "Marcado como pago!" : "Marcado como pendente!"
      );
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar status";
      toast.error(msg);
    }
  };

  // Excluir lançamento
  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Deseja realmente excluir "${description}"?`)) return;
    try {
      await deleteTransactionAction(id);
      toast.success("Lançamento excluído!");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir lançamento";
      toast.error(msg);
    }
  };

  // Nome formatado do mês (Ex: Outubro de 2026)
  const monthLabel = React.useMemo(() => {
    if (!currentMonth) return "";
    const [y, m] = currentMonth.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    const str = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [currentMonth]);

  // Filtro de transações por status
  const filteredTransactions = transactions.filter((tx) => {
    if (statusFilter === "paid") return tx.status === "paid";
    if (statusFilter === "pending") return tx.status === "pending";
    return true;
  });

  // Totais do mês
  const totalIncomeCents = transactions
    .filter((tx) => tx.type === "income" && tx.status === "paid")
    .reduce((sum, tx) => sum + tx.amountCents, 0);

  const totalExpenseCents = transactions
    .filter((tx) => tx.type === "expense" && tx.status === "paid")
    .reduce((sum, tx) => sum + tx.amountCents, 0);

  const monthBalanceCents = totalIncomeCents - totalExpenseCents;

  const getCategory = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header com Navegação de Mês e Ações */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground font-display font-black tracking-tight">
            Finanças
          </h1>
          <p className="text-sm text-muted mt-1">
            Lançamentos, controle de despesas e evolução da renda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Mês */}
          <div className="flex items-center bg-surface border border-border rounded-xl px-2 py-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-background rounded-lg text-muted hover:text-foreground transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-foreground px-3 min-w-[140px] text-center">
              {monthLabel || "Carregando..."}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-background rounded-lg text-muted hover:text-foreground transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Link Destacado para Recorrências */}
          <Link href="/financas/recorrencias">
            <Button
              variant="outline"
              size="sm"
              className="border-navy/30 dark:border-naples/30 bg-surface hover:bg-surface/80"
              title="Gerenciar despesas e receitas fixas recorrentes (Salário, Aluguel...)"
            >
              <CalendarClock className="w-3.5 h-3.5 text-navy dark:text-naples mr-1.5" />
              <span>Contas Fixas & Recorrências</span>
            </Button>
          </Link>

          {/* Botão Novo Lançamento */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </Button>
        </div>
      </header>


      {/* Cards de Resumo do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Receitas Pagas</span>
            <div className="w-7 h-7 rounded-full bg-income/10 text-income flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold tabular text-income mt-2">
            <MoneyText cents={totalIncomeCents} prefix="+" />
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Despesas Pagas</span>
            <div className="w-7 h-7 rounded-full bg-expense/10 text-expense flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold tabular text-foreground mt-2">
            <MoneyText cents={totalExpenseCents} prefix="-" />
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">Balanço do Mês</span>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                monthBalanceCents >= 0
                  ? "bg-income/10 text-income"
                  : "bg-expense/10 text-expense"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-xl font-extrabold tabular mt-2 ${
              monthBalanceCents >= 0 ? "text-income" : "text-expense"
            }`}
          >
            <MoneyText
              cents={monthBalanceCents}
              prefix={monthBalanceCents > 0 ? "+" : ""}
            />
          </p>
        </div>
      </div>

      {/* Card em Destaque: Contas Fixas e Recorrências */}
      <Card className="border-navy/20 dark:border-naples/30 bg-gradient-to-r from-surface via-surface to-accent/10">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-navy/10 text-navy dark:bg-naples/20 dark:text-naples flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Contas Fixas & Recorrências Mensais
                </h3>
                <Badge variant="forecast" size="sm">
                  5º dia útil / Fixos
                </Badge>
              </div>
              <p className="text-xs text-muted mt-0.5 max-w-xl">
                Seu salário CLT (5º dia útil), aluguel, condomínio, internet e assinaturas mensais são projetados automaticamente no calendário e finanças.
              </p>
            </div>
          </div>

          <Link href="/financas/recorrencias" className="shrink-0 self-start sm:self-auto">
            <Button variant="primary" size="sm">
              <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
              Configurar Recorrências
            </Button>
          </Link>
        </CardContent>
      </Card>


      {/* Card de Evolução Salarial / Histórico de Renda */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-navy dark:text-naples" />
              <CardTitle>Histórico e Evolução Salarial</CardTitle>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-income/10 text-income border border-income/20">
              Renda Atual:{" "}
              <MoneyText
                cents={mockSalaryHistory[mockSalaryHistory.length - 1].amountCents}
              />
            </span>
          </div>
          <CardDescription>
            Acompanhe o crescimento da sua renda ao longo do tempo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {mockSalaryHistory.map((rec) => {
              const isCurrent = rec.endDate === null;

              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-accent/10 border-accent/40 shadow-2xs"
                      : "bg-surface/50 border-border/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted truncate">
                      {rec.company}
                    </span>
                    <Badge variant={isCurrent ? "success" : "neutral"} size="sm">
                      {isCurrent ? "Atual" : "Anterior"}
                    </Badge>
                  </div>

                  <p className="text-sm font-bold text-foreground">{rec.title}</p>
                  <p className="text-xl font-extrabold tabular text-navy dark:text-aurora mt-1">
                    <MoneyText cents={rec.amountCents} />
                  </p>

                  <p className="text-[11px] text-muted mt-2">
                    {rec.startDate.split("-")[0]} -{" "}
                    {rec.endDate ? rec.endDate.split("-")[0] : "Presente"}
                  </p>
                  {rec.notes && (
                    <p className="text-[11px] text-muted/80 mt-1 italic">
                      {rec.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Transações do Mês */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Lançamentos de {monthLabel}</CardTitle>
              <CardDescription>
                {filteredTransactions.length} movimentação(ões) encontrada(s)
              </CardDescription>
            </div>

            {/* Filtros de Status */}
            <div className="flex items-center gap-1 p-1 bg-background rounded-xl border border-border text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === "all"
                    ? "bg-surface text-foreground shadow-2xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter("paid")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === "paid"
                    ? "bg-income/15 text-income shadow-2xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Pagos
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === "pending"
                    ? "bg-warning/15 text-warning shadow-2xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Pendentes
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted">
              Carregando lançamentos...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              Nenhum lançamento encontrado em {monthLabel}.
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus className="w-4 h-4" /> Criar Lançamento
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredTransactions.map((tx) => {
                const category = getCategory(tx.categoryId);
                const isIncome = tx.type === "income";
                const isTransfer = tx.type === "transfer";
                const isPaid = tx.status === "paid";

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 sm:px-6 hover:bg-surface/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isIncome
                            ? "bg-income/10 text-income"
                            : isTransfer
                            ? "bg-powder/30 text-navy dark:text-powder"
                            : "bg-expense/10 text-expense"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : isTransfer ? (
                          <ArrowLeftRight className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {tx.description}
                          </p>
                          {tx.installmentNumber && (
                            <span className="text-[11px] font-medium text-muted bg-border/40 px-1.5 py-0.5 rounded-md">
                              {tx.installmentNumber}/{tx.installmentTotal}
                            </span>
                          )}
                          {tx.isForecast && (
                            <Badge variant="forecast" size="sm">
                              Previsto
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {formatDateShort(tx.date)} ·{" "}
                          {category ? category.name : isTransfer ? "Transferência" : "Sem categoria"}
                          {category?.systemKey === "wedding" && " 💍"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
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

                        <button
                          onClick={() => handleToggleStatus(tx.id)}
                          className="mt-1 inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                          title="Clique para alternar status"
                        >
                          <Badge
                            variant={isPaid ? "success" : "warning"}
                            size="sm"
                          >
                            {isPaid ? (
                              <CheckCircle2 className="w-3 h-3 mr-0.5" />
                            ) : (
                              <Clock className="w-3 h-3 mr-0.5" />
                            )}
                            {isPaid ? "Pago" : "Pendente"}
                          </Badge>
                        </button>
                      </div>

                      {/* Botão de Excluir */}
                      <button
                        onClick={() => handleDelete(tx.id, tx.description)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-expense hover:bg-expense/10 rounded-lg transition-all"
                        title="Excluir lançamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Lançamento Rápido */}
      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
