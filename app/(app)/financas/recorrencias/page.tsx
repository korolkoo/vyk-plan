"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MoneyText } from "@/components/ui/MoneyText";
import { RecurrenceModal } from "@/components/financas/RecurrenceModal";
import {
  getRecurrencesAction,
  toggleRecurrenceActiveAction,
  deleteRecurrenceAction,
  generateForecastsAction,
} from "@/actions/recorrencias";
import { getCategoriesAction } from "@/actions/categorias";
import type { Category, Recurrence } from "@/types/types";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  CalendarClock,
  Plus,
  Sparkles,
  Trash2,
  Power,
  Edit3,
  Bus,
} from "lucide-react";


export default function RecorrenciasPage() {
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecurrence, setEditingRecurrence] = useState<Recurrence | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingRecurrence, setDeletingRecurrence] = useState<Recurrence | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);



  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [recs, cats] = await Promise.all([
        getRecurrencesAction(),
        getCategoriesAction(),
      ]);
      setRecurrences(recs);
      setCategories(cats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar dados";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Alterna ativa / pausada
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await toggleRecurrenceActiveAction(id, !currentActive);
      toast.success(!currentActive ? "Recorrência ativada!" : "Recorrência pausada!");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar";
      toast.error(msg);
    }
  };

  // Excluir recorrência confirmada via modal
  const handleConfirmDelete = async () => {
    if (!deletingRecurrence) return;
    try {
      setIsDeleting(true);
      await deleteRecurrenceAction(deletingRecurrence.id);
      toast.success("Recorrência removida com sucesso!");
      setDeletingRecurrence(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir recorrência";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };


  // Gerar lançamentos previstos para o mês atual
  const handleGenerateThisMonth = async () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
      setIsGenerating(true);
      const res = await generateForecastsAction(currentMonth);
      if (res.count > 0) {
        toast.success(`${res.count} previsões geradas para o mês corrente!`);
      } else {
        toast("Todas as recorrências ativas já possuem lançamentos gerados neste mês.", {
          icon: "ℹ️",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar previsões";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategory = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/financas"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Finanças
            </Link>
          </div>
          <h1 className="text-3xl text-foreground font-display font-black tracking-tight flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-navy dark:text-naples" />
            Recorrências
          </h1>
          <p className="text-sm text-muted mt-1">
            Contas fixas, salários e assinaturas que geram previsões automáticas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateThisMonth}
            isLoading={isGenerating}
            title="Gera previsões para o mês atual com base nas regras ativas"
          >
            <Sparkles className="w-3.5 h-3.5 text-naples" />
            Gerar Previsões do Mês
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Nova Recorrência
          </Button>
        </div>
      </header>

      {/* Lista de Recorrências */}
      <Card>
        <CardHeader>
          <CardTitle>Regras de Recorrência Cadastradas</CardTitle>
          <CardDescription>
            {recurrences.length} regra(s) ativa(s) ou pausada(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted">
              Carregando regras...
            </div>
          ) : recurrences.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              Nenhuma recorrência cadastrada ainda.
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus className="w-4 h-4" /> Cadastrar Primeira Recorrência
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recurrences.map((rec) => {
                const category = getCategory(rec.categoryId);
                const isIncome = rec.type === "income";

                return (
                  <div
                    key={rec.id}
                    className={`flex items-center justify-between p-4 sm:px-6 hover:bg-surface/50 transition-colors group ${
                      !rec.active ? "opacity-60 bg-muted/5" : ""
                    }`}
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {rec.description}
                          </p>
                          <Badge
                            variant={rec.active ? "success" : "neutral"}
                            size="sm"
                          >
                            {rec.active ? "Ativa" : "Pausada"}
                          </Badge>
                          {rec.calculationMode === "per_day" && (
                            <Badge variant="forecast" size="sm">
                              Diária (Seg-Qui)
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {rec.calculationMode === "per_day" ? (
                            <>
                              R$ {((rec.dailyRateCents || rec.amountCents) / 100).toFixed(2).replace(".", ",")}/dia · Vence dia {rec.dayOfMonth} (mês seguinte) · Isento: Jan e Fev
                            </>
                          ) : rec.dayOfMonth === 0 ? (
                            "5º dia útil do mês (Salário CLT)"
                          ) : (
                            `Todo dia ${rec.dayOfMonth}`
                          )}{" "}
                          · {category?.name ?? "Sem categoria"}
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
                          {rec.calculationMode === "per_day" ? (
                            <span className="text-xs text-muted font-normal block">
                              Cálculo dinâmico
                            </span>
                          ) : (
                            <MoneyText
                              cents={rec.amountCents}
                              prefix={isIncome ? "+" : "-"}
                            />
                          )}
                        </p>

                        <button
                          onClick={() => handleToggleActive(rec.id, rec.active)}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground transition-colors"
                          title="Alternar ativação"
                        >
                          <Power className="w-3 h-3" />
                          {rec.active ? "Pausar" : "Ativar"}
                        </button>
                      </div>

                      {/* Botão de Editar */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRecurrence(rec);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-muted hover:text-foreground hover:bg-surface rounded-xl transition-all"
                        title="Editar regra de recorrência"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Botão de Excluir com Confirmação Segura */}
                      <button
                        type="button"
                        onClick={() => setDeletingRecurrence(rec)}
                        className="p-2 text-muted hover:text-expense hover:bg-expense/10 rounded-xl transition-all"
                        title="Remover regra de recorrência"
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

      {/* Modal de Criação / Edição de Recorrência */}
      <RecurrenceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecurrence(null);
        }}
        recurrenceToEdit={editingRecurrence}
        onSuccess={loadData}
      />


      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={!!deletingRecurrence}
        onClose={() => setDeletingRecurrence(null)}
        title="Excluir Recorrência"
        description="Tem certeza que deseja remover esta regra de recorrência?"
        maxWidth="sm"
      >
        {deletingRecurrence && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1 text-sm">
              <p className="font-semibold text-foreground">
                {deletingRecurrence.description}
              </p>
              <p className="text-xs text-muted">
                Valor: <MoneyText cents={deletingRecurrence.amountCents} /> · {deletingRecurrence.dayOfMonth === 0 ? "5º dia útil" : `Todo dia ${deletingRecurrence.dayOfMonth}`}
              </p>
            </div>

            <p className="text-xs text-muted">
              Previsões automáticas pendentes geradas por esta regra também serão removidas do calendário e das finanças.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingRecurrence(null)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                Sim, Excluir Regra
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

