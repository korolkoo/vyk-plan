"use client";

import React, { useEffect, useState } from "react";
import {
  calculatePercentage,
  formatCurrency,
  formatDate,
} from "@/utils/format";
import {
  getCompanyDataAction,
  addCompanyFundEntryAction,
  createCompanyCostAction,
  toggleCompanyCostStatusAction,
  deleteCompanyCostAction,
  type CompanySummaryData,
} from "@/actions/empresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/ui/MoneyText";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  FileText,
  PiggyBank,
  Rocket,
  Shield,
  TrendingUp,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

export default function EmpresaPage() {
  const [companyData, setCompanyData] = useState<CompanySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);

  // Estados dos forms
  const [fundAmount, setFundAmount] = useState("");
  const [fundDate, setFundDate] = useState("");
  const [fundNote, setFundNote] = useState("");

  const [costName, setCostName] = useState("");
  const [costCategory, setCostCategory] = useState<"legal" | "equipment" | "marketing" | "operating">("operating");
  const [costAmount, setCostAmount] = useState("");
  const [costStatus, setCostStatus] = useState<"planned" | "paid">("planned");
  const [costNotes, setCostNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getCompanyDataAction();
      if (res.success && res.data) {
        setCompanyData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setFundDate(new Date().toISOString().split("T")[0]);
    loadData();
  }, []);

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

  const handleAddFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = parseCurrencyInput(fundAmount);
    if (amountCents <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addCompanyFundEntryAction({
        amountCents,
        date: fundDate,
        note: fundNote || null,
      });
      if (res.success) {
        toast.success("Aporte na Empresa VYK registrado!");
        setIsFundModalOpen(false);
        setFundAmount("");
        setFundNote("");
        loadData();
      } else {
        toast.error(res.error || "Erro ao registrar aporte");
      }
    } catch {
      toast.error("Erro ao registrar aporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = parseCurrencyInput(costAmount);
    if (!costName.trim() || amountCents <= 0) {
      toast.error("Preencha nome e valor válidos");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCompanyCostAction({
        name: costName.trim(),
        category: costCategory,
        amountCents,
        status: costStatus,
        notes: costNotes || null,
      });
      if (res.success) {
        toast.success("Custo cadastrado!");
        setIsCostModalOpen(false);
        setCostName("");
        setCostAmount("");
        setCostNotes("");
        loadData();
      } else {
        toast.error(res.error || "Erro ao criar custo");
      }
    } catch {
      toast.error("Erro ao criar custo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCostStatus = async (
    id: string,
    currentStatus: "planned" | "paid"
  ) => {
    const newStatus = currentStatus === "paid" ? "planned" : "paid";
    try {
      const res = await toggleCompanyCostStatusAction(id, newStatus);
      if (res.success) {
        toast.success(newStatus === "paid" ? "Marcado como liquidado!" : "Marcado como previsto");
        loadData();
      }
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteCost = async (id: string) => {
    if (!confirm("Deseja realmente remover este custo?")) return;
    try {
      const res = await deleteCompanyCostAction(id);
      if (res.success) {
        toast.success("Custo removido");
        loadData();
      }
    } catch {
      toast.error("Erro ao remover custo");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "legal":
        return Shield;
      case "equipment":
        return Cpu;
      case "marketing":
        return Rocket;
      default:
        return Briefcase;
    }
  };

  if (isLoading || !companyData) {
    return (
      <div className="py-20 text-center text-sm text-muted">
        Carregando dados da Empresa VYK...
      </div>
    );
  }

  const { settings, reserveCents, totalCostsCents, paidCostsCents, daysRemaining, costItems, fundEntries } = companyData;
  const remainingCapitalCents = Math.max(0, settings.targetCapitalCents - reserveCents);
  const progressPct = calculatePercentage(reserveCents, settings.targetCapitalCents);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Principal da Empresa VYK */}
      <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-navy via-navy to-navy-deep text-aurora p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-naples/20 text-naples border border-naples/30 text-xs font-semibold">
              <Rocket className="w-3.5 h-3.5" />
              <span>Ambiente Compartilhado · Yuri & Vithória</span>
            </div>
            <h1 className="text-3xl sm:text-4xl text-aurora font-bold">
              Empresa VYK
            </h1>
            <p className="text-powder text-sm max-w-xl">
              Planejamento e construção da nossa futura empresa. Acúmulo de capital social, infraestrutura e custos operacionais.
            </p>
          </div>

          {/* Contador de Meta */}
          {settings.targetLaunchDate && (
            <div className="bg-surface/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 text-center min-w-44 shrink-0">
              <span className="text-3xl sm:text-4xl font-extrabold font-display text-naples tabular">
                {daysRemaining}
              </span>
              <p className="text-xs text-powder uppercase font-medium tracking-wider mt-1">
                Dias até o Lançamento
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Métricas Principais da Empresa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Reserva Atual */}
        <Card variant="alice" className="cursor-pointer hover:border-navy transition-all" onClick={() => setIsFundModalOpen(true)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Reserva Acumulada
              </span>
              <PiggyBank className="w-4 h-4 text-navy dark:text-naples" />
            </div>
            <p className="text-2xl font-bold tabular text-navy dark:text-aurora">
              <MoneyText cents={reserveCents} />
            </p>
            <p className="text-xs text-muted mt-1 flex items-center justify-between">
              <span>{fundEntries.length} aportes</span>
              <span className="text-navy dark:text-naples font-semibold">+ Aportar →</span>
            </p>
          </CardContent>
        </Card>

        {/* Meta de Capital Inicial */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Meta de Capital
              </span>
              <Coins className="w-4 h-4 text-income" />
            </div>
            <p className="text-2xl font-bold tabular text-income">
              <MoneyText cents={settings.targetCapitalCents} />
            </p>
            <p className="text-xs text-muted mt-1">Capital inicial almejado</p>
          </CardContent>
        </Card>

        {/* Custos Já Pagos */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Custos Pagos
              </span>
              <CheckCircle2 className="w-4 h-4 text-muted" />
            </div>
            <p className="text-2xl font-bold tabular text-foreground">
              <MoneyText cents={paidCostsCents} />
            </p>
            <p className="text-xs text-muted mt-1">Domínios e registros</p>
          </CardContent>
        </Card>

        {/* Capital Restante */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Falta Guardar
              </span>
              <TrendingUp className="w-4 h-4 text-expense" />
            </div>
            <p className="text-2xl font-bold tabular text-expense">
              <MoneyText cents={remainingCapitalCents} />
            </p>
            <p className="text-xs text-muted mt-1">Para completar a meta</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Progresso do Capital Social */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progresso do Capital Inicial</CardTitle>
            <span className="text-sm font-bold tabular text-navy dark:text-naples">
              {progressPct}% alcançado
            </span>
          </div>
          <CardDescription>
            Reserva acumulada para investimento na constituição da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ProgressBar value={progressPct} size="lg" color="accent" />
          <div className="flex justify-between text-xs text-muted pt-1">
            <span>
              Guardado: <MoneyText cents={reserveCents} />
            </span>
            <span>
              Meta: <MoneyText cents={settings.targetCapitalCents} />
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Custos Planejados + Aportes Realizados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custos e Infraestrutura Planejada (2 colunas) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Investimentos & Custos de Abertura
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCostModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Custo
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {costItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted">
                  Nenhum custo cadastrado ainda.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {costItems.map((cost) => {
                    const Icon = getCategoryIcon(cost.category);
                    const isPaid = cost.status === "paid";

                    return (
                      <div
                        key={cost.id}
                        className="flex items-center justify-between p-4 sm:px-6 hover:bg-surface/50 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleCostStatus(cost.id, cost.status)}
                            className="w-10 h-10 rounded-xl bg-powder/20 text-navy dark:text-powder flex items-center justify-center shrink-0 hover:bg-powder/30 transition-colors"
                            title="Alternar status (Liquidado / Previsto)"
                          >
                            <Icon className="w-5 h-5" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {cost.name}
                              </p>
                              <Badge
                                variant={isPaid ? "success" : "neutral"}
                                size="sm"
                              >
                                {isPaid ? "Liquidado" : "Previsto"}
                              </Badge>
                            </div>
                            {cost.notes && (
                              <p className="text-xs text-muted mt-0.5">
                                {cost.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold tabular text-foreground">
                            <MoneyText cents={cost.amountCents} />
                          </p>
                          <button
                            type="button"
                            onClick={() => handleDeleteCost(cost.id)}
                            className="p-1.5 text-muted hover:text-rose-500 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Aportes para a Empresa (1 coluna) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Aportes na Reserva
            </h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsFundModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Aportar
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {fundEntries.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted">
                  Nenhum aporte registrado ainda.
                </div>
              ) : (
                <div className="divide-y divide-border/60 max-h-[360px] overflow-y-auto">
                  {fundEntries.map((entry) => (
                    <div key={entry.id} className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {entry.note ?? "Aporte conjunto"}
                        </span>
                        <span className="text-sm font-bold tabular text-income">
                          +<MoneyText cents={entry.amountCents} />
                        </span>
                      </div>
                      <p className="text-[11px] text-muted">
                        {formatDate(entry.date)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Aporte Empresa */}
      <Modal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        title="Novo Aporte — Empresa VYK"
        description="Destine valores compartilhados para o capital inicial da empresa."
        maxWidth="sm"
      >
        <form onSubmit={handleAddFund} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                R$
              </span>
              <Input
                type="text"
                value={fundAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setFundAmount)}
                placeholder="0,00"
                className="pl-9 font-semibold tabular"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Data
            </label>
            <Input
              type="date"
              value={fundDate}
              onChange={(e) => setFundDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Observação (Opcional)
            </label>
            <Input
              value={fundNote}
              onChange={(e) => setFundNote(e.target.value)}
              placeholder="Ex.: Aporte inicial Yuri & Vithória"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsFundModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Confirmar Aporte
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Custo Empresa */}
      <Modal
        isOpen={isCostModalOpen}
        onClose={() => setIsCostModalOpen(false)}
        title="Novo Custo / Investimento"
        description="Cadastre custos de registro, equipamentos ou marketing."
        maxWidth="sm"
      >
        <form onSubmit={handleAddCost} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Nome do Custo
            </label>
            <Input
              value={costName}
              onChange={(e) => setCostName(e.target.value)}
              placeholder="Ex.: Domínio e Hospedagem, Registro CNPJ"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Categoria
              </label>
              <select
                value={costCategory}
                onChange={(e) => setCostCategory(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-foreground text-sm"
              >
                <option value="operating">Operacional</option>
                <option value="legal">Jurídico / CNPJ</option>
                <option value="equipment">Equipamentos</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={costStatus}
                onChange={(e) => setCostStatus(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-foreground text-sm"
              >
                <option value="planned">Previsto</option>
                <option value="paid">Liquidado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                R$
              </span>
              <Input
                type="text"
                value={costAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setCostAmount)}
                placeholder="0,00"
                className="pl-9 font-semibold tabular"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Observações
            </label>
            <Input
              value={costNotes}
              onChange={(e) => setCostNotes(e.target.value)}
              placeholder="Ex.: Renovação anual"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsCostModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Salvar Custo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
