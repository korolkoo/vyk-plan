"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { MoneyText } from "@/components/ui/MoneyText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getPendingAutoTransactionsAction,
  confirmAutoTransactionCategoryAction,
  dismissAutoTransactionAction,
  getDueRemindersAction,
  type PendingAutoTransaction,
  type DueReminder,
} from "@/actions/automacao";
import { getCategoriesAction } from "@/actions/categorias";
import type { Category } from "@/types/types";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Gem,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";

interface PendingReviewBannerProps {
  onUpdated?: () => void;
}

export function PendingReviewBanner({ onUpdated }: PendingReviewBannerProps) {
  const [pendingTxs, setPendingTxs] = useState<PendingAutoTransaction[]>([]);
  const [dueReminders, setDueReminders] = useState<DueReminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSelectTxId, setActiveSelectTxId] = useState<string | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [txs, remindersData, cats] = await Promise.all([
        getPendingAutoTransactionsAction(),
        getDueRemindersAction(),
        getCategoriesAction(),
      ]);
      setPendingTxs(txs);
      setDueReminders(remindersData.reminders);
      setCategories(cats);
    } catch (e) {
      console.error("Erro ao carregar notificações pendentes:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmCategory = async (txId: string, categoryId: string) => {
    setIsProcessingId(txId);
    try {
      await confirmAutoTransactionCategoryAction(txId, categoryId);
      toast.success("Movimentação categorizada com sucesso!");
      setPendingTxs((prev) => prev.filter((t) => t.id !== txId));
      if (onUpdated) onUpdated();
    } catch {
      toast.error("Erro ao confirmar categoria");
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleDismiss = async (txId: string) => {
    setIsProcessingId(txId);
    try {
      await dismissAutoTransactionAction(txId);
      toast.success("Movimentação descartada");
      setPendingTxs((prev) => prev.filter((t) => t.id !== txId));
      if (onUpdated) onUpdated();
    } catch {
      toast.error("Erro ao descartar movimentação");
    } finally {
      setIsProcessingId(null);
    }
  };

  if (pendingTxs.length === 0 && dueReminders.length === 0) {
    return null;
  }

  const todayReminders = dueReminders.filter((r) => r.isToday);
  const tomorrowReminders = dueReminders.filter((r) => r.isTomorrow);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. LEMBRETES DE CONTAS A VENCER (HOJE E AMANHÃ) */}
      {dueReminders.length > 0 && (
        <div className="p-4 rounded-2xl border border-warning/30 bg-warning/10 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-warning">
                  Lembrete de Vencimentos
                </span>
                {todayReminders.length > 0 && (
                  <Badge variant="warning" size="sm">
                    {todayReminders.length} vence(m) hoje
                  </Badge>
                )}
                {tomorrowReminders.length > 0 && (
                  <Badge variant="neutral" size="sm">
                    {tomorrowReminders.length} amanhã
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {dueReminders.map((r) => r.title).slice(0, 3).join(", ")}
                {dueReminders.length > 3 ? ` e mais ${dueReminders.length - 3}...` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. NOVAS COMPRAS CAPTURADAS AUTOMATICAMENTE (PENDENTES DE CATEGORIA) */}
      {pendingTxs.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-navy/20 dark:border-naples/30 bg-gradient-to-br from-surface to-background shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-navy dark:text-naples" />
                <span>Nova movimentação capturada ({pendingTxs.length})</span>
              </h3>
            </div>
            <span className="text-[11px] text-muted">Aprovação com 1 toque</span>
          </div>

          <div className="space-y-3">
            {pendingTxs.map((tx) => {
              const isCard = tx.channel === "credit_card";
              const isIncome = tx.type === "income";
              const isSelectingOther = activeSelectTxId === tx.id;
              const hasSuggestedCategory = !!tx.suggestedCategoryId && !!tx.suggestedCategoryName;

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl border border-border bg-surface/80 hover:border-foreground/20 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">
                          {tx.establishment || tx.description}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface border border-border text-muted">
                          {isCard ? (
                            <>
                              <CreditCard className="w-3 h-3 text-warning" />
                              <span>Cartão Banrisul</span>
                            </>
                          ) : (
                            <span>Pix Banrisul</span>
                          )}
                        </span>
                      </div>

                      <p className="text-xs text-muted truncate max-w-sm">
                        {tx.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-base font-extrabold tabular ${
                          isIncome ? "text-income" : "text-foreground"
                        }`}
                      >
                        <MoneyText cents={tx.amountCents} prefix={isIncome ? "+" : "-"} />
                      </p>
                      <span className="text-[10px] text-amber-500 font-semibold block">
                        Pendente
                      </span>
                    </div>
                  </div>

                  {/* SELEÇÃO INTELIGENTE DE CATEGORIA */}
                  <div className="pt-2 border-t border-border/60">
                    {/* CASO 1: HÁ MEMÓRIA DE CATEGORIA ANTERIOR PARA ESTE ESTABELECIMENTO */}
                    {hasSuggestedCategory && !isSelectingOther ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-navy/5 dark:bg-naples/10 border border-navy/15 dark:border-naples/20">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-navy dark:text-naples" />
                          <span className="text-xs font-medium text-foreground">
                            Você costuma classificar como{" "}
                            <strong className="font-bold underline text-navy dark:text-naples">
                              {tx.suggestedCategoryName}
                            </strong>
                            . Manter?
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleConfirmCategory(tx.id, tx.suggestedCategoryId!)}
                            disabled={isProcessingId === tx.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-navy text-aurora dark:bg-naples dark:text-navy hover:opacity-90 transition-opacity shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Sim, confirmar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveSelectTxId(tx.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-foreground transition-colors"
                          >
                            Outra...
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDismiss(tx.id)}
                            className="p-1.5 text-muted hover:text-rose-500 transition-colors"
                            title="Descartar movimentação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* CASO 2: ESCOLHA RÁPIDA DE 1 TOQUE ENTRE CATEGORIAS */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted font-medium">
                            Selecione a categoria para confirmar:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDismiss(tx.id)}
                            className="text-[11px] text-muted hover:text-rose-500 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Descartar</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {categories.slice(0, 7).map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleConfirmCategory(tx.id, cat.id)}
                              disabled={isProcessingId === tx.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-surface hover:border-foreground/30 text-xs font-medium text-foreground transition-all shadow-2xs active:scale-95"
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span>{cat.name}</span>
                              {cat.systemKey === "wedding" && (
                                <Gem className="w-3 h-3 text-accent" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

