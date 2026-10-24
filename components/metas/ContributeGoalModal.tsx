"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { contributeGoalAction, type GoalWithDetails } from "@/actions/metas";
import { formatCurrency } from "@/utils/format";
import { PiggyBank } from "lucide-react";

interface ContributeGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalWithDetails | null;
  onSuccess?: () => void;
}

export function ContributeGoalModal({
  isOpen,
  onClose,
  goal,
  onSuccess,
}: ContributeGoalModalProps) {
  const [amountInput, setAmountInput] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountInput("");
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
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
    if (!goal) return;

    const amountCents = parseCurrencyInput(amountInput);
    if (amountCents <= 0) {
      toast.error("Informe um valor válido para o aporte");
      return;
    }

    if (!date) {
      toast.error("Informe a data do aporte");
      return;
    }

    setIsLoading(true);

    try {
      const res = await contributeGoalAction({
        goalId: goal.id,
        amountCents,
        date,
        note: note.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "Erro ao registrar aporte");
        setIsLoading(false);
        return;
      }

      toast.success(`Aporte de R$ ${amountInput} registrado!`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Ocorreu um erro ao salvar aporte");
    } finally {
      setIsLoading(false);
    }
  };

  if (!goal) return null;

  const remainingCents = Math.max(0, goal.targetCents - goal.savedCents);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Aporte"
      description={`Adicione economia para a meta "${goal.name}".`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info card da meta */}
        <div className="bg-surface rounded-xl p-3 border border-border flex items-center justify-between text-xs">
          <div>
            <span className="text-muted block">Já guardado</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(goal.savedCents)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted block">Faltam</span>
            <span className="font-semibold text-accent-foreground dark:text-naples">
              {formatCurrency(remainingCents)}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Valor do Aporte (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              R$
            </span>
            <Input
              type="text"
              value={amountInput}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              placeholder="0,00"
              className="pl-9 font-semibold text-lg tabular"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Data do Aporte
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Observação (Opcional)
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: Sobra do mês"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="flex items-center gap-1.5"
          >
            <PiggyBank className="w-4 h-4" />
            Confirmar Aporte
          </Button>
        </div>
      </form>
    </Modal>
  );
}
