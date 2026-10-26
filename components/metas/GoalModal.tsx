"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createGoalAction,
  updateGoalAction,
  deleteGoalAction,
  type GoalWithDetails,
} from "@/actions/metas";
import {
  Target,
  Plane,
  ShieldCheck,
  Car,
  Home,
  Heart,
  Sparkles,
  Laptop,
  GraduationCap,
  TrendingUp,
  Gift,
  Trophy,
  Trash2,
} from "lucide-react";

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: GoalWithDetails | null;
  onSuccess?: () => void;
}

const PRESET_ICONS = [
  { name: "Target", icon: Target, label: "Geral" },
  { name: "ShieldCheck", icon: ShieldCheck, label: "Reserva" },
  { name: "Plane", icon: Plane, label: "Viagem" },
  { name: "Home", icon: Home, label: "Casa" },
  { name: "Car", icon: Car, label: "Carro" },
  { name: "TrendingUp", icon: TrendingUp, label: "Investimento" },
  { name: "GraduationCap", icon: GraduationCap, label: "Estudos" },
  { name: "Laptop", icon: Laptop, label: "Eletrônicos" },
  { name: "Heart", icon: Heart, label: "Casamento" },
  { name: "Sparkles", icon: Sparkles, label: "Sonhos" },
  { name: "Gift", icon: Gift, label: "Presente" },
  { name: "Trophy", icon: Trophy, label: "Conquista" },
];

const PRESET_COLORS = [
  "#173B64", // Navy Blue (VYK)
  "#A3C5EB", // Powder Blue (VYK)
  "#8A05BE", // Roxo
  "#2F9E6F", // Verde
  "#E8A33D", // Amarelo/Dourado
  "#E02424", // Vermelho
  "#005CA9", // Azul Royal
  "#DB2777", // Rosa
];

export function GoalModal({
  isOpen,
  onClose,
  goalToEdit,
  onSuccess,
}: GoalModalProps) {
  const isEditing = !!goalToEdit;

  const [name, setName] = useState("");
  const [targetAmountInput, setTargetAmountInput] = useState("");
  const [initialDepositInput, setInitialDepositInput] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Target");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (goalToEdit) {
      setName(goalToEdit.name);
      setTargetAmountInput(
        (goalToEdit.targetCents / 100).toFixed(2).replace(".", ",")
      );
      setTargetDate(goalToEdit.targetDate || "");
      setSelectedIcon(goalToEdit.icon || "Target");
      setSelectedColor(goalToEdit.color || PRESET_COLORS[0]);
      setInitialDepositInput("");
    } else {
      setName("");
      setTargetAmountInput("");
      setInitialDepositInput("");
      setTargetDate("");
      setSelectedIcon("Target");
      setSelectedColor(PRESET_COLORS[0]);
    }
  }, [goalToEdit, isOpen]);

  const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/\D/g, "");
    return parseInt(cleaned, 10) || 0;
  };

  const handleCurrencyChange = (
    value: string,
    setter: (val: string) => void
  ) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) {
      setter("");
      return;
    }
    const cents = parseInt(numeric, 10);
    setter((cents / 100).toFixed(2).replace(".", ","));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe o nome da meta");
      return;
    }

    const targetCents = parseCurrencyInput(targetAmountInput);
    if (targetCents <= 0) {
      toast.error("Informe o valor alvo da meta");
      return;
    }

    const initialDepositCents = parseCurrencyInput(initialDepositInput);

    setIsLoading(true);

    try {
      if (isEditing && goalToEdit) {
        const res = await updateGoalAction(goalToEdit.id, {
          name: name.trim(),
          targetCents,
          targetDate: targetDate || null,
          icon: selectedIcon,
          color: selectedColor,
        });

        if (!res.success) {
          toast.error(res.error || "Erro ao atualizar meta");
          setIsLoading(false);
          return;
        }

        toast.success("Meta atualizada com sucesso!");
      } else {
        const res = await createGoalAction({
          name: name.trim(),
          targetCents,
          targetDate: targetDate || null,
          icon: selectedIcon,
          color: selectedColor,
          initialDepositCents,
        });

        if (!res.success) {
          toast.error(res.error || "Erro ao criar meta");
          setIsLoading(false);
          return;
        }

        toast.success("Meta criada com sucesso!");
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Ocorreu um erro ao salvar");
    } finally {
      setIsLoading(false);
    }
  };

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const handleConfirmDelete = async () => {
    if (!goalToEdit) return;

    setIsDeleting(true);
    try {
      const res = await deleteGoalAction(goalToEdit.id);
      if (res.success) {
        toast.success("Meta excluída com sucesso");
        setIsConfirmDeleteOpen(false);
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.error || "Erro ao excluir meta");
      }
    } catch {
      toast.error("Erro ao excluir meta");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Meta" : "Nova Meta Pessoal"}
      description={
        isEditing
          ? "Atualize as informações da sua meta."
          : "Crie um objetivo para acompanhar suas economias e sonhos."
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Nome da Meta
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Reserva de Emergência, Viagem Europa"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Valor Alvo (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                R$
              </span>
              <Input
                type="text"
                value={targetAmountInput}
                onChange={(e) =>
                  handleCurrencyChange(e.target.value, setTargetAmountInput)
                }
                placeholder="0,00"
                className="pl-9 font-semibold tabular"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Data Limite (Opcional)
            </label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>

        {!isEditing && (
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Aporte Inicial (Opcional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                R$
              </span>
              <Input
                type="text"
                value={initialDepositInput}
                onChange={(e) =>
                  handleCurrencyChange(e.target.value, setInitialDepositInput)
                }
                placeholder="0,00"
                className="pl-9 font-semibold tabular"
              />
            </div>
            <p className="text-[11px] text-muted mt-1">
              Valor já guardado/reservado. Esse montante fica blindado e é descontado do seu Saldo Realmente Livre no Dashboard (ideal para gastos futuros como Faculdade, IPVA, etc.).
            </p>
          </div>
        )}


        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Ícone
          </label>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_ICONS.map((item) => {
              const IconComponent = item.icon;
              const isSelected = selectedIcon === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedIcon(item.name)}
                  title={item.label}
                  className={`h-10 flex items-center justify-center rounded-xl border transition-all ${
                    isSelected
                      ? "border-navy bg-navy/10 text-navy dark:border-naples dark:bg-naples/20 dark:text-naples shadow-sm"
                      : "border-border hover:bg-surface text-muted"
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Cor de Destaque
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  selectedColor === c
                    ? "scale-110 ring-2 ring-offset-2 ring-foreground"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              disabled={isDeleting || isLoading}
              className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir Meta
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isDeleting}
            >
              {isEditing ? "Salvar Alterações" : "Criar Meta"}
            </Button>
          </div>
        </div>
      </form>

      {/* Modal In-App de Confirmação de Exclusão */}
      {isConfirmDeleteOpen && goalToEdit && (
        <ConfirmModal
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Excluir Meta Financeira"
          description={`Tem certeza que deseja excluir a meta "${goalToEdit.name}" e todo seu histórico de aportes? Esta ação não pode ser desfeita.`}
          confirmText="Excluir Meta"
          cancelText="Cancelar"
          variant="danger"
        />
      )}
    </Modal>
  );
}
