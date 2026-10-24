"use client";

import React, { useEffect, useState } from "react";
import {
  calculatePercentage,
  formatCurrency,
  formatDate,
  getDaysRemaining,
} from "@/utils/format";
import {
  mockCompanyCosts,
  mockCompanyFundEntries,
  mockCompanySettings,
  mockCompanySummary,
} from "@/mocks/empresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/ui/MoneyText";
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
} from "lucide-react";

export default function EmpresaPage() {
  const [daysRemaining, setDaysRemaining] = useState<number>(0);

  useEffect(() => {
    if (mockCompanySettings.targetLaunchDate) {
      setDaysRemaining(getDaysRemaining(mockCompanySettings.targetLaunchDate));
    }
  }, []);

  const totalCapitalTarget = mockCompanySettings.targetCapitalCents;
  const currentReserve = mockCompanySummary.reserveCents;
  const progressPct = calculatePercentage(currentReserve, totalCapitalTarget);

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
          {mockCompanySettings.targetLaunchDate && (
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
        <Card variant="alice">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Reserva Acumulada
              </span>
              <PiggyBank className="w-4 h-4 text-navy dark:text-naples" />
            </div>
            <p className="text-2xl font-bold tabular text-navy dark:text-aurora">
              <MoneyText cents={currentReserve} />
            </p>
            <p className="text-xs text-muted mt-1">
              {mockCompanyFundEntries.length} aportes realizados
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
              <MoneyText cents={totalCapitalTarget} />
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
              <MoneyText cents={mockCompanySummary.paidCostsCents} />
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
              <MoneyText cents={mockCompanySummary.remainingCapitalCents} />
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
              Guardado: <MoneyText cents={currentReserve} />
            </span>
            <span>
              Meta: <MoneyText cents={totalCapitalTarget} />
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Custos Planejados + Aportes Realizados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custos e Infraestrutura Planejada (2 colunas) */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Investimentos & Custos de Abertura
          </h2>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {mockCompanyCosts.map((cost) => {
                  const Icon = getCategoryIcon(cost.category);

                  return (
                    <div
                      key={cost.id}
                      className="flex items-center justify-between p-4 sm:px-6 hover:bg-surface/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-powder/20 text-navy dark:text-powder flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {cost.name}
                            </p>
                            <Badge
                              variant={cost.status === "paid" ? "success" : "neutral"}
                              size="sm"
                            >
                              {cost.status === "paid" ? "Liquidado" : "Previsto"}
                            </Badge>
                          </div>
                          {cost.notes && (
                            <p className="text-xs text-muted mt-0.5">
                              {cost.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular text-foreground">
                          <MoneyText cents={cost.amountCents} />
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Aportes para a Empresa (1 coluna) */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Aportes na Reserva
          </h2>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {mockCompanyFundEntries.map((entry) => (
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
