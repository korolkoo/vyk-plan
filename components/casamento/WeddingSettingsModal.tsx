"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateWeddingSettingsAction } from "@/actions/casamento";

interface WeddingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string | null;
  currentBudgetCents: number | null;
  onSuccess?: () => void;
}

export function WeddingSettingsModal({
  isOpen,
  onClose,
  currentDate,
  currentBudgetCents,
  onSuccess,
}: WeddingSettingsModalProps) {
  const [weddingDate, setWeddingDate] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWeddingDate(currentDate || "");
      if (currentBudgetCents && currentBudgetCents > 0) {
        setBudgetInput(
          (currentBudgetCents / 100).toFixed(2).replace(".", ",")
        );
      } else {
        setBudgetInput("");
      }
    }
  }, [isOpen, currentDate, currentBudgetCents]);

  const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/\D/g, "");
    return parseInt(cleaned, 10) || 0;
  };

  const handleCurrencyChange = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) {
      setBudgetInput("");
      return;
    }
    const cents = parseInt(numeric, 10);
    setBudgetInput((cents / 100).toFixed(2).replace(".", ","));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const budgetCents = parseCurrencyInput(budgetInput);
      const res = await updateWeddingSettingsAction({
        weddingDate: weddingDate || null,
        totalBudgetCents: budgetCents > 0 ? budgetCents : null,
      });

      if (!res.success) {
        toast.error(res.error || "Erro ao atualizar");
        setIsLoading(false);
        return;
      }

      toast.success("Configurações do casamento salvas!");
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações do Casamento"
      description="Defina a data do casamento e a meta total de orçamento."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Data do Casamento
          </label>
          <Input
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Orçamento Total Estimado (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
              R$
            </span>
            <Input
              type="text"
              value={budgetInput}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              placeholder="0,00"
              className="pl-9 font-semibold tabular"
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
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
