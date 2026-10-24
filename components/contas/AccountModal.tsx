"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createAccountAction,
  updateAccountAction,
  archiveAccountAction,
} from "@/actions/contas";
import type { BankAccountType, BankAccountWithBalance } from "@/types/types";
import { Landmark, PiggyBank, Wallet, TrendingUp, Trash2 } from "lucide-react";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: BankAccountWithBalance | null;
  onSuccess?: () => void;
}

const PRESET_COLORS = [
  "#173B64", // Navy Blue (VYK)
  "#8A05BE", // Nubank Roxo
  "#FF7A00", // Inter Laranja
  "#2F9E6F", // Verde Poupança
  "#A3C5EB", // Powder Blue (VYK)
  "#E8A33D", // Carteira Amarelo
  "#005CA9", // Caixa Azul
  "#CC092F", // Santander Vermelho
];

const ACCOUNT_TYPES: { type: BankAccountType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "checking", label: "Conta Corrente", icon: Landmark },
  { type: "savings", label: "Poupança", icon: PiggyBank },
  { type: "wallet", label: "Carteira / Dinheiro", icon: Wallet },
  { type: "investment", label: "Investimento", icon: TrendingUp },
];

export function AccountModal({
  isOpen,
  onClose,
  accountToEdit,
  onSuccess,
}: AccountModalProps) {
  const isEditing = !!accountToEdit;

  const [name, setName] = useState("");
  const [type, setType] = useState<BankAccountType>("checking");
  const [balanceInput, setBalanceInput] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setType(accountToEdit.type);
      setBalanceInput((accountToEdit.initialBalanceCents / 100).toFixed(2).replace(".", ","));
      setColor(accountToEdit.color || PRESET_COLORS[0]);
    } else {
      setName("");
      setType("checking");
      setBalanceInput("0,00");
      setColor(PRESET_COLORS[0]);
    }
  }, [accountToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome da conta");
      return;
    }

    // Converte string monetária (ex: "1.250,50" ou "100") em centavos inteiros
    const normalized = balanceInput.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(normalized);
    const initialBalanceCents = isNaN(parsedAmount) ? 0 : Math.round(parsedAmount * 100);

    setIsLoading(true);

    try {
      if (isEditing && accountToEdit) {
        await updateAccountAction(accountToEdit.id, {
          name,
          type,
          initialBalanceCents,
          color,
        });
        toast.success("Conta atualizada com sucesso!");
      } else {
        await createAccountAction({
          name,
          type,
          initialBalanceCents,
          color,
        });
        toast.success("Conta criada com sucesso!");
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar conta.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!accountToEdit) return;
    if (!confirm(`Tem certeza que deseja arquivar a conta "${accountToEdit.name}"?`)) return;

    setIsLoading(true);
    try {
      await archiveAccountAction(accountToEdit.id);
      toast.success("Conta arquivada com sucesso!");
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Erro ao arquivar conta.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Conta" : "Nova Conta Bancária"}
      description="Gerencie suas contas correntes, investimentos ou dinheiro em espécie."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <Input
          label="Nome da Conta"
          placeholder="Ex: Nubank, Inter, Carteira..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Tipo de Conta */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Tipo de Conta
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setType(t.type)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-accent/20 border-accent/60 text-foreground shadow-2xs"
                      : "bg-surface border-border text-muted hover:text-foreground hover:bg-background"
                  }`}
                >
                  <Icon className="w-4 h-4 text-navy dark:text-naples shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Saldo Inicial */}
        <Input
          label="Saldo Inicial"
          placeholder="0,00"
          value={balanceInput}
          onChange={(e) => setBalanceInput(e.target.value)}
          leftAddon={<span className="font-bold text-foreground">R$</span>}
          helperText="Saldo com o qual você está iniciando o controle desta conta."
        />

        {/* Seletor de Cor */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Cor de Identificação
          </label>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform border-2 ${
                  color === c ? "scale-110 border-foreground shadow-xs" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Selecionar cor ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          {isEditing ? (
            <button
              type="button"
              onClick={handleArchive}
              className="text-xs text-expense hover:underline flex items-center gap-1 p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Arquivar Conta</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {isEditing ? "Salvar Alterações" : "Criar Conta"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
