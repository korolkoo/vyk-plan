"use client";

import React from "react";
import {
  calculatePercentage,
  formatCurrency,
  formatDate,
  getDaysRemaining,
} from "@/utils/format";
import {
  mockWeddingFundEntries,
  mockWeddingItems,
  mockWeddingSettings,
  mockWeddingSummary,
} from "@/mocks/casamento";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Calendar, Gem, PiggyBank, Sparkles, TrendingUp } from "lucide-react";

export default function CasamentoPage() {
  const [daysRemaining, setDaysRemaining] = React.useState<number>(0);

  React.useEffect(() => {
    if (mockWeddingSettings.weddingDate) {
      setDaysRemaining(getDaysRemaining(mockWeddingSettings.weddingDate));
    }
  }, []);

  const totalCommitted = mockWeddingSummary.committedCents;
  const totalCovered = mockWeddingSummary.paidCents + mockWeddingSummary.reserveCents;
  const progressPct = calculatePercentage(totalCovered, totalCommitted);

  return (
    <div className="space-y-6">
      {/* Topo / Banner Regressivo */}
      <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-navy via-navy to-navy-deep text-aurora p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-naples/20 text-naples border border-naples/30 text-xs font-semibold">
              <Gem className="w-3.5 h-3.5" />
              <span>Yuri & Vithória</span>
            </div>
            <h1 className="text-3xl sm:text-4xl text-aurora font-bold">
              Planejamento do Casamento
            </h1>
            <p className="text-powder text-sm max-w-xl">
              {mockWeddingSettings.weddingDate
                ? `Grande dia marcado para ${formatDate(mockWeddingSettings.weddingDate)}.`
                : "Defina a data do casamento nas configurações."}
            </p>
          </div>

          {/* Contador Regressivo */}
          {mockWeddingSettings.weddingDate && (
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Reserva no Cofrinho */}
        <Card variant="alice">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Reserva Atual
              </span>
              <PiggyBank className="w-4 h-4 text-navy dark:text-naples" />
            </div>
            <p className="text-2xl font-bold tabular text-navy dark:text-aurora">
              {formatCurrency(mockWeddingSummary.reserveCents)}
            </p>
            <p className="text-xs text-muted mt-1">
              {mockWeddingFundEntries.length} aportes registrados
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
              {formatCurrency(mockWeddingSummary.paidCents)}
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
              {formatCurrency(mockWeddingSummary.committedCents)}
            </p>
            <p className="text-xs text-muted mt-1">
              Contratos fechados e itens
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
              {formatCurrency(mockWeddingSummary.remainingCents)}
            </p>
            <p className="text-xs text-muted mt-1">
              Previsão: {mockWeddingSummary.projectedPayoffDate ? formatDate(mockWeddingSummary.projectedPayoffDate) : "—"}
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
            Soma da reserva em conta + parcelas já pagas em relação ao total contratado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ProgressBar value={progressPct} size="lg" color="accent" />
          <div className="flex justify-between text-xs text-muted pt-1">
            <span>Garantido: {formatCurrency(totalCovered)}</span>
            <span>Meta: {formatCurrency(totalCommitted)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Itens do Casamento */}
      <Card>
        <CardHeader>
          <CardTitle>Contratos e Fornecedores</CardTitle>
          <CardDescription>
            Itens planejados para a cerimônia e festa
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {mockWeddingItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 gap-3 hover:bg-surface/50 transition-colors"
              >
                <div>
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

                <div className="text-right shrink-0">
                  <p className="text-base font-bold tabular text-foreground">
                    {formatCurrency(item.totalCents)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
