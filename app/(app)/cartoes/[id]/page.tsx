"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency, formatDateShort } from "@/utils/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MoneyText } from "@/components/ui/MoneyText";
import { PayInvoiceModal } from "@/components/cartoes/PayInvoiceModal";
import { getCardInvoicesAction, getInvoiceDetailsAction } from "@/actions/faturas";
import { getCategoriesAction } from "@/actions/categorias";
import type { CardInvoiceWithTotal, Category, CreditCard, Transaction } from "@/types/types";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard as CardIcon,
  DollarSign,
  AlertCircle,
  Receipt,
} from "lucide-react";

function CardInvoiceDetailsContent() {
  const params = useParams();
  const cardId = typeof params?.id === "string" ? params.id : "";

  const [invoices, setInvoices] = useState<CardInvoiceWithTotal[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [currentCard, setCurrentCard] = useState<CreditCard | null>(null);
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // 1. Carrega todas as faturas do cartão
  const loadInvoices = useCallback(async () => {
    if (!cardId) return;
    try {
      setIsLoading(true);
      const [invList, catList] = await Promise.all([
        getCardInvoicesAction(cardId),
        getCategoriesAction(),
      ]);
      setInvoices(invList);
      setCategories(catList);

      if (invList.length > 0 && !selectedInvoiceId) {
        // Seleciona a fatura aberta por padrão, ou a primeira da lista
        const openInv = invList.find((i) => i.status === "open");
        setSelectedInvoiceId(openInv ? openInv.id : invList[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar faturas";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [cardId, selectedInvoiceId]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // 2. Carrega os detalhes e compras da fatura selecionada
  const loadInvoiceDetails = useCallback(async () => {
    if (!selectedInvoiceId) return;
    try {
      const details = await getInvoiceDetailsAction(selectedInvoiceId);
      setCurrentCard(details.card as unknown as CreditCard);
      setPurchases(details.purchases);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar detalhes";
      toast.error(msg);
    }
  }, [selectedInvoiceId]);

  useEffect(() => {
    loadInvoiceDetails();
  }, [loadInvoiceDetails]);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) || null;
  const getCategory = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header com Navegação */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/cartoes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Cartões
            </Link>
          </div>
          <h1 className="text-3xl text-foreground font-display font-black tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-navy dark:text-naples" />
            {currentCard?.name || "Faturas do Cartão"}
          </h1>
          <p className="text-sm text-muted mt-1">
            Fechamento todo dia {currentCard?.closingDay} · Vencimento todo dia {currentCard?.dueDay}
          </p>
        </div>

        {selectedInvoice && selectedInvoice.status !== "paid" && selectedInvoice.totalCents > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPayModalOpen(true)}
          >
            <CheckCircle2 className="w-4 h-4" /> Pagar Fatura
          </Button>
        )}
      </header>

      {/* Seletor de Faturas (Tabs) */}
      {invoices.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {invoices.map((inv) => {
            const isSelected = inv.id === selectedInvoiceId;
            const isPaid = inv.status === "paid";
            const isOpen = inv.status === "open";

            return (
              <button
                key={inv.id}
                onClick={() => setSelectedInvoiceId(inv.id)}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 text-left ${
                  isSelected
                    ? "bg-surface border-foreground shadow-xs text-foreground ring-2 ring-foreground/10"
                    : "bg-surface/50 border-border text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Fatura {inv.referenceMonth}</span>
                  <Badge
                    variant={isPaid ? "success" : isOpen ? "warning" : "danger"}
                    size="sm"
                  >
                    {isPaid ? "Paga" : isOpen ? "Aberta" : "Fechada"}
                  </Badge>
                </div>
                <p className="text-sm font-extrabold tabular text-foreground mt-1">
                  <MoneyText cents={inv.totalCents} />
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Painel da Fatura Selecionada */}
      {selectedInvoice && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <span className="text-xs font-semibold text-muted">Total da Fatura</span>
            <p className="text-2xl font-black tabular text-foreground mt-1">
              <MoneyText cents={selectedInvoice.totalCents} />
            </p>
            <p className="text-xs text-muted mt-1">
              Referência: {selectedInvoice.referenceMonth}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <span className="text-xs font-semibold text-muted">Data de Fechamento</span>
            <p className="text-xl font-bold tabular text-foreground mt-1">
              {formatDateShort(selectedInvoice.closingDate)}
            </p>
            <p className="text-xs text-muted mt-1">
              Compras após esta data vão para o próximo mês
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs">
            <span className="text-xs font-semibold text-muted">Data de Vencimento</span>
            <p className="text-xl font-bold tabular text-foreground mt-1">
              {formatDateShort(selectedInvoice.dueDate)}
            </p>
            <p className="text-xs text-muted mt-1">
              Status: {selectedInvoice.status === "paid" ? "✅ Paga" : "Aguardando pagamento"}
            </p>
          </div>
        </div>
      )}

      {/* Lista de Compras da Fatura */}
      <Card>
        <CardHeader>
          <CardTitle>Compras desta Fatura</CardTitle>
          <CardDescription>
            {purchases.length} lançamento(s) registrado(s) na fatura {selectedInvoice?.referenceMonth}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted">
              Carregando compras da fatura...
            </div>
          ) : purchases.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              Nenhuma compra registrada nesta fatura ainda.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {purchases.map((tx) => {
                const category = getCategory(tx.categoryId);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 sm:px-6 hover:bg-surface/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-expense/10 text-expense">
                        <CardIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {tx.description}
                          </p>
                          {tx.installmentNumber && (
                            <span className="text-[11px] font-bold text-navy dark:text-naples bg-powder/30 dark:bg-navy/50 px-2 py-0.5 rounded-md">
                              Parcela {tx.installmentNumber}/{tx.installmentTotal}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {formatDateShort(tx.date)} · {category?.name ?? "Geral"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold tabular text-foreground">
                        <MoneyText cents={tx.amountCents} prefix="-" />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Pagamento de Fatura */}
      <PayInvoiceModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSuccess={() => {
          loadInvoices();
          loadInvoiceDetails();
        }}
        invoice={selectedInvoice}
        cardName={currentCard?.name || ""}
        defaultAccountId={currentCard?.paymentAccountId}
      />
    </div>
  );
}

export default function CardInvoiceDetailsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-16 text-center text-sm text-muted">
          Carregando informações da fatura...
        </div>
      }
    >
      <CardInvoiceDetailsContent />
    </React.Suspense>
  );
}
