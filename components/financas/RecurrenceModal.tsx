"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getAccountsAction } from "@/actions/contas";
import { getCategoriesAction } from "@/actions/categorias";
import { createRecurrenceAction, updateRecurrenceAction } from "@/actions/recorrencias";
import type { BankAccountWithBalance, Category, Recurrence, RecurrenceFrequency, TransactionType } from "@/types/types";
import { Bus, Calculator, Calendar } from "lucide-react";

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurrenceToEdit?: Recurrence | null;
  onSuccess?: () => void;
}

const WEEKDAYS = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
];

const MONTHS_LIST = [
  { id: 1, label: "Jan" },
  { id: 2, label: "Fev" },
  { id: 3, label: "Mar" },
  { id: 4, label: "Abr" },
  { id: 5, label: "Mai" },
  { id: 6, label: "Jun" },
  { id: 7, label: "Jul" },
  { id: 8, label: "Ago" },
  { id: 9, label: "Set" },
  { id: 10, label: "Out" },
  { id: 11, label: "Nov" },
  { id: 12, label: "Dez" },
];

export function RecurrenceModal({
  isOpen,
  onClose,
  recurrenceToEdit,
  onSuccess,
}: RecurrenceModalProps) {
  const isEditing = !!recurrenceToEdit;

  const [type, setType] = useState<Exclude<TransactionType, "transfer">>("expense");
  const [description, setDescription] = useState("");
  const [calculationMode, setCalculationMode] = useState<"fixed" | "per_day">("fixed");
  const [amount, setAmount] = useState("");
  const [dailyRate, setDailyRate] = useState("45,00");
  const [dayOfMonth, setDayOfMonth] = useState("10");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [startDate, setStartDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [isFifthBusinessDay, setIsFifthBusinessDay] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4]); // Seg a Qui
  const [exemptMonths, setExemptMonths] = useState<number[]>([1, 2]); // Jan e Fev
  const [billingShift, setBillingShift] = useState<number>(1); // Pagar no mês seguinte
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    setStartDate(new Date().toISOString().split("T")[0]);

    if (isOpen) {
      getAccountsAction().then((accs) => {
        setAccounts(accs);
        if (accs.length > 0 && !bankAccountId) {
          setBankAccountId(accs[0].id);
        }
      });
      getCategoriesAction().then((cats) => {
        setCategories(cats);
      });

      if (recurrenceToEdit) {
        setType(recurrenceToEdit.type);
        setDescription(recurrenceToEdit.description);
        setCalculationMode(recurrenceToEdit.calculationMode || "fixed");
        if (recurrenceToEdit.dailyRateCents) {
          setDailyRate((recurrenceToEdit.dailyRateCents / 100).toFixed(2).replace(".", ","));
        }
        setAmount((recurrenceToEdit.amountCents / 100).toFixed(2).replace(".", ","));
        setDayOfMonth(recurrenceToEdit.dayOfMonth === 0 ? "5" : String(recurrenceToEdit.dayOfMonth));
        setIsFifthBusinessDay(recurrenceToEdit.dayOfMonth === 0);
        setFrequency(recurrenceToEdit.frequency);
        setStartDate(recurrenceToEdit.startDate);
        setCategoryId(recurrenceToEdit.categoryId || "");
        setBankAccountId(recurrenceToEdit.bankAccountId || "");
        setBillingShift(recurrenceToEdit.billingShift ?? 0);

        if (recurrenceToEdit.applicableDays) {
          setSelectedDays(recurrenceToEdit.applicableDays.split(",").map(Number));
        }
        if (recurrenceToEdit.exemptMonths) {
          setExemptMonths(recurrenceToEdit.exemptMonths.split(",").map(Number));
        }
      } else {
        setDescription("");
        setAmount("");
        setDailyRate("45,00");
        setDayOfMonth("10");
        setIsFifthBusinessDay(false);
        setCalculationMode("fixed");
        setSelectedDays([1, 2, 3, 4]);
        setExemptMonths([1, 2]);
        setBillingShift(1);
      }
    }
  }, [isOpen, recurrenceToEdit]);

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort()
    );
  };

  const toggleMonth = (monthId: number) => {
    setExemptMonths((prev) =>
      prev.includes(monthId) ? prev.filter((m) => m !== monthId) : [...prev, monthId].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Informe a descrição da recorrência");
      return;
    }

    let amountCents = 0;
    let dailyRateCents: number | null = null;

    if (calculationMode === "per_day") {
      const normalizedDaily = dailyRate.replace(/\./g, "").replace(",", ".");
      const parsedDaily = parseFloat(normalizedDaily);
      if (isNaN(parsedDaily) || parsedDaily <= 0) {
        toast.error("Informe um valor por dia válido");
        return;
      }
      dailyRateCents = Math.round(parsedDaily * 100);
      amountCents = dailyRateCents; // Base
    } else {
      const normalizedAmount = amount.replace(/\./g, "").replace(",", ".");
      const parsedAmount = parseFloat(normalizedAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error("Informe um valor válido maior que zero");
        return;
      }
      amountCents = Math.round(parsedAmount * 100);
    }

    let dayNum = 0;
    if (!isFifthBusinessDay) {
      dayNum = parseInt(dayOfMonth, 10);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        toast.error("O dia do vencimento deve ser entre 1 e 31");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const payload = {
        type,
        description: description.trim(),
        amountCents,
        frequency,
        dayOfMonth: dayNum, // 0 = 5º dia útil
        startDate,
        categoryId: categoryId || null,
        bankAccountId: bankAccountId || null,
        calculationMode,
        dailyRateCents,
        applicableDays: calculationMode === "per_day" ? selectedDays.join(",") : null,
        exemptMonths: calculationMode === "per_day" ? exemptMonths.join(",") : null,
        billingShift: calculationMode === "per_day" ? billingShift : 0,
      };

      if (isEditing && recurrenceToEdit) {
        await updateRecurrenceAction(recurrenceToEdit.id, payload);
        toast.success("Recorrência atualizada com sucesso!");
      } else {
        await createRecurrenceAction(payload);
        toast.success("Recorrência cadastrada com sucesso!");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar recorrência";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense"
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Recorrência" : "Nova Recorrência"}
      description="Cadastre despesas ou receitas fixas para gerar previsões automáticas todo mês."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo: Despesa ou Receita */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-background rounded-full border border-border">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              type === "expense"
                ? "bg-expense/15 text-expense border border-expense/30 shadow-2xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Despesa Fixa
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              type === "income"
                ? "bg-income/15 text-income border border-income/30 shadow-2xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Receita Fixa
          </button>
        </div>

        {/* Modo de Cálculo */}
        <div className="p-3 rounded-2xl bg-surface border border-border space-y-2">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Modo de Cálculo
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setCalculationMode("fixed");
                setIsFifthBusinessDay(false);
              }}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                calculationMode === "fixed"
                  ? "bg-navy/10 text-navy dark:bg-naples/20 dark:text-naples border-navy/30 dark:border-naples/40 shadow-xs"
                  : "bg-background border-border text-muted hover:text-foreground"
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Valor Fixo Mensal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCalculationMode("per_day");
                setIsFifthBusinessDay(false);
                setDayOfMonth("10");
                setBillingShift(1);
                if (!description) setDescription("Transporte Ortolan");
              }}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                calculationMode === "per_day"
                  ? "bg-navy/10 text-navy dark:bg-naples/20 dark:text-naples border-navy/30 dark:border-naples/40 shadow-xs"
                  : "bg-background border-border text-muted hover:text-foreground"
              }`}
            >
              <Bus className="w-4 h-4" />
              <span>Diária por Dia Útil</span>
            </button>
          </div>
        </div>

        {/* Descrição */}
        <Input
          label="Descrição"
          placeholder="Ex: Transporte Ortolan, Aluguel, Salário..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Bloco de Valor: Fixo vs Diária */}
        {calculationMode === "fixed" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Valor Mensal (R$)"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              leftAddon={<span className="font-bold text-foreground">R$</span>}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Vencimento
              </label>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFifthBusinessDay}
                    onChange={(e) => setIsFifthBusinessDay(e.target.checked)}
                    className="rounded border-border text-navy dark:text-naples"
                  />
                  <span className="font-medium text-foreground">5º dia útil (Salário CLT)</span>
                </label>
              </div>
              {!isFifthBusinessDay ? (
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  placeholder="Ex: 5"
                  required
                />
              ) : (
                <p className="text-[11px] text-muted italic bg-surface p-2 rounded-lg border border-border">
                  Gera no 5º dia útil de cada mês desconsiderando feriados.
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Bloco Específico: Diária por Dia da Semana (Transporte Ortolan) */
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Valor por Dia (R$/dia)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-bold">
                    R$
                  </span>
                  <Input
                    type="text"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    placeholder="45,00"
                    className="pl-8 tabular font-semibold"
                    required
                  />
                </div>
                <p className="text-[10px] text-muted mt-1">Preenchível para reajustes futuros.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Dia de Pagamento
                </label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  placeholder="10"
                  required
                />
                <p className="text-[10px] text-muted mt-1">Dia do mês em que deve estar pago.</p>
              </div>
            </div>

            {/* Dias da Semana Considerados */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Dias de Cobrança na Semana
              </label>
              <div className="flex items-center gap-1.5">
                {WEEKDAYS.map((w) => {
                  const isSelected = selectedDays.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleDay(w.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-navy text-aurora dark:bg-naples dark:text-navy border-transparent shadow-xs"
                          : "bg-background border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted mt-1">Padrão: Segunda a Quinta-feira.</p>
            </div>

            {/* Meses Isentos (Férias) */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Meses Sem Cobrança (Férias)
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {MONTHS_LIST.map((m) => {
                  const isExempt = exemptMonths.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMonth(m.id)}
                      className={`py-1 text-center rounded-lg border text-xs font-semibold transition-all ${
                        isExempt
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40"
                          : "bg-background border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted mt-1">
                Destacados em vermelho não geram pagamento (Padrão: Janeiro e Fevereiro).
              </p>
            </div>

            {/* Mês de Cobrança */}
            <div className="pt-2 border-t border-border/60">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingShift === 1}
                  onChange={(e) => setBillingShift(e.target.checked ? 1 : 0)}
                  className="rounded border-border text-navy dark:text-naples"
                />
                <div>
                  <span className="font-semibold text-foreground block">
                    Pagar no dia {dayOfMonth} do mês seguinte (Ref. ao mês anterior)
                  </span>
                  <span className="text-[11px] text-muted">
                    Exemplo: O transporte usado em Outubro é calculado e vence em 10 de Novembro.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Categoria e Conta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
            >
              <option value="">Selecione...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Conta Vinculada
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 shadow-xs"
            >
              <option value="">Selecione...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Início */}
        <div>
          <Input
            label="Início em"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditing ? "Salvar Alterações" : "Salvar Recorrência"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
