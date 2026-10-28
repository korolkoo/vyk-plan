"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/ui/MoneyText";
import { QuickTransactionModal } from "@/components/financas/QuickTransactionModal";
import {
  toggleTransactionStatusAction,
  deleteCalendarTransactionAction,
  type CalendarEvent,
} from "@/actions/calendario";
import { updateTransactionAction } from "@/actions/transacoes";
import { toggleWeddingInstallmentPaidAction } from "@/actions/casamento";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  CreditCard as CardIcon,
  Gem,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

interface DayInteractiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  events: CalendarEvent[];
  onSuccess: () => void;
}

export function DayInteractiveModal({
  isOpen,
  onClose,
  date,
  events,
  onSuccess,
}: DayInteractiveModalProps) {
  // Modal de Novo Lançamento unificado (+ do app)
  const [isQuickTransactionOpen, setIsQuickTransactionOpen] = useState(false);

  // Estado para edição inline de lançamentos agendados
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmountInput, setEditAmountInput] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estado para exclusão via modal in-app
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditingEventId(null);
      setEventToDelete(null);
    }
  }, [isOpen]);

  const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/\D/g, "");
    return parseInt(cleaned, 10) || 0;
  };

  const handleToggleStatus = async (evt: CalendarEvent) => {
    try {
      if (evt.type === "wedding") {
        await toggleWeddingInstallmentPaidAction(evt.id, evt.status === "paid");
        toast.success(evt.status === "paid" ? "Parcela desmarcada" : "Parcela marcada como paga!");
      } else {
        const nextStatus = evt.status === "paid" ? "pending" : "paid";
        await toggleTransactionStatusAction(evt.id, nextStatus);
        toast.success(nextStatus === "paid" ? "Marcado como liquidado!" : "Marcado como pendente");
      }
      onSuccess();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteCalendarTransactionAction(eventToDelete.id);
      toast.success("Lançamento removido");
      setEventToDelete(null);
      onSuccess();
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const handleStartEdit = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    setEditDescription(evt.title);
    if (evt.amountCents !== undefined) {
      setEditAmountInput((evt.amountCents / 100).toFixed(2).replace(".", ","));
    } else {
      setEditAmountInput("");
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editDescription.trim()) {
      toast.error("Informe a descrição do lançamento");
      return;
    }
    const cents = parseCurrencyInput(editAmountInput);
    if (cents <= 0) {
      toast.error("Informe um valor válido maior que zero");
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateTransactionAction(id, {
        description: editDescription.trim(),
        amountCents: cents,
      });
      toast.success("Lançamento atualizado!");
      setEditingEventId(null);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar lançamento";
      toast.error(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [year, month, day] = date ? date.split("-") : ["", "", ""];
  const formattedDayTitle = `${day}/${month}/${year}`;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Compromissos de ${formattedDayTitle}`}
        description="Visualize e gerencie os compromissos agendados para este dia."
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* LISTA DE MOVIMENTAÇÕES DO DIA (PRIMEIRO) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-navy dark:text-naples" />
                <span>Movimentações do Dia ({events.length})</span>
              </span>
            </div>

            {events.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-background/50 space-y-2">
                <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mx-auto text-muted">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Nenhuma movimentação neste dia
                </p>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Toque no botão abaixo para adicionar uma receita, despesa ou compra no cartão nesta data.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {events.map((evt) => {
                  if (editingEventId === evt.id) {
                    return (
                      <div
                        key={evt.id}
                        className="p-3.5 rounded-xl border border-navy/30 dark:border-naples/40 bg-surface space-y-3 animate-in fade-in duration-150"
                      >
                        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5 text-navy dark:text-naples" />
                            Editar Lançamento
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingEventId(null)}
                            className="text-muted hover:text-foreground p-1 transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                              Descrição
                            </label>
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="text-xs h-9"
                              placeholder="Descrição do lançamento"
                              autoFocus
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                              Valor deste mês (R$)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-bold">
                                R$
                              </span>
                              <Input
                                type="text"
                                value={editAmountInput}
                                onChange={(e) => {
                                  const numeric = e.target.value.replace(/\D/g, "");
                                  if (!numeric) {
                                    setEditAmountInput("");
                                    return;
                                  }
                                  const cents = parseInt(numeric, 10);
                                  setEditAmountInput((cents / 100).toFixed(2).replace(".", ","));
                                }}
                                className="pl-8 tabular font-semibold text-xs h-9"
                                placeholder="0,00"
                              />
                            </div>
                            <p className="text-[10px] text-muted mt-1">
                              Permite reajustar o valor do mês (ex.: por dias de faltas ou recesso).
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/60">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingEventId(null)}
                            disabled={isSavingEdit}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => handleSaveEdit(evt.id)}
                            isLoading={isSavingEdit}
                          >
                            Salvar Alterações
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  const isClosing = evt.type === "card_closing";
                  const isDue = evt.type === "card_due";
                  const isWedding = evt.type === "wedding";
                  const isIncome = evt.type === "income";
                  const isTransaction = evt.type === "income" || evt.type === "expense";
                  const isPaid = evt.status === "paid";

                  return (
                    <div
                      key={evt.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        isPaid
                          ? "bg-surface/30 border-border opacity-70"
                          : "bg-surface border-border hover:border-foreground/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isTransaction || isWedding ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(evt)}
                            className="text-muted hover:text-foreground transition-colors shrink-0"
                            title={isPaid ? "Desmarcar (tornar pendente)" : "Marcar como liquidado"}
                          >
                            {isPaid ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isClosing
                                ? "bg-powder/30 text-navy dark:text-powder"
                                : "bg-warning/20 text-warning"
                            }`}
                          >
                            {isClosing ? <Sparkles className="w-4 h-4" /> : <CardIcon className="w-4 h-4" />}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-sm font-semibold text-foreground ${isPaid ? "line-through opacity-70" : ""}`}>
                              {evt.title}
                            </p>
                            {evt.isForecast && (
                              <Badge variant="forecast" size="sm">
                                Previsto
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted">
                            {isClosing
                              ? "Melhor dia para compras no cartão"
                              : isDue
                              ? "Vencimento da fatura do cartão"
                              : isWedding
                              ? "Parcela do casamento"
                              : isIncome
                              ? "Receita"
                              : "Despesa"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {evt.amountCents !== undefined && (
                            <p
                              className={`text-sm font-bold tabular ${
                                isIncome ? "text-income" : "text-foreground"
                              }`}
                            >
                              <MoneyText cents={evt.amountCents} prefix={isIncome ? "+" : "-"} />
                            </p>
                          )}
                          <span className={`text-[10px] font-semibold block ${isPaid ? "text-emerald-500" : "text-amber-500"}`}>
                            {isPaid ? "Liquidado" : "Pendente"}
                          </span>
                        </div>

                        {isTransaction && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(evt)}
                              className="p-1.5 text-muted hover:text-navy dark:hover:text-naples rounded-lg hover:bg-surface/80 transition-colors"
                              title="Editar valor / descrição deste mês"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEventToDelete(evt)}
                              className="p-1.5 text-muted hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BOTÃO DE NOVO LANÇAMENTO (EM BAIXO) */}
          <div className="pt-3 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => setIsQuickTransactionOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Fazer lançamento neste dia</span>
            </Button>
          </div>
        </div>

        {/* Modal In-App de Confirmação de Exclusão */}
        {eventToDelete && (
          <ConfirmModal
            isOpen={!!eventToDelete}
            onClose={() => setEventToDelete(null)}
            onConfirm={handleConfirmDelete}
            title="Excluir Lançamento"
            description={`Deseja realmente remover o lançamento "${eventToDelete.title}"? Esta ação não pode ser desfeita.`}
            confirmText="Excluir Lançamento"
            cancelText="Cancelar"
            variant="danger"
          />
        )}
      </Modal>

      {/* Modal Unificado de Novo Lançamento (mesmo do botão + do app) */}
      {isQuickTransactionOpen && (
        <QuickTransactionModal
          isOpen={isQuickTransactionOpen}
          onClose={() => setIsQuickTransactionOpen(false)}
          initialDate={date}
          onSuccess={() => {
            setIsQuickTransactionOpen(false);
            onSuccess();
          }}
        />
      )}
    </>
  );
}
