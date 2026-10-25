"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateCompanySettingsAction } from "@/actions/empresa";
import { Calendar, DollarSign, Settings2 } from "lucide-react";

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: {
    targetLaunchDate: string | null;
    targetCapitalCents: number;
  };
  onSuccess: () => void;
}

export function CompanySettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSuccess,
}: CompanySettingsModalProps) {
  const [targetLaunchDate, setTargetLaunchDate] = useState("");
  const [capitalInput, setCapitalInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTargetLaunchDate(currentSettings.targetLaunchDate || "");
      if (currentSettings.targetCapitalCents > 0) {
        setCapitalInput(
          (currentSettings.targetCapitalCents / 100).toFixed(2).replace(".", ",")
        );
      } else {
        setCapitalInput("");
      }
    }
  }, [isOpen, currentSettings]);

  const handleCurrencyChange = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) {
      setCapitalInput("");
      return;
    }
    const cents = parseInt(numeric, 10);
    setCapitalInput((cents / 100).toFixed(2).replace(".", ","));
  };

  const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/\D/g, "");
    return parseInt(cleaned, 10) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const targetCapitalCents = parseCurrencyInput(capitalInput);

      const res = await updateCompanySettingsAction({
        targetLaunchDate: targetLaunchDate || null,
        targetCapitalCents,
      });

      if (!res.success) {
        throw new Error(res.error || "Erro ao salvar configurações");
      }

      toast.success("Configurações da Empresa VYK atualizadas!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações da Empresa VYK"
      description="Defina a previsão de lançamento oficial e a meta de capital inicial."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-navy dark:text-naples" />
            Data Prevista de Lançamento
          </label>
          <Input
            type="date"
            value={targetLaunchDate}
            onChange={(e) => setTargetLaunchDate(e.target.value)}
          />
          <p className="text-[11px] text-muted">
            Essa data alimenta o contador regressivo de dias restantes para abertura.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-navy dark:text-naples" />
            Meta de Capital Inicial / Reserva Alvo
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
              R$
            </span>
            <Input
              type="text"
              placeholder="50.000,00"
              value={capitalInput}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="pl-8 tabular font-semibold"
            />
          </div>
          <p className="text-[11px] text-muted">
            Valor de reserva necessário para dar início às operações e custos iniciais.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
          >
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
}
