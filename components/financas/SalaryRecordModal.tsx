"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createSalaryRecordAction,
  updateSalaryRecordAction,
} from "@/actions/salarios";
import type { SalaryRecord } from "@/types/types";
import { Briefcase, Building2, Calendar, DollarSign, FileText } from "lucide-react";

interface SalaryRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  recordToEdit?: SalaryRecord | null;
}

export function SalaryRecordModal({
  isOpen,
  onClose,
  onSuccess,
  recordToEdit,
}: SalaryRecordModalProps) {
  const isEditing = !!recordToEdit;

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (recordToEdit) {
      setTitle(recordToEdit.title);
      setCompany(recordToEdit.company);
      setAmount((recordToEdit.amountCents / 100).toFixed(2).replace(".", ","));
      setStartDate(recordToEdit.startDate);
      setIsCurrent(!recordToEdit.endDate);
      setEndDate(recordToEdit.endDate || "");
      setNotes(recordToEdit.notes || "");
    } else {
      setTitle("");
      setCompany("");
      setAmount("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setIsCurrent(true);
      setEndDate("");
      setNotes("");
    }
  }, [recordToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Informe o cargo ou função");
      return;
    }
    if (!company.trim()) {
      toast.error("Informe o nome da empresa");
      return;
    }
    if (!startDate) {
      toast.error("Informe a data de início");
      return;
    }

    const normalizedAmount = amount.replace(/\./g, "").replace(",", ".");
    const parsedAmount = parseFloat(normalizedAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Informe um valor de salário válido");
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    try {
      setIsSubmitting(true);

      const payload = {
        title: title.trim(),
        company: company.trim(),
        amountCents,
        startDate,
        endDate: isCurrent ? null : endDate || null,
        notes: notes.trim() || null,
      };

      if (isEditing && recordToEdit) {
        await updateSalaryRecordAction(recordToEdit.id, payload);
        toast.success("Registro salarial atualizado!");
      } else {
        await createSalaryRecordAction(payload);
        toast.success("Novo cargo/salário cadastrado com sucesso!");
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar registro";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Cargo e Salário" : "Novo Registro Salarial"}
      description="Acompanhe a sua evolução de renda e histórico profissional."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Cargo / Função */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-navy dark:text-naples" />
            Cargo / Função *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Desenvolvedor Júnior, Analista..."
            required
            autoFocus
          />
        </div>

        {/* Empresa */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-navy dark:text-naples" />
            Empresa / Empregador *
          </label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Ex: Tech Solutions, Hospital..."
            required
          />
        </div>

        {/* Salário / Renda Mensal */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-navy dark:text-naples" />
            Salário Mensal (R$) *
          </label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            required
          />
        </div>

        {/* Datas e Status Atual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-navy dark:text-naples" />
              Data de Início *
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-navy dark:text-naples" />
              Data de Término
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isCurrent}
              placeholder={isCurrent ? "Cargo Atual" : ""}
            />
          </div>
        </div>

        {/* Checkbox de Cargo Atual */}
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
            className="w-4 h-4 rounded border-border text-navy focus:ring-navy dark:focus:ring-naples"
          />
          <span className="text-xs font-medium text-foreground">
            Este é meu cargo / emprego atual (em andamento)
          </span>
        </label>

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-navy dark:text-naples" />
            Observações (Opcional)
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Contratação inicial, Promoção por desempenho..."
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
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
            {isEditing ? "Salvar Alterações" : "Cadastrar Cargo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
