"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAccountsAction } from "@/actions/contas";
import { getCategoriesAction } from "@/actions/categorias";
import { createRecurrenceAction } from "@/actions/recorrencias";
import type { BankAccountWithBalance, Category, RecurrenceFrequency, TransactionType } from "@/types/types";

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RecurrenceModal({
  isOpen,
  onClose,
  onSuccess,
}: RecurrenceModalProps) {
  const [type, setType] = useState<Exclude<TransactionType, "transfer">>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("5");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [startDate, setStartDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    setStartDate(new Date().toISOString().split("T")[0]);

    if (isOpen) {
      getAccountsAction().then((accs) => {
        setAccounts(accs);
        if (accs.length > 0 && !bankAccountId) {
          setBankAccountId(accs[0].id);
        }
      });
      getCategoriesAction().then((cats) => {
        setCategories(cats);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Informe a descrição da recorrência");
      return;
    }

    const normalizedAmount = amount.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(normalizedAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido maior que zero");
      return;
    }

    const dayNum = parseInt(dayOfMonth, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      toast.error("O dia do vencimento deve ser entre 1 e 31");
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    try {
      setIsSubmitting(true);
      await createRecurrenceAction({
        type,
        description: description.trim(),
        amountCents,
        frequency,
        dayOfMonth: dayNum,
        startDate,
        categoryId: categoryId || null,
        bankAccountId: bankAccountId || null,
      });

      toast.success("Recorrência cadastrada com sucesso!");
      setDescription("");
      setAmount("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar recorrência";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense"
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Recorrência"
      description="Cadastre despesas ou receitas fixas para gerar lançamentos previstos automáticos."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-background rounded-full border border-border">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              type === "expense"
                ? "bg-expense/15 text-expense border border-expense/30 shadow-2xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Despesa Fixa
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              type === "income"
                ? "bg-income/15 text-income border border-income/30 shadow-2xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Receita Fixa
          </button>
        </div>

        {/* Descrição */}
        <Input
          label="Descrição"
          placeholder="Ex: Salário, Aluguel, Internet, Netflix..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Valor e Dia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Valor"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            leftAddon={<span className="font-bold text-foreground">R$</span>}
            required
          />

          <Input
            label="Dia do Mês"
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            required
          />
        </div>

        {/* Categoria e Conta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
            >
              <option value="">Selecione...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Conta Vinculada
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
            >
              <option value="">Selecione...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Frequência e Início */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Frequência
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
            >
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          <Input
            label="Início em"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-2 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Salvar Recorrência
          </Button>
        </div>
      </form>
    </Modal>
  );
}
