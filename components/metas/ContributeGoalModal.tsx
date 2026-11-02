"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  contributeGoalAction,
  withdrawGoalAction,
  type GoalWithDetails,
} from "@/actions/metas";
import { formatCurrency } from "@/utils/format";
import { getLocalTodayDateString } from "@/utils/dates";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Sparkles } from "lucide-react";

interface ContributeGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalWithDetails | null;
  onSuccess?: () => void;
  initialMode?: "deposit" | "withdraw";
}

export function ContributeGoalModal({
  isOpen,
  onClose,
  goal,
  onSuccess,
  initialMode = "deposit",
}: ContributeGoalModalProps) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amountInput, setAmountInput] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setAmountInput("");
      setDate(getLocalTodayDateString());
      setNote("");
    }
  }, [isOpen, initialMode]);

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
      toast.error(`Informe um valor válido para ${mode === "deposit" ? "o aporte" : "o resgate"}`);
      return;
    }

    if (!date) {
      toast.error("Informe a data");
      return;
    }

    if (mode === "withdraw" && amountCents > goal.savedCents) {
      toast.error(`Valor do resgate não pode ser maior que o saldo guardado (${formatCurrency(goal.savedCents)})`);
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "deposit") {
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
      } else {
        const res = await withdrawGoalAction({
          goalId: goal.id,
          amountCents,
          date,
          note: note.trim() || "Resgate / Pagamento planejado",
        });

        if (!res.success) {
          toast.error(res.error || "Erro ao registrar resgate");
          setIsLoading(false);
          return;
        }
        toast.success(`Resgate de R$ ${amountInput} descontado da meta!`);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Ocorreu um erro ao salvar movimentação");
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
      title={mode === "deposit" ? "Aportar na Meta" : "Resgatar / Descontar da Meta"}
      description={`Gerencie o dinheiro reservado para "${goal.name}".`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seletor de Tipo: Aporte (+) vs Resgate (-) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface border border-border rounded-xl">
          <button
            type="button"
            onClick={() => setMode("deposit")}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${mode === "deposit"
                ? "bg-navy text-aurora dark:bg-naples dark:text-navy shadow-xs"
                : "text-muted hover:text-foreground"
              }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-income" />
            <span>Aporte (+)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("withdraw")}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${mode === "withdraw"
                ? "bg-navy text-aurora dark:bg-naples dark:text-navy shadow-xs"
                : "text-muted hover:text-foreground"
              }`}
          >
            <ArrowUpRight className="w-4 h-4 text-expense" />
            <span>Resgatar (-)</span>
          </button>
        </div>

        {/* Info card da meta */}
        <div className="bg-surface rounded-xl p-3 border border-border flex items-center justify-between text-xs">
          <div>
            <span className="text-muted block">Saldo Atual Guardado</span>
            <span className="font-bold text-foreground text-sm tabular">
              {formatCurrency(goal.savedCents)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted block">Meta Total</span>
            <span className="font-semibold text-muted text-xs tabular">
              {formatCurrency(goal.targetCents)}
            </span>
          </div>
        </div>

        {/* Sugestão de Provisão Mensal se houver */}
        {mode === "deposit" && goal.recommendedMonthlyCents && goal.recommendedMonthlyCents > 0 && (
          <div className="p-2.5 rounded-xl bg-powder/15 border border-powder/40 flex items-center gap-2 text-xs text-foreground">
            <Sparkles className="w-4 h-4 text-powder shrink-0" />
            <span>
              💡 Para atingir a meta a tempo, guarde{" "}
              <strong>{formatCurrency(goal.recommendedMonthlyCents)}/mês</strong> ({goal.monthsRemaining} meses restantes).
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            {mode === "deposit" ? "Valor do Aporte (R$)" : "Valor do Resgate (R$)"}
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
              Data
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
              placeholder={
                mode === "deposit" ? "Ex.: Sobra do mês" : "Ex.: Mensalidade Faculdade Jan"
              }
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
            variant={mode === "deposit" ? "primary" : "outline"}
            isLoading={isLoading}
            className="flex items-center gap-1.5"
          >
            {mode === "deposit" ? (
              <>
                <PiggyBank className="w-4 h-4" />
                Confirmar Aporte
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4 text-expense" />
                Confirmar Resgate
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
