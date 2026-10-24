"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAccountsAction } from "@/actions/contas";
import { getCategoriesAction } from "@/actions/categorias";
import { createTransactionAction } from "@/actions/transacoes";
import { mockCreditCards } from "@/mocks/financas";
import type { BankAccountWithBalance, Category, TransactionType } from "@/types/types";

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickTransactionModal({
  isOpen,
  onClose,
  onSuccess,
}: QuickTransactionModalProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  React.useEffect(() => {
    setDate(new Date().toISOString().split("T")[0]);

    if (isOpen) {
      getAccountsAction().then((accs) => {
        setAccounts(accs);
        if (accs.length > 0 && !paymentMethod) {
          setPaymentMethod(accs[0].id);
        }
        if (accs.length > 1 && !transferToId) {
          setTransferToId(accs[1].id);
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
      toast.error("Informe a descrição do lançamento");
      return;
    }

    const normalizedAmount = amount.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(normalizedAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor válido maior que zero");
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    // Identifica se paymentMethod é uma conta bancária
    const isBankAccount = accounts.some((a) => a.id === paymentMethod);
    const bankAccountId = isBankAccount ? paymentMethod : null;
    const creditCardId = !isBankAccount && paymentMethod ? paymentMethod : null;

    try {
      setIsSubmitting(true);
      await createTransactionAction({
        type,
        amountCents,
        description: description.trim(),
        date,
        categoryId: type === "transfer" ? null : categoryId || null,
        bankAccountId,
        creditCardId,
        transferToAccountId: type === "transfer" ? transferToId : null,
        status: "paid",
        isForecast: false,
      });

      toast.success(
        type === "income"
          ? "Receita lançada com sucesso!"
          : type === "transfer"
          ? "Transferência realizada!"
          : "Despesa registrada!"
      );

      // Limpa os campos
      setDescription("");
      setAmount("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar lançamento";
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
      title="Novo Lançamento"
      description="Registre uma movimentação financeira rápida no Neon."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seletor de Tipo */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-background rounded-full border border-border">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              type === "expense"
                ? "bg-expense/15 text-expense border border-expense/30 shadow-2xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Despesa
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
            Receita
          </button>
          <button
            type="button"
            onClick={() => setType("transfer")}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              type === "transfer"
                ? "bg-powder/30 text-navy dark:text-powder border border-powder/50 shadow-2xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Transferência
          </button>
        </div>

        {/* Valor */}
        <Input
          label="Valor"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          leftAddon={<span className="font-bold text-foreground">R$</span>}
          autoFocus
          required
        />

        {/* Descrição */}
        <Input
          label="Descrição"
          placeholder="Ex: Mercado, Salário, Transferência Nubank..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Data e Categoria lado a lado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          {type !== "transfer" && (
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
                    {c.name} {c.systemKey === "wedding" ? "💍 (Fundo Casamento)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Conta Origem */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            {type === "transfer" ? "Conta de Origem" : "Conta / Cartão"}
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
          >
            <optgroup label="Contas">
              {accounts.length > 0 ? (
                accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))
              ) : (
                <option value="">Nenhuma conta cadastrada</option>
              )}
            </optgroup>
            {type === "expense" && (
              <optgroup label="Cartões de Crédito">
                {mockCreditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Conta de Destino se for Transferência */}
        {type === "transfer" && (
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Conta de Destino
            </label>
            <select
              value={transferToId}
              onChange={(e) => setTransferToId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
              required
            >
              {accounts
                .filter((acc) => acc.id !== paymentMethod)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-2 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Salvar Lançamento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
