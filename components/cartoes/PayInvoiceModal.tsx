"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MoneyText } from "@/components/ui/MoneyText";
import { getAccountsAction } from "@/actions/contas";
import { payInvoiceAction } from "@/actions/faturas";
import type { BankAccountWithBalance, CardInvoiceWithTotal } from "@/types/types";

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: CardInvoiceWithTotal | null;
  cardName: string;
  defaultAccountId?: string | null;
}

export function PayInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  cardName,
  defaultAccountId,
}: PayInvoiceModalProps) {
  const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAccountsAction().then((accs) => {
        setAccounts(accs);
        if (defaultAccountId && accs.some((a) => a.id === defaultAccountId)) {
          setSelectedAccountId(defaultAccountId);
        } else if (accs.length > 0) {
          setSelectedAccountId(accs[0].id);
        }
      });
    }
  }, [isOpen, defaultAccountId]);

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccountId) {
      toast.error("Selecione uma conta bancária para débito");
      return;
    }

    try {
      setIsSubmitting(true);
      await payInvoiceAction(invoice.id, selectedAccountId);
      toast.success("Fatura paga com sucesso!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao pagar fatura";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pagar Fatura"
      description={`Quitação da fatura de ${invoice.referenceMonth} do cartão ${cardName}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Resumo do Valor */}
        <div className="p-4 rounded-xl bg-surface border border-border text-center space-y-1">
          <span className="text-xs font-semibold text-muted">Total a Pagar</span>
          <p className="text-2xl font-black text-foreground tabular">
            <MoneyText cents={invoice.totalCents} />
          </p>
          <p className="text-xs text-muted">
            Vencimento em {invoice.dueDate}
          </p>
        </div>

        {/* Seleção da Conta Bancária */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Debitar da Conta
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
            required
          >
            {accounts.length === 0 ? (
              <option value="">Nenhuma conta disponível</option>
            ) : (
              accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Saldo: R$ {(acc.currentBalanceCents / 100).toFixed(2)})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-2 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Confirmar Pagamento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
