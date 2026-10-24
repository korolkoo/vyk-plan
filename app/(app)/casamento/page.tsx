"use client";

import React, { useState, useEffect } from "react";
import {
  calculatePercentage,
  formatCurrency,
  formatDate,
} from "@/utils/format";
import {
  getWeddingDataAction,
  toggleWeddingInstallmentPaidAction,
  type WeddingSummaryData,
  type WeddingItemWithInstallments,
} from "@/actions/casamento";
import { usePrivacyStore } from "@/store/usePrivacyStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WeddingItemModal } from "@/components/casamento/WeddingItemModal";
import { WeddingFundModal } from "@/components/casamento/WeddingFundModal";
import { WeddingSettingsModal } from "@/components/casamento/WeddingSettingsModal";
import {
  Calendar,
  Gem,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Plus,
  Settings,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Edit2,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

export default function CasamentoPage() {
  const { isPrivate: isPrivacyMode } = usePrivacyStore();

  const [weddingData, setWeddingData] = useState<WeddingSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WeddingItemWithInstallments | null>(null);

  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Accordion de parcelas por item
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getWeddingDataAction();
      if (res.success && res.data) {
        setWeddingData(res.data);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do casamento:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleInstallment = async (installmentId: string, currentPaid: boolean) => {
    try {
      const res = await toggleWeddingInstallmentPaidAction(installmentId, !currentPaid);
      if (res.success) {
        toast.success(!currentPaid ? "Parcela marcada como paga!" : "Parcela desmarcada");
        loadData();
      } else {
        toast.error("Erro ao atualizar parcela");
      }
    } catch {
      toast.error("Erro ao atualizar parcela");
    }
  };

  if (isLoading || !weddingData) {
    return (
      <div className="py-20 text-center text-sm text-muted">
        Carregando planejamento do casamento...
      </div>
    );
  }

  const {
    settings,
    reserveCents,
    committedCents,
    paidCents,
    remainingCents,
    daysRemaining,
    projectedPayoffDate,
    items,
    fundEntries,
  } = weddingData;

  const totalCovered = paidCents + reserveCents;
  const progressPct =
    committedCents > 0 ? calculatePercentage(totalCovered, committedCents) : 0;

  return (
    <div className="space-y-6">
      {/* Topo / Banner Regressivo */}
      <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-navy via-navy to-navy-deep text-aurora p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-naples/20 text-naples border border-naples/30 text-xs font-semibold">
                <Gem className="w-3.5 h-3.5" />
                <span>Yuri & Vithória</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-1 rounded-lg text-powder/70 hover:text-naples hover:bg-white/10 transition-colors"
                title="Configurar Casamento"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <h1 className="text-3xl sm:text-4xl text-aurora font-bold">
              Planejamento do Casamento
            </h1>
            <p className="text-powder text-sm max-w-xl">
              {settings.weddingDate
                ? `Grande dia marcado para ${formatDate(settings.weddingDate)}.`
                : "Defina a data do casamento para ver a contagem regressiva."}
            </p>
          </div>

          {/* Contador Regressivo */}
          {settings.weddingDate && (
            <div className="bg-surface/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 text-center min-w-40 shrink-0">
              <span className="text-3xl sm:text-4xl font-extrabold font-display text-naples tabular">
                {daysRemaining}
              </span>
              <p className="text-xs text-powder uppercase font-medium tracking-wider mt-1">
                Dias Restantes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Painel Financeiro do Casamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Reserva no Cofrinho */}
        <Card variant="alice" className="relative cursor-pointer hover:border-navy transition-all" onClick={() => setIsFundModalOpen(true)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Reserva Atual
              </span>
              <PiggyBank className="w-4 h-4 text-navy dark:text-naples" />
            </div>
            <p className="text-2xl font-bold tabular text-navy dark:text-aurora">
              {isPrivacyMode ? "••••••" : formatCurrency(reserveCents)}
            </p>
            <p className="text-xs text-muted mt-1 flex items-center justify-between">
              <span>{fundEntries.length} aportes</span>
              <span className="text-navy dark:text-naples font-semibold">Abrir Cofrinho →</span>
            </p>
          </CardContent>
        </Card>

        {/* Já Pago aos Fornecedores */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total Já Pago
              </span>
              <TrendingUp className="w-4 h-4 text-income" />
            </div>
            <p className="text-2xl font-bold tabular text-income">
              {isPrivacyMode ? "••••••" : formatCurrency(paidCents)}
            </p>
            <p className="text-xs text-muted mt-1">Parcelas quitadas</p>
          </CardContent>
        </Card>

        {/* Total Comprometido */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Comprometido
              </span>
              <Gem className="w-4 h-4 text-muted" />
            </div>
            <p className="text-2xl font-bold tabular text-foreground">
              {isPrivacyMode ? "••••••" : formatCurrency(committedCents)}
            </p>
            <p className="text-xs text-muted mt-1">
              {items.length} itens cadastrados
            </p>
          </CardContent>
        </Card>

        {/* Restante para Quitar */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Restante
              </span>
              <Sparkles className="w-4 h-4 text-expense" />
            </div>
            <p className="text-2xl font-bold tabular text-expense">
              {isPrivacyMode ? "••••••" : formatCurrency(remainingCents)}
            </p>
            <p className="text-xs text-muted mt-1">
              {projectedPayoffDate ? `Prev: ${formatDate(projectedPayoffDate)}` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Progresso Geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progresso do Dinheiro</CardTitle>
            <span className="text-sm font-bold tabular text-navy dark:text-naples">
              {progressPct}% garantido
            </span>
          </div>
          <CardDescription>
            Soma da reserva no cofrinho + parcelas já pagas em relação ao total contratado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ProgressBar value={progressPct} size="lg" color="accent" />
          <div className="flex justify-between text-xs text-muted pt-1">
            <span>
              Garantido:{" "}
              <strong className="text-foreground">
                {isPrivacyMode ? "••••••" : formatCurrency(totalCovered)}
              </strong>
            </span>
            <span>
              Meta Contratada:{" "}
              <strong className="text-foreground">
                {isPrivacyMode ? "••••••" : formatCurrency(committedCents)}
              </strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Itens do Casamento */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Contratos e Fornecedores</CardTitle>
            <CardDescription>
              Serviços e fornecedores planejados para a cerimônia e festa.
            </CardDescription>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <Gem className="w-10 h-10 text-muted mx-auto opacity-40" />
              <p className="text-sm text-muted">
                Nenhum contrato ou fornecedor cadastrado ainda.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
              >
                Cadastrar Primeiro Item
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((item) => {
                const isExpanded = expandedItemId === item.id;
                const hasInstallments = item.installments && item.installments.length > 0;

                return (
                  <div key={item.id} className="transition-colors hover:bg-surface/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {item.name}
                          </p>
                          <Badge
                            variant={
                              item.status === "paid"
                                ? "success"
                                : item.status === "closed"
                                ? "info"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {item.status === "paid"
                              ? "Quitado"
                              : item.status === "closed"
                              ? "Fechado"
                              : "Orçando"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          Fornecedor: {item.supplier ?? "Não definido"} · Contato: {item.contact ?? "—"}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted/80 mt-1 italic">
                            &quot;{item.notes}&quot;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-right">
                          <p className="text-base font-bold tabular text-foreground">
                            {isPrivacyMode ? "••••••" : formatCurrency(item.totalCents)}
                          </p>
                          {hasInstallments && (
                            <p className="text-[11px] text-muted">
                              Pago: {isPrivacyMode ? "••••••" : formatCurrency(item.paidCents)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {hasInstallments && (
                            <button
                              type="button"
                              onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                              className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface"
                              title="Ver parcelas"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsItemModalOpen(true);
                            }}
                            className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface"
                            title="Editar item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lista expandida de parcelas */}
                    {isExpanded && hasInstallments && (
                      <div className="px-4 sm:px-6 pb-4 pt-1 bg-surface/40 border-t border-border/40">
                        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-2">
                          Parcelas ({item.installments.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {item.installments.map((inst, idx) => {
                            const isPaid = !!inst.paidAt;
                            return (
                              <div
                                key={inst.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                                  isPaid
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-surface border-border text-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleInstallment(inst.id, isPaid)}
                                    className="text-muted hover:text-foreground transition-colors"
                                  >
                                    {isPaid ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                      <Circle className="w-4 h-4" />
                                    )}
                                  </button>
                                  <div>
                                    <span className="font-semibold block">
                                      Parcela {idx + 1}/{item.installments.length}
                                    </span>
                                    <span className="text-[10px] text-muted flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDate(inst.dueDate)}
                                    </span>
                                  </div>
                                </div>

                                <span className="font-bold tabular">
                                  {isPrivacyMode ? "••••••" : formatCurrency(inst.amountCents)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <WeddingItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        itemToEdit={editingItem}
        onSuccess={loadData}
      />

      <WeddingFundModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        entries={fundEntries}
        reserveCents={reserveCents}
        onSuccess={loadData}
      />

      <WeddingSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentDate={settings.weddingDate}
        currentBudgetCents={settings.totalBudgetCents}
        onSuccess={loadData}
      />
    </div>
  );
}
