"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  addWeddingFundEntryAction,
  deleteWeddingFundEntryAction,
  type WeddingFundEntryItem,
} from "@/actions/casamento";
import { formatCurrency, formatDate } from "@/utils/format";
import { PiggyBank, Plus, Trash2, History } from "lucide-react";

interface WeddingFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: WeddingFundEntryItem[];
  reserveCents: number;
  onSuccess?: () => void;
}

export function WeddingFundModal({
  isOpen,
  onClose,
  entries,
  reserveCents,
  onSuccess,
}: WeddingFundModalProps) {
  const [amountInput, setAmountInput] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split("T")[0]);
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

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountCents = parseCurrencyInput(amountInput);
    if (amountCents <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setIsLoading(true);
    try {
      const res = await addWeddingFundEntryAction({
        amountCents,
        date,
        note: note.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "Erro ao registrar aporte");
        setIsLoading(false);
        return;
      }

      toast.success("Aporte no cofrinho realizado!");
      setAmountInput("");
      setNote("");
      onSuccess?.();
    } catch {
      toast.error("Erro ao registrar aporte");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, amountCents: number) => {
    if (
      !confirm(
        `Deseja realmente remover este aporte de ${formatCurrency(amountCents)}?`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await deleteWeddingFundEntryAction(id);
      if (res.success) {
        toast.success("Aporte removido");
        onSuccess?.();
      } else {
        toast.error(res.error || "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir aporte");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cofrinho do Casamento"
      description="Reserva compartilhada para quitar custos e fornecedores da festa."
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Sumário */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border">
          <div>
            <span className="text-xs text-muted block uppercase tracking-wider">
              Total Acumulado
            </span>
            <span className="text-2xl font-bold text-navy dark:text-naples">
              {formatCurrency(reserveCents)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy dark:bg-naples/20 dark:text-naples flex items-center justify-center">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>

        {/* Formulário de novo aporte */}
        <form
          onSubmit={handleAddEntry}
          className="p-4 rounded-xl bg-surface/50 border border-border space-y-3"
        >
          <span className="text-xs font-semibold text-foreground block">
            Adicionar Novo Aporte
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted mb-1">
                Valor (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                  R$
                </span>
                <Input
                  type="text"
                  value={amountInput}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  placeholder="0,00"
                  className="pl-8 text-sm tabular font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-muted mb-1">Data</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-muted mb-1">
              Observação (Opcional)
            </label>
            <div className="flex gap-2">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: Aporte mensal Yuri & Vithória"
                className="text-xs"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isLoading}
                className="shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Aportar
              </Button>
            </div>
          </div>
        </form>

        {/* Histórico */}
        <div>
          <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">
            Histórico de Aportes ({entries.length})
          </span>

          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {entries.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">
                Nenhum aporte registrado ainda no cofrinho.
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background text-xs"
                >
                  <div>
                    <span className="font-semibold text-foreground block">
                      {entry.note || "Aporte Casamento"}
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatDate(entry.date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular">
                      +{formatCurrency(entry.amountCents)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id, entry.amountCents)}
                      disabled={deletingId === entry.id}
                      className="p-1 text-muted hover:text-rose-500 rounded transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
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
