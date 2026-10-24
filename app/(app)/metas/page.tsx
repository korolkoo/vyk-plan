import React from "react";
import { calculatePercentage, formatCurrency, formatDate } from "@/utils/format";
import { mockGoals } from "@/mocks/financas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Plane, ShieldCheck, Target } from "lucide-react";

export default function MetasPage() {
  const getGoalIcon = (iconName: string) => {
    switch (iconName) {
      case "ShieldCheck":
        return ShieldCheck;
      case "Plane":
        return Plane;
      default:
        return Target;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground">Metas Pessoais</h1>
          <p className="text-sm text-muted mt-1">
            Planejamento de objetivos de médio e longo prazo.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockGoals.map((goal) => {
          const Icon = getGoalIcon(goal.icon);
          const progressPct = calculatePercentage(
            goal.savedCents,
            goal.targetCents
          );

          return (
            <Card key={goal.id}>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white"
                      style={{ backgroundColor: goal.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {goal.name}
                      </h3>
                      {goal.targetDate && (
                        <p className="text-xs text-muted">
                          Prazo: {formatDate(goal.targetDate)}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-lg font-bold tabular text-navy dark:text-naples">
                    {progressPct}%
                  </span>
                </div>

                <div className="space-y-2">
                  <ProgressBar value={progressPct} size="md" color="accent" />
                  <div className="flex items-center justify-between text-xs text-muted pt-1">
                    <span>Guardado: {formatCurrency(goal.savedCents)}</span>
                    <span>Alvo: {formatCurrency(goal.targetCents)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
