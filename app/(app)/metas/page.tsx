"use client";

import React, { useState, useEffect } from "react";
import { calculatePercentage, formatCurrency, formatDate } from "@/utils/format";
import { Card, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { usePrivacyStore } from "@/store/usePrivacyStore";
import { getGoalsAction, type GoalWithDetails } from "@/actions/metas";
import { GoalModal } from "@/components/metas/GoalModal";
import { ContributeGoalModal } from "@/components/metas/ContributeGoalModal";
import { GoalDetailsModal } from "@/components/metas/GoalDetailsModal";
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
  Plus,
  PiggyBank,
  History,
  MoreVertical,
  Edit2,
  Calendar,
} from "lucide-react";

export default function MetasPage() {
  const { isPrivate: isPrivacyMode } = usePrivacyStore();

  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [totalSavedCents, setTotalSavedCents] = useState(0);
  const [totalTargetCents, setTotalTargetCents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithDetails | null>(null);

  const [contributeGoal, setContributeGoal] = useState<GoalWithDetails | null>(null);
  const [detailsGoal, setDetailsGoal] = useState<GoalWithDetails | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getGoalsAction();
      if (res.success && res.goals) {
        setGoals(res.goals);
        setTotalSavedCents(res.totalSavedCents || 0);
        setTotalTargetCents(res.totalTargetCents || 0);
      }
    } catch (err) {
      console.error("Erro ao buscar metas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getGoalIcon = (iconName: string) => {
    switch (iconName) {
      case "ShieldCheck":
        return ShieldCheck;
      case "Plane":
        return Plane;
      case "Home":
        return Home;
      case "Car":
        return Car;
      case "TrendingUp":
        return TrendingUp;
      case "GraduationCap":
        return GraduationCap;
      case "Laptop":
        return Laptop;
      case "Heart":
        return Heart;
      case "Sparkles":
        return Sparkles;
      case "Gift":
        return Gift;
      case "Trophy":
        return Trophy;
      default:
        return Target;
    }
  };

  const globalProgress =
    totalTargetCents > 0
      ? calculatePercentage(totalSavedCents, totalTargetCents)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground">Metas & Reservas</h1>
          <p className="text-sm text-muted mt-1">
            Planejamento de objetivos, reservas e provisões para compromissos futuros (ex.: Faculdade após a bolsa, IPVA). O valor reservado fica blindado e fora do saldo livre para gastar.
          </p>
        </div>


        <Button
          variant="primary"
          onClick={() => {
            setEditingGoal(null);
            setIsGoalModalOpen(true);
          }}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Meta
        </Button>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wider">
                Total Guardado
              </p>
              <p className="text-2xl font-bold text-navy dark:text-naples tabular mt-1">
                {isPrivacyMode ? "••••••" : formatCurrency(totalSavedCents)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy dark:bg-naples/20 dark:text-naples flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wider">
                Objetivo Total
              </p>
              <p className="text-2xl font-bold text-foreground tabular mt-1">
                {isPrivacyMode ? "••••••" : formatCurrency(totalTargetCents)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface border border-border text-muted flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wider">
                Progresso Geral
              </p>
              <p className="text-2xl font-bold text-foreground tabular mt-1">
                {globalProgress}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface border border-border text-muted flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Metas */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted">
          Carregando metas...
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border mx-auto flex items-center justify-center text-muted">
              <Target className="w-6 h-6" />
            </div>
            <div className="max-w-sm mx-auto">
              <h3 className="font-semibold text-foreground">Nenhuma meta criada</h3>
              <p className="text-xs text-muted mt-1">
                Comece definindo objetivos para suas economias: reserva de emergência, viagens, compras futuras ou investimentos.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingGoal(null);
                setIsGoalModalOpen(true);
              }}
            >
              Criar Primeira Meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const Icon = getGoalIcon(goal.icon);
            const progressPct = calculatePercentage(
              goal.savedCents,
              goal.targetCents
            );
            const remainingCents = Math.max(0, goal.targetCents - goal.savedCents);

            return (
              <Card key={goal.id} className="relative group overflow-hidden">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: goal.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base">
                          {goal.name}
                        </h3>
                        {goal.targetDate && (
                          <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Prazo: {formatDate(goal.targetDate)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold tabular text-navy dark:text-naples">
                        {progressPct}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGoal(goal);
                          setIsGoalModalOpen(true);
                        }}
                        className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors"
                        title="Editar Meta"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ProgressBar value={progressPct} size="md" color="accent" />
                    <div className="flex items-center justify-between text-xs text-muted pt-1">
                      <span>
                        Guardado:{" "}
                        <strong className="text-foreground">
                          {isPrivacyMode
                            ? "••••••"
                            : formatCurrency(goal.savedCents)}
                        </strong>
                      </span>
                      <span>
                        Alvo:{" "}
                        <strong className="text-foreground">
                          {isPrivacyMode
                            ? "••••••"
                            : formatCurrency(goal.targetCents)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Rodapé do card: Ações rápidas */}
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted">
                      {remainingCents === 0 ? (
                        <span className="text-emerald-500 font-semibold">
                          🎉 Meta atingida!
                        </span>
                      ) : (
                        `Faltam ${isPrivacyMode ? "••••••" : formatCurrency(remainingCents)}`
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailsGoal(goal)}
                        className="text-xs h-8 px-2.5 flex items-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5" />
                        Histórico ({goal.contributionsCount})
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setContributeGoal(goal)}
                        className="text-xs h-8 px-2.5 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Aportar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        goalToEdit={editingGoal}
        onSuccess={loadData}
      />

      <ContributeGoalModal
        isOpen={!!contributeGoal}
        onClose={() => setContributeGoal(null)}
        goal={contributeGoal}
        onSuccess={loadData}
      />

      <GoalDetailsModal
        isOpen={!!detailsGoal}
        onClose={() => setDetailsGoal(null)}
        goal={detailsGoal}
        onOpenContribute={() => {
          if (detailsGoal) setContributeGoal(detailsGoal);
        }}
        onSuccess={loadData}
      />
    </div>
  );
}
