"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAccountsAction } from "@/actions/contas";
import { getCategoriesAction } from "@/actions/categorias";
import { getCreditCardsAction } from "@/actions/cartoes";
import { createTransactionAction } from "@/actions/transacoes";
import { createInstallmentPurchaseAction } from "@/actions/faturas";
import type { BankAccountWithBalance, Category, CreditCardWithDetails, TransactionType } from "@/types/types";

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: string;
}

export function QuickTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}: QuickTransactionModalProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [installments, setInstallments] = useState(1);
  const [transferToId, setTransferToId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDate(initialDate || new Date().toISOString().split("T")[0]);
      Promise.all([
        getAccountsAction(),
        getCreditCardsAction(),
        getCategoriesAction(),
      ]).then(([accs, cards, cats]) => {
        setAccounts(accs);
        setCreditCards(cards);
        setCategories(cats);

        if (accs.length > 0 && !paymentMethod) {
          setPaymentMethod(accs[0].id);
        }
        if (accs.length > 1 && !transferToId) {
          setTransferToId(accs[1].id);
        }
      });
    }
  }, [isOpen]);

  const isCreditCard = creditCards.some((c) => c.id === paymentMethod);

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

    try {
      setIsSubmitting(true);

      if (type === "expense" && isCreditCard) {
        // Compra no Cartão de Crédito (à vista ou parcelada)
        await createInstallmentPurchaseAction({
          creditCardId: paymentMethod,
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
      } else {
        // Transação direta em Conta (Receita, Despesa à vista ou Transferência)
        const isBankAccount = accounts.some((a) => a.id === paymentMethod);
        const bankAccountId = isBankAccount ? paymentMethod : null;

        await createTransactionAction({
          type,
          amountCents,
          description: description.trim(),
          date,
          categoryId: type === "transfer" ? null : categoryId || null,
          bankAccountId,
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
      }

      // Limpa os campos
      setDescription("");
      setAmount("");
      setInstallments(1);
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
          placeholder="Ex: Mercado, Uber, Salário, Parcelamento Smartphone..."
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

        {/* Conta ou Cartão */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            {type === "transfer" ? "Conta de Origem" : "Forma de Pagamento"}
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setInstallments(1);
            }}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
          >
            <optgroup label="Contas Bancárias">
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
            {type === "expense" && creditCards.length > 0 && (
              <optgroup label="Cartões de Crédito">
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    💳 {card.name} (Fecha dia {card.closingDay})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Se for Cartão de Crédito: Opção de Parcelamento */}
        {type === "expense" && isCreditCard && (
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Parcelamento
            </label>
            <select
              value={installments}
              onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
            >
              <option value={1}>À vista (1x)</option>
              {Array.from({ length: 23 }, (_, i) => i + 2).map((num) => {
                const total = parseFloat(amount.replace(/\./g, "").replace(",", ".")) || 0;
                const parcelCents = total > 0 ? (total / num).toFixed(2) : "0,00";
                return (
                  <option key={num} value={num}>
                    {num}x {total > 0 ? `de R$ ${parcelCents}` : ""}
                  </option>
                );
              })}
            </select>
          </div>
        )}

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
