"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/ui/MoneyText";
import {
  toggleTransactionStatusAction,
  deleteCalendarTransactionAction,
  type CalendarEvent,
} from "@/actions/calendario";
import { createTransactionAction, updateTransactionAction } from "@/actions/transacoes";
import { createInstallmentPurchaseAction } from "@/actions/faturas";
import { createRecurrenceAction } from "@/actions/recorrencias";
import { toggleWeddingInstallmentPaidAction } from "@/actions/casamento";
import { getCategoriesAction } from "@/actions/categorias";
import { getAccountsAction } from "@/actions/contas";
import { getCreditCardsAction } from "@/actions/cartoes";
import type { Category, BankAccountWithBalance, CreditCardWithDetails } from "@/types/types";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  CreditCard as CardIcon,
  Gem,
  Pencil,
  Plus,
  Repeat,
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
  // Estado do modo de formulário
  const [formMode, setFormMode] = useState<"none" | "expense" | "income" | "card" | "recurrence">("none");
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [installments, setInstallments] = useState(1);
  const [isFifthBusinessDay, setIsFifthBusinessDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([]);
  const [cards, setCards] = useState<CreditCardWithDetails[]>([]);

  // Estado para edição inline de lançamentos agendados
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmountInput, setEditAmountInput] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormMode("none");
      setDescription("");
      setAmountInput("");
      setInstallments(1);
      setIsFifthBusinessDay(false);
      setEditingEventId(null);

      getCategoriesAction().then(setCategories).catch(console.error);
      getAccountsAction().then((accs) => {
        setAccounts(accs);
        if (accs.length > 0) setBankAccountId(accs[0].id);
      }).catch(console.error);
      getCreditCardsAction().then((c) => {
        setCards(c);
        if (c.length > 0) setCreditCardId(c[0].id);
      }).catch(console.error);
    }
  }, [isOpen]);

  const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/\D/g, "");
    return parseInt(cleaned, 10) || 0;
  };

  const handleCurrencyChange = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) {
      setAmountInput("");
      return;
    }
    const cents = parseInt(numeric, 10);
    setAmountInput((cents / 100).toFixed(2).replace(".", ","));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Informe a descrição do lançamento");
      return;
    }

    const amountCents = parseCurrencyInput(amountInput);
    if (amountCents <= 0) {
      toast.error("Informe um valor válido maior que zero");
      return;
    }

    setIsSubmitting(true);
    try {
      if (formMode === "card") {
        if (!creditCardId) {
          toast.error("Selecione um cartão de crédito");
          setIsSubmitting(false);
          return;
        }

        await createInstallmentPurchaseAction({
          creditCardId,
          description: description.trim(),
          totalAmountCents: amountCents,
          installmentsCount: installments,
          purchaseDate: date,
          categoryId: categoryId || null,
        });

        toast.success(
          installments > 1
            ? `Compra parcelada em ${installments}x registrada no cartão!`
            : "Despesa lançada na fatura do cartão!"
        );
      } else if (formMode === "recurrence") {
        const dayOfMonth = isFifthBusinessDay ? 0 : parseInt(date.split("-")[2], 10) || 5;

        await createRecurrenceAction({
          type: "expense",
          description: description.trim(),
          amountCents,
          frequency: "monthly",
          dayOfMonth,
          startDate: date,
          categoryId: categoryId || null,
          bankAccountId: bankAccountId || null,
        });

        toast.success("Recorrência mensal cadastrada!");
      } else {
        const type = formMode === "income" ? "income" : "expense";

        await createTransactionAction({
          type,
          amountCents,
          description: description.trim(),
          date,
          status: "pending",
          categoryId: categoryId || null,
          bankAccountId: bankAccountId || null,
        });

        toast.success(type === "income" ? "Receita adicionada!" : "Despesa adicionada!");
      }

      setFormMode("none");
      setDescription("");
      setAmountInput("");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
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

  const handleDelete = async (evt: CalendarEvent) => {
    if (!confirm(`Deseja realmente excluir "${evt.title}"?`)) return;
    try {
      await deleteCalendarTransactionAction(evt.id);
      toast.success("Lançamento removido");
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

  const filteredCategories = categories.filter((c) =>
    formMode === "income" ? c.kind === "income" : c.kind === "expense"
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Compromissos de ${formattedDayTitle}`}
      description="Escolha o que cadastrar ou gerencie os compromissos agendados nesta data."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* SELEÇÃO DO QUE CADASTRAR (PONTO 6) */}
        {formMode === "none" ? (
          <div className="p-4 bg-surface/70 rounded-2xl border border-border space-y-3">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              O que você deseja cadastrar neste dia?
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Opção 1: Despesa Avulsa */}
              <button
                type="button"
                onClick={() => setFormMode("expense")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-background hover:bg-expense/10 hover:border-expense/40 transition-all text-xs font-semibold text-foreground group text-center"
              >
                <div className="w-9 h-9 rounded-full bg-expense/15 text-expense flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span>+ Despesa</span>
                <span className="text-[10px] text-muted font-normal">Débito / Dinheiro</span>
              </button>

              {/* Opção 2: Receita Avulsa */}
              <button
                type="button"
                onClick={() => setFormMode("income")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-background hover:bg-income/10 hover:border-income/40 transition-all text-xs font-semibold text-foreground group text-center"
              >
                <div className="w-9 h-9 rounded-full bg-income/15 text-income flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <span>+ Receita</span>
                <span className="text-[10px] text-muted font-normal">Entrada / Pix</span>
              </button>

              {/* Opção 3: Cartão de Crédito */}
              <button
                type="button"
                onClick={() => setFormMode("card")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-background hover:bg-amber-500/10 hover:border-amber-500/40 transition-all text-xs font-semibold text-foreground group text-center"
              >
                <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <CardIcon className="w-4 h-4" />
                </div>
                <span>+ Cartão</span>
                <span className="text-[10px] text-muted font-normal">Parcelado 1/N</span>
              </button>

              {/* Opção 4: Recorrência Mensal */}
              <button
                type="button"
                onClick={() => setFormMode("recurrence")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-background hover:bg-naples/20 hover:border-naples/40 transition-all text-xs font-semibold text-foreground group text-center"
              >
                <div className="w-9 h-9 rounded-full bg-navy/10 text-navy dark:bg-naples/20 dark:text-naples flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Repeat className="w-4 h-4" />
                </div>
                <span>+ Recorrente</span>
                <span className="text-[10px] text-muted font-normal">Fixa / 5º dia útil</span>
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DEDICADO À ESCOLHA */
          <form
            onSubmit={handleSubmit}
            className="p-4 bg-surface rounded-2xl border border-border space-y-3.5 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <button
                type="button"
                onClick={() => setFormMode("none")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar às opções</span>
              </button>

              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                {formMode === "income" && (
                  <span className="text-income flex items-center gap-1">
                    <ArrowDownLeft className="w-4 h-4" /> Nova Receita
                  </span>
                )}
                {formMode === "expense" && (
                  <span className="text-expense flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" /> Nova Despesa
                  </span>
                )}
                {formMode === "card" && (
                  <span className="text-amber-500 flex items-center gap-1">
                    <CardIcon className="w-4 h-4" /> Compra no Cartão
                  </span>
                )}
                {formMode === "recurrence" && (
                  <span className="text-navy dark:text-naples flex items-center gap-1">
                    <Repeat className="w-4 h-4" /> Conta Fixa Recorrente
                  </span>
                )}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Descrição
              </label>
              <Input
                placeholder="Ex.: Supermercado, Aluguel, Salário, Compra..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Valor (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                    R$
                  </span>
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={amountInput}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="pl-8 tabular font-semibold text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Categoria
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs"
                >
                  <option value="">Selecione Categoria</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campos Específicos para Cartão de Crédito */}
            {formMode === "card" && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Cartão de Crédito
                  </label>
                  <select
                    value={creditCardId}
                    onChange={(e) => setCreditCardId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs"
                    required
                  >
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Parcelamento
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((num) => (
                      <option key={num} value={num}>
                        {num === 1 ? "À vista (1x)" : `${num}x parcelado`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Campos Específicos para Recorrência */}
            {formMode === "recurrence" && (
              <div className="pt-1 space-y-2">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer p-2.5 rounded-xl border border-border bg-background hover:bg-surface transition-colors">
                  <input
                    type="checkbox"
                    checked={isFifthBusinessDay}
                    onChange={(e) => setIsFifthBusinessDay(e.target.checked)}
                    className="rounded border-border text-navy dark:text-naples"
                  />
                  <div>
                    <span className="font-semibold block">5º dia útil do mês (Salário CLT)</span>
                    <span className="text-[11px] text-muted">
                      Calcula automaticamente o 5º dia útil pulando fins de semana e feriados.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Conta Bancária para Débito/Entrada */}
            {formMode !== "card" && accounts.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Conta Bancária
                </label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFormMode("none")}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="primary"
                isLoading={isSubmitting}
              >
                Confirmar Cadastro
              </Button>
            </div>
          </form>
        )}

        {/* LISTA DE COMPROMISSOS DO DIA */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
            Compromissos agendados para este dia ({events.length})
          </span>

          {events.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted">
              Nenhum evento financeiro agendado para esta data.
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
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
                        <div className="flex items-center gap-1.5">
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
                            onClick={() => handleDelete(evt)}
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

        <div className="flex justify-end pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
