"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAccountsAction } from "@/actions/contas";
import { createCreditCardAction, updateCreditCardAction } from "@/actions/cartoes";
import type { BankAccountWithBalance, CreditCard } from "@/types/types";

const CARD_COLORS = [
  { name: "Navy VYK", hex: "#173B64" },
  { name: "Roxo", hex: "#8A05BE" },
  { name: "Laranja", hex: "#FF7A00" },
  { name: "Grafite / Black", hex: "#1F2937" },
  { name: "Verde Esmeralda", hex: "#059669" },
  { name: "Azul Cobalto", hex: "#2563EB" },
  { name: "Bordô", hex: "#991B1B" },
  { name: "Dourado", hex: "#D97706" },
];

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  cardToEdit?: CreditCard | null;
}

export function CreditCardModal({
  isOpen,
  onClose,
  onSuccess,
  cardToEdit,
}: CreditCardModalProps) {
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("20");
  const [dueDay, setDueDay] = useState("27");
  const [color, setColor] = useState(CARD_COLORS[0].hex);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAccountsAction().then((accs) => {
        setAccounts(accs);
      });

      if (cardToEdit) {
        setName(cardToEdit.name);
        setLimit((cardToEdit.limitCents / 100).toFixed(2).replace(".", ","));
        setClosingDay(String(cardToEdit.closingDay));
        setDueDay(String(cardToEdit.dueDay));
        setColor(cardToEdit.color);
        setPaymentAccountId(cardToEdit.paymentAccountId || "");
      } else {
        setName("");
        setLimit("");
        setClosingDay("20");
        setDueDay("27");
        setColor(CARD_COLORS[0].hex);
        setPaymentAccountId("");
      }
    }
  }, [isOpen, cardToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe o nome do cartão");
      return;
    }

    const normalizedLimit = limit.replace(/\./g, "").replace(",", ".");
    const parsedLimit = parseFloat(normalizedLimit);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      toast.error("Informe um limite válido");
      return;
    }

    const cDay = parseInt(closingDay, 10);
    const dDay = parseInt(dueDay, 10);
    if (isNaN(cDay) || cDay < 1 || cDay > 31) {
      toast.error("O dia de fechamento deve ser entre 1 e 31");
      return;
    }
    if (isNaN(dDay) || dDay < 1 || dDay > 31) {
      toast.error("O dia de vencimento deve ser entre 1 e 31");
      return;
    }

    const limitCents = Math.round(parsedLimit * 100);

    try {
      setIsSubmitting(true);

      if (cardToEdit) {
        await updateCreditCardAction(cardToEdit.id, {
          name: name.trim(),
          limitCents,
          closingDay: cDay,
          dueDay: dDay,
          color,
          paymentAccountId: paymentAccountId || null,
        });
        toast.success("Cartão atualizado com sucesso!");
      } else {
        await createCreditCardAction({
          name: name.trim(),
          limitCents,
          closingDay: cDay,
          dueDay: dDay,
          color,
          paymentAccountId: paymentAccountId || null,
        });
        toast.success("Cartão cadastrado com sucesso!");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar cartão";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cardToEdit ? "Editar Cartão" : "Novo Cartão de Crédito"}
      description="Gerencie limites, datas de fatura e conta para pagamento."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do Cartão */}
        <Input
          label="Nome do Cartão"
          placeholder="Ex: Nubank Ultravioleta, XP Visa Infinite..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Limite Total */}
        <Input
          label="Limite Total"
          placeholder="0,00"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          leftAddon={<span className="font-bold text-foreground">R$</span>}
          required
        />

        {/* Dia de Fechamento e Vencimento */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Dia Fechamento"
            type="number"
            min={1}
            max={31}
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
            helperText="Melhor dia p/ compra"
            required
          />

          <Input
            label="Dia Vencimento"
            type="number"
            min={1}
            max={31}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            helperText="Dia de pagar fatura"
            required
          />
        </div>

        {/* Conta de Pagamento Padrão */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Conta Padrão de Débito (Opcional)
          </label>
          <select
            value={paymentAccountId}
            onChange={(e) => setPaymentAccountId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
          >
            <option value="">Nenhuma vinculada</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de Cores */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Cor do Cartão
          </label>
          <div className="flex flex-wrap gap-2.5 pt-1">
            {CARD_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  color === c.hex
                    ? "scale-115 border-foreground shadow-xs ring-2 ring-primary/30"
                    : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-2 pt-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {cardToEdit ? "Salvar Alterações" : "Criar Cartão"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
