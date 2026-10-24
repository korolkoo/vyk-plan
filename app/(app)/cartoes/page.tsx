import React from "react";
import { formatCurrency } from "@/utils/format";
import { mockCreditCards, mockInvoices } from "@/mocks/financas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreditCard as CardIcon } from "lucide-react";

export default function CartoesPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground">Cartões de Crédito</h1>
          <p className="text-sm text-muted mt-1">
            Controle de limites, faturas abertas e datas de vencimento.
          </p>
        </div>
      </header>

      {/* Grid de Cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockCreditCards.map((card) => {
          const cardInvoices = mockInvoices.filter(
            (inv) => inv.creditCardId === card.id
          );
          const currentInvoice =
            cardInvoices.find((i) => i.status === "open") || cardInvoices[0];

          return (
            <Card key={card.id} className="relative overflow-hidden">
              <div
                className="h-2 w-full"
                style={{ backgroundColor: card.color }}
              />
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: card.color }}
                    >
                      <CardIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {card.name}
                      </h3>
                      <p className="text-xs text-muted">
                        Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted">Limite Total</p>
                    <p className="text-sm font-semibold tabular">
                      {formatCurrency(card.limitCents)}
                    </p>
                  </div>
                </div>

                {/* Fatura Atual */}
                {currentInvoice && (
                  <div className="p-4 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          Fatura {currentInvoice.referenceMonth}
                        </span>
                        <Badge
                          variant={
                            currentInvoice.status === "paid"
                              ? "success"
                              : currentInvoice.status === "closed"
                              ? "danger"
                              : "warning"
                          }
                          size="sm"
                        >
                          {currentInvoice.status === "paid"
                            ? "Paga"
                            : currentInvoice.status === "closed"
                            ? "Fechada"
                            : "Aberta"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        Vencimento em {currentInvoice.dueDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold tabular text-foreground">
                        {formatCurrency(currentInvoice.totalCents)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
