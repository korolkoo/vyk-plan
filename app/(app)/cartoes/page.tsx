"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatCurrency, formatDateShort } from "@/utils/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MoneyText } from "@/components/ui/MoneyText";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CreditCardModal } from "@/components/cartoes/CreditCardModal";
import { getCreditCardsAction, deleteCreditCardAction } from "@/actions/cartoes";
import type { CreditCard, CreditCardWithDetails } from "@/types/types";
import {
  CreditCard as CardIcon,
  Plus,
  ArrowRight,
  Edit2,
  Trash2,
  ShieldCheck,
  Calendar,
} from "lucide-react";

export default function CartoesPage() {
  const [cards, setCards] = useState<CreditCardWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<CreditCard | null>(null);

  const loadCards = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCreditCardsAction();
      setCards(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar cartões";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleEdit = (card: CreditCard) => {
    setCardToEdit(card);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o cartão "${name}"? Todas as faturas associadas serão apagadas.`)) {
      return;
    }
    try {
      await deleteCreditCardAction(id);
      toast.success("Cartão excluído!");
      await loadCards();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir cartão";
      toast.error(msg);
    }
  };

  // Cálculos consolidados
  const totalLimitCents = cards.reduce((sum, c) => sum + c.limitCents, 0);
  const totalUsedLimitCents = cards.reduce((sum, c) => sum + c.usedLimitCents, 0);
  const totalAvailableLimitCents = cards.reduce((sum, c) => sum + c.availableLimitCents, 0);
  const totalOpenInvoicesCents = cards.reduce(
    (sum, c) => sum + (c.currentInvoice?.totalCents || 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground font-display font-black tracking-tight flex items-center gap-2">
            <CardIcon className="w-8 h-8 text-navy dark:text-naples" />
            Cartões de Crédito
          </h1>
          <p className="text-sm text-muted mt-1">
            Controle de limites, faturas abertas e datas de vencimento.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setCardToEdit(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Novo Cartão
        </Button>
      </header>

      {/* Cards de Resumo Consolidado */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <span className="text-xs font-semibold text-muted">Limite Total Consolidado</span>
            <p className="text-xl font-extrabold tabular text-foreground mt-1">
              <MoneyText cents={totalLimitCents} />
            </p>
            <p className="text-[11px] text-muted mt-1">
              Em {cards.length} cartão(ões) cadastrado(s)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <span className="text-xs font-semibold text-muted">Limite Total Disponível</span>
            <p className="text-xl font-extrabold tabular text-income mt-1">
              <MoneyText cents={totalAvailableLimitCents} />
            </p>
            <p className="text-[11px] text-muted mt-1">
              <MoneyText cents={totalUsedLimitCents} /> comprometidos
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <span className="text-xs font-semibold text-muted">Faturas Abertas no Mês</span>
            <p className="text-xl font-extrabold tabular text-expense mt-1">
              <MoneyText cents={totalOpenInvoicesCents} />
            </p>
            <p className="text-[11px] text-muted mt-1">
              A vencer nos próximos dias
            </p>
          </div>
        </div>
      )}

      {/* Grid de Cartões */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted">
          Carregando cartões de crédito...
        </div>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CardIcon className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-bold text-foreground">Nenhum cartão cadastrado</h3>
            <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
              Cadastre seus cartões de crédito para gerenciar limites, faturas e compras parceladas.
            </p>
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => {
                  setCardToEdit(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Cadastrar Primeiro Cartão
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const usedPercentage =
              card.limitCents > 0
                ? Math.min(100, Math.round((card.usedLimitCents / card.limitCents) * 100))
                : 0;

            const currentInvoice = card.currentInvoice;

            return (
              <Card key={card.id} className="relative overflow-hidden group">
                <div
                  className="h-2 w-full transition-all"
                  style={{ backgroundColor: card.color }}
                />
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: card.color }}
                      >
                        <CardIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground">
                          {card.name}
                        </h3>
                        <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Fecha dia <strong>{card.closingDay}</strong> · Vence dia{" "}
                          <strong>{card.dueDay}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(card)}
                        className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors"
                        title="Editar cartão"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(card.id, card.name)}
                        className="p-1.5 text-muted hover:text-expense rounded-lg hover:bg-expense/10 transition-colors"
                        title="Excluir cartão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Barra de Limite */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">
                        Limite Utilizado:{" "}
                        <strong className="text-foreground">{usedPercentage}%</strong>
                      </span>
                      <span className="text-muted">
                        Disponível:{" "}
                        <strong className="text-income">
                          <MoneyText cents={card.availableLimitCents} />
                        </strong>
                      </span>
                    </div>
                    <ProgressBar value={usedPercentage} />
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Usado: <MoneyText cents={card.usedLimitCents} /></span>
                      <span>Total: <MoneyText cents={card.limitCents} /></span>
                    </div>
                  </div>

                  {/* Fatura Atual */}
                  {currentInvoice && (
                    <div className="p-4 rounded-xl bg-surface/80 border border-border/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            Fatura Aberta ({currentInvoice.referenceMonth})
                          </span>
                          <Badge variant="warning" size="sm">
                            Aberta
                          </Badge>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          Vencimento: {formatDateShort(currentInvoice.dueDate)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-extrabold tabular text-foreground">
                          <MoneyText cents={currentInvoice.totalCents} />
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Link para Faturas do Cartão */}
                  <div className="pt-1">
                    <Link href={`/cartoes/${card.id}`}>
                      <Button variant="outline" size="sm" className="w-full justify-between">
                        <span>Ver Faturas e Compras Parceladas</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Cartão */}
      <CreditCardModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCardToEdit(null);
        }}
        onSuccess={loadCards}
        cardToEdit={cardToEdit}
      />
    </div>
  );
}
