"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Gem,
  Calendar as CalendarIcon,
} from "lucide-react";
import { formatCurrency, formatDateShort } from "@/utils/format";
import { mockTransactions } from "@/mocks/financas";
import { mockWeddingInstallments } from "@/mocks/casamento";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { MoneyText } from "@/components/ui/MoneyText";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amountCents: number;
  type: "income" | "expense";
  status: "pending" | "paid";
  isWedding?: boolean;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function CalendarioPage() {
  // Começamos em Outubro de 2026 (onde estão nossos dados mockados)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed (9 = Outubro)
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    date: string;
    events: CalendarEvent[];
  } | null>(null);

  // Unifica lançamentos pessoais e parcelas do casamento
  const allEvents: CalendarEvent[] = [
    ...mockTransactions.map((tx) => ({
      id: tx.id,
      title: tx.description,
      date: tx.date,
      amountCents: tx.amountCents,
      type: tx.type === "income" ? ("income" as const) : ("expense" as const),
      status: tx.status,
      isWedding: false,
    })),
    ...mockWeddingInstallments.map((inst) => ({
      id: inst.id,
      title: "Parcela Casamento",
      date: inst.dueDate,
      amountCents: inst.amountCents,
      type: "expense" as const,
      status: inst.paidAt ? ("paid" as const) : ("pending" as const),
      isWedding: true,
    })),
  ];

  // Navegação de mês
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(9); // Outubro 2026
  };

  // Cálculos da grade do mês
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Filtra eventos do mês visualizado para o resumo do topo
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const monthEvents = allEvents.filter((e) => e.date.startsWith(currentMonthPrefix));

  const monthIncome = monthEvents
    .filter((e) => e.type === "income")
    .reduce((acc, e) => acc + e.amountCents, 0);

  const monthExpense = monthEvents
    .filter((e) => e.type === "expense")
    .reduce((acc, e) => acc + e.amountCents, 0);

  // Constrói as células da grade
  interface CalendarCell {
    dayNumber: number;
    isoDate: string;
    isCurrentMonth: boolean;
    events: CalendarEvent[];
  }

  const cells: CalendarCell[] = [];

  // Dias do mês anterior
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthNumber = currentMonth === 0 ? 12 : currentMonth;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const isoDate = `${prevYear}-${String(prevMonthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      dayNumber: day,
      isoDate,
      isCurrentMonth: false,
      events: allEvents.filter((e) => e.date === isoDate),
    });
  }

  // Dias do mês atual
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const isoDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      dayNumber: day,
      isoDate,
      isCurrentMonth: true,
      events: allEvents.filter((e) => e.date === isoDate),
    });
  }

  // Dias do próximo mês para fechar a grade (múltiplo de 7)
  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonthNumber = currentMonth === 11 ? 1 : currentMonth + 2;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const isoDate = `${nextYear}-${String(nextMonthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      dayNumber: day,
      isoDate,
      isCurrentMonth: false,
      events: allEvents.filter((e) => e.date === isoDate),
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Topo: Navegação do Calendário + Resumo Rápido */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h1>
          </div>

          <div className="flex items-center gap-1 ml-2 bg-surface border border-border rounded-xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-background rounded-lg transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mini Resumo do Mês Selecionado */}
        <div className="flex items-center gap-4 text-xs font-medium bg-surface border border-border px-4 py-2.5 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-income" />
            <span className="text-muted">Receitas:</span>
            <span className="font-semibold text-income tabular">
              <MoneyText cents={monthIncome} />
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-expense" />
            <span className="text-muted">Despesas:</span>
            <span className="font-semibold text-expense tabular">
              <MoneyText cents={monthExpense} />
            </span>
          </div>
        </div>
      </header>

      {/* Grade Mensal estilo Teams / Outlook */}
      <Card className="overflow-hidden border-border/80 shadow-sm">
        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-border bg-background/50 text-center text-xs font-semibold uppercase tracking-wider text-muted py-2.5">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className={idx === 0 || idx === 6 ? "text-muted/60" : "text-foreground"}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Células dos Dias */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-surface">
          {cells.map((cell, idx) => {
            const hasEvents = cell.events.length > 0;
            const isToday =
              cell.isCurrentMonth &&
              cell.dayNumber === 22 && // dia corrente de exemplo
              currentMonth === 9 &&
              currentYear === 2026;

            return (
              <div
                key={`${cell.isoDate}-${idx}`}
                onClick={() =>
                  hasEvents
                    ? setSelectedDayEvents({
                        date: cell.isoDate,
                        events: cell.events,
                      })
                    : null
                }
                className={`min-h-24 sm:min-h-32 p-1.5 sm:p-2 transition-all flex flex-col justify-between group ${
                  cell.isCurrentMonth
                    ? "bg-surface hover:bg-background/80"
                    : "bg-background/40 opacity-40 hover:opacity-70"
                } ${hasEvents ? "cursor-pointer" : "cursor-default"}`}
              >
                {/* Número do Dia */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold tabular ${
                      isToday
                        ? "bg-accent text-accent-foreground font-bold shadow-2xs"
                        : "text-foreground group-hover:text-navy dark:group-hover:text-naples"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.events.length > 0 && (
                    <span className="hidden sm:inline-block text-[10px] font-bold text-muted tabular">
                      {cell.events.length}
                    </span>
                  )}
                </div>

                {/* Eventos / Pills dentro do dia */}
                <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                  {cell.events.slice(0, 2).map((evt) => {
                    const isIncome = evt.type === "income";

                    return (
                      <div
                        key={evt.id}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate flex items-center justify-between gap-1 transition-transform group-hover:scale-[1.01] ${
                          evt.isWedding
                            ? "bg-accent/25 text-navy dark:text-naples border border-accent/40"
                            : isIncome
                            ? "bg-income/15 text-income border border-income/25"
                            : "bg-expense/10 text-expense border border-expense/20"
                        }`}
                        title={`${evt.title} - ${formatCurrency(evt.amountCents)}`}
                      >
                        <span className="truncate flex items-center gap-1">
                          {evt.isWedding && <Gem className="w-2.5 h-2.5 shrink-0" />}
                          {evt.title}
                        </span>
                        <span className="tabular font-semibold shrink-0">
                          <MoneyText cents={evt.amountCents} mask="••" />
                        </span>
                      </div>
                    );
                  })}

                  {/* Indicador de mais eventos */}
                  {cell.events.length > 2 && (
                    <div className="text-[10px] text-muted font-semibold pl-1">
                      +{cell.events.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal Detalhe do Dia Clicado */}
      {selectedDayEvents && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDayEvents(null)}
          title={`Lançamentos de ${formatDateShort(selectedDayEvents.date)}`}
          description={`${selectedDayEvents.events.length} transação(ões) programada(s) nesta data.`}
        >
          <div className="space-y-3">
            <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
              {selectedDayEvents.events.map((evt) => {
                const isIncome = evt.type === "income";

                return (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between py-3 px-1"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          evt.isWedding
                            ? "bg-accent/30 text-navy dark:text-naples"
                            : isIncome
                            ? "bg-income/10 text-income"
                            : "bg-expense/10 text-expense"
                        }`}
                      >
                        {evt.isWedding ? (
                          <Gem className="w-4 h-4" />
                        ) : isIncome ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {evt.title}
                        </p>
                        <p className="text-xs text-muted">
                          {evt.isWedding ? "💍 Casamento" : evt.type === "income" ? "Receita" : "Despesa"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold tabular ${
                          isIncome ? "text-income" : "text-foreground"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        <MoneyText cents={evt.amountCents} />
                      </p>
                      <Badge
                        variant={evt.status === "paid" ? "success" : "warning"}
                        size="sm"
                      >
                        {evt.status === "paid" ? "Pago" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedDayEvents(null)}
              >
                Concluir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
