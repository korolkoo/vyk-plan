"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import {
  getGoalContributionsAction,
  deleteContributionAction,
  type GoalWithDetails,
  type GoalContributionItem,
} from "@/actions/metas";
import { formatCurrency, formatDate } from "@/utils/format";
import {
  History,
  Trash2,
  PiggyBank,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
} from "lucide-react";

interface GoalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalWithDetails | null;
  onOpenContribute: (mode?: "deposit" | "withdraw") => void;
  onSuccess?: () => void;
}

export function GoalDetailsModal({
  isOpen,
  onClose,
  goal,
  onOpenContribute,
  onSuccess,
}: GoalDetailsModalProps) {
  const [contributions, setContributions] = useState<GoalContributionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadContributions = async () => {
    if (!goal) return;
    setIsLoading(true);
    try {
      const res = await getGoalContributionsAction(goal.id);
      if (res.success && res.contributions) {
        setContributions(res.contributions);
      } else {
        toast.error(res.error || "Erro ao carregar histórico");
      }
    } catch {
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && goal) {
      loadContributions();
    }
  }, [isOpen, goal?.id]);

  const [contributionToDelete, setContributionToDelete] = useState<{
    id: string;
    amountCents: number;
  } | null>(null);

  const handleConfirmDelete = async () => {
    if (!contributionToDelete) return;

    setDeletingId(contributionToDelete.id);
    try {
      const res = await deleteContributionAction(contributionToDelete.id);
      if (res.success) {
        toast.success("Movimentação removida com sucesso");
        setContributions((prev) => prev.filter((c) => c.id !== contributionToDelete.id));
        setContributionToDelete(null);
        onSuccess?.();
      } else {
        toast.error(res.error || "Erro ao remover registro");
      }
    } catch {
      toast.error("Erro ao remover registro");
    } finally {
      setDeletingId(null);
    }
  };

  if (!goal) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Histórico: ${goal.name}`}
      description="Aportes e resgates vinculados a esta meta."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Banner de Provisão Recomendada até a Data Alvo */}
        {goal.targetDate && goal.recommendedMonthlyCents && goal.recommendedMonthlyCents > 0 && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-powder/20 to-powder/5 border border-powder/40 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-powder shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-foreground">
                Planejamento de Provisão Mensal
              </p>
              <p className="text-muted">
                Para ter o valor total de <strong>{formatCurrency(goal.targetCents)}</strong> garantido até{" "}
                <strong>{formatDate(goal.targetDate)}</strong>, a indicação é guardar{" "}
                <span className="text-navy dark:text-naples font-bold">
                  {formatCurrency(goal.recommendedMonthlyCents)}/mês
                </span>{" "}
                (restando {goal.monthsRemaining} meses).
              </p>
            </div>
          </div>
        )}

        {/* Sumário */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-border">
          <div>
            <span className="text-xs text-muted block">Saldo Atual Reservado</span>
            <span className="text-xl font-bold tabular text-navy dark:text-naples">
              {formatCurrency(goal.savedCents)}
            </span>
            <span className="text-xs text-muted block mt-0.5">
              Meta Alvo: {formatCurrency(goal.targetCents)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose();
                onOpenContribute("withdraw");
              }}
              className="flex items-center gap-1.5 text-xs text-expense hover:bg-expense/10"
              title="Resgatar ou descontar da meta"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Resgatar (-)
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onClose();
                onOpenContribute("deposit");
              }}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Aportar (+)
            </Button>
          </div>
        </div>

        {/* Lista de Movimentações */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted">
              Carregando histórico...
            </div>
          ) : contributions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted space-y-2">
              <History className="w-8 h-8 mx-auto opacity-30" />
              <p>Nenhuma movimentação registrada ainda.</p>
            </div>
          ) : (
            contributions.map((c) => {
              const isWithdraw = c.amountCents < 0;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-surface/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isWithdraw
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isWithdraw ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <PiggyBank className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {c.note || (isWithdraw ? "Resgate da meta" : "Aporte na meta")}
                      </span>
                      <span className="text-[11px] text-muted">
                        {formatDate(c.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-bold tabular ${
                        isWithdraw
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isWithdraw
                        ? `-${formatCurrency(Math.abs(c.amountCents))}`
                        : `+${formatCurrency(c.amountCents)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setContributionToDelete({
                          id: c.id,
                          amountCents: c.amountCents,
                        })
                      }
                      disabled={deletingId === c.id}
                      className="text-muted hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                      title="Excluir registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* Modal In-App de Confirmação de Exclusão */}
      {contributionToDelete && (
        <ConfirmModal
          isOpen={!!contributionToDelete}
          onClose={() => setContributionToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Remover Registro"
          description={`Deseja realmente remover esta movimentação de ${formatCurrency(
            Math.abs(contributionToDelete.amountCents)
          )}? O saldo da meta será recalculado automaticamente.`}
          confirmText="Remover"
          cancelText="Cancelar"
          variant="danger"
        />
      )}
    </Modal>
  );
}
