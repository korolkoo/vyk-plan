"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  getGoalContributionsAction,
  deleteContributionAction,
  type GoalWithDetails,
  type GoalContributionItem,
} from "@/actions/metas";
import { formatCurrency, formatDate } from "@/utils/format";
import { History, Trash2, PiggyBank, Plus } from "lucide-react";

interface GoalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalWithDetails | null;
  onOpenContribute: () => void;
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

  const handleDelete = async (id: string, amountCents: number) => {
    if (
      !confirm(
        `Deseja realmente remover este aporte de ${formatCurrency(amountCents)}?`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await deleteContributionAction(id);
      if (res.success) {
        toast.success("Aporte removido com sucesso");
        setContributions((prev) => prev.filter((c) => c.id !== id));
        onSuccess?.();
      } else {
        toast.error(res.error || "Erro ao remover aporte");
      }
    } catch {
      toast.error("Erro ao remover aporte");
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
      description="Todos os aportes e economias destinados para esta meta."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Sumário */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border">
          <div>
            <span className="text-xs text-muted block">Total Economizado</span>
            <span className="text-lg font-bold text-navy dark:text-naples">
              {formatCurrency(goal.savedCents)}
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onClose();
              onOpenContribute();
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Aporte
          </Button>
        </div>

        {/* Lista de Aportes */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted">
              Carregando histórico...
            </div>
          ) : contributions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted space-y-2">
              <History className="w-8 h-8 mx-auto opacity-30" />
              <p>Nenhum aporte registrado ainda.</p>
            </div>
          ) : (
            contributions.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      {c.note || "Aporte na meta"}
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatDate(c.date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular">
                    +{formatCurrency(c.amountCents)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id, c.amountCents)}
                    disabled={deletingId === c.id}
                    className="text-muted hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                    title="Excluir aporte"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
