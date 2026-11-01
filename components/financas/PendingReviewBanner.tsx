"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { MoneyText } from "@/components/ui/MoneyText";
import { Badge } from "@/components/ui/Badge";
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

  // Solicita permissão para notificações nativas do navegador / PWA se suportado
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

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

      // Dispara notificação nativa se houver pendências e permissão concedida
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        if (txs.length > 0) {
          const first = txs[0];
          new Notification("VYK Plan · Nova Movimentação", {
            body: `${first.establishment || first.description} - R$ ${(first.amountCents / 100).toFixed(2)}. Toque para classificar.`,
            icon: "/favicon.ico",
          });
        } else if (remindersData.reminders.length > 0) {
          const today = remindersData.reminders.filter((r) => r.isToday);
          if (today.length > 0) {
            new Notification("VYK Plan · Lembrete de Vencimento", {
              body: `Você tem ${today.length} conta(s) que vence(m) hoje!`,
              icon: "/favicon.ico",
            });
          }
        }
      }
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
    <div className="space-y-4 animate-in fade-in duration-300 w-full overflow-hidden">
      {/* 1. LEMBRETES DE CONTAS A VENCER (HOJE E AMANHÃ) */}
      {dueReminders.length > 0 && (
        <div className="p-4 rounded-2xl border border-warning/40 bg-gradient-to-r from-warning/15 via-warning/10 to-surface/80 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs overflow-hidden">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
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
              <p className="text-xs text-foreground/80 mt-1 truncate">
                {dueReminders.map((r) => r.title).slice(0, 3).join(" · ")}
                {dueReminders.length > 3 ? ` e mais ${dueReminders.length - 3}...` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. NOVAS COMPRAS CAPTURADAS AUTOMATICAMENTE (PENDENTES DE CATEGORIA) */}
      {pendingTxs.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-navy/20 dark:border-naples/30 bg-gradient-to-br from-surface via-surface to-background shadow-xs space-y-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-navy dark:text-naples shrink-0" />
                <span>Nova movimentação capturada ({pendingTxs.length})</span>
              </h3>
            </div>
            <span className="text-[11px] font-medium text-muted bg-surface/80 px-2 py-0.5 rounded-md border border-border/60">
              Aprovação de 1 toque
            </span>
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
                  className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-background/60 hover:border-foreground/20 transition-all space-y-3.5 shadow-2xs overflow-hidden"
                >
                  {/* Cabeçalho do Lançamento: Nome, Canal e Valor (Totalmente responsivo sem overflow) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate block max-w-full">
                          {tx.establishment || tx.description}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface border border-border text-muted shrink-0">
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

                      {tx.description && tx.description !== tx.establishment && (
                        <p className="text-[11px] text-muted truncate max-w-md">
                          {tx.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/25">
                        Pendente
                      </span>
                      <p
                        className={`text-base sm:text-lg font-black tabular ${
                          isIncome ? "text-income" : "text-foreground"
                        }`}
                      >
                        <MoneyText cents={tx.amountCents} prefix={isIncome ? "+" : "-"} />
                      </p>
                    </div>
                  </div>

                  {/* SELEÇÃO INTELIGENTE DE CATEGORIA */}
                  <div>
                    {/* CASO 1: HÁ MEMÓRIA DE CATEGORIA ANTERIOR PARA ESTE ESTABELECIMENTO */}
                    {hasSuggestedCategory && !isSelectingOther ? (
                      <div className="p-3 rounded-xl bg-navy/5 dark:bg-naples/10 border border-navy/20 dark:border-naples/30 space-y-3">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-navy dark:text-naples shrink-0" />
                          <span className="text-xs font-medium text-foreground">
                            Você costuma classificar como{" "}
                            <strong className="font-extrabold underline text-navy dark:text-naples">
                              {tx.suggestedCategoryName}
                            </strong>
                            . Manter?
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmCategory(tx.id, tx.suggestedCategoryId!)}
                            disabled={isProcessingId === tx.id}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-navy text-aurora dark:bg-naples dark:text-navy hover:opacity-90 transition-opacity shadow-xs active:scale-95"
                          >
                            <Check className="w-4 h-4" />
                            <span>Sim, confirmar categoria</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveSelectTxId(tx.id)}
                            className="px-3 py-2 rounded-xl text-xs font-semibold text-muted hover:text-foreground border border-border bg-surface/50 hover:bg-surface transition-colors"
                          >
                            Outra categoria...
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDismiss(tx.id)}
                            className="p-2 text-muted hover:text-rose-500 transition-colors ml-auto"
                            title="Descartar movimentação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* CASO 2: ESCOLHA RÁPIDA DE 1 TOQUE ENTRE CATEGORIAS */
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted font-medium text-[11px] sm:text-xs">
                            Selecione a categoria para confirmar:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDismiss(tx.id)}
                            className="text-[11px] text-muted hover:text-rose-500 flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Descartar</span>
                          </button>
                        </div>

                        {/* Grade elegante: 2 colunas no celular, linha flexível no desktop */}
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                          {categories.slice(0, 8).map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleConfirmCategory(tx.id, cat.id)}
                              disabled={isProcessingId === tx.id}
                              className="inline-flex items-center justify-start sm:justify-center gap-2 px-3 py-2 rounded-xl border border-border/80 bg-surface/70 hover:bg-surface hover:border-foreground/30 text-xs font-medium text-foreground transition-all shadow-2xs active:scale-95"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="truncate">{cat.name}</span>
                              {cat.systemKey === "wedding" && (
                                <Gem className="w-3 h-3 text-accent shrink-0 ml-auto sm:ml-0" />
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
