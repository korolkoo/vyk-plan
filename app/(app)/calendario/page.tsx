"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard as CardIcon,
  Gem,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { formatCurrency, formatDateShort } from "@/utils/format";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/ui/MoneyText";
import {
  getCalendarEventsAction,
  type CalendarEvent,
} from "@/actions/calendario";
import { DayInteractiveModal } from "@/components/calendario/DayInteractiveModal";

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

function CalendarioContent() {
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(9); // 0-indexed (9 = Outubro)
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayIso, setTodayIso] = useState("");
  const [hidePaid, setHidePaid] = useState<boolean>(true); // Por padrão oculta liquidados (Ponto 2)
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Inicializa a data atual no cliente
  useEffect(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setTodayIso(now.toISOString().split("T")[0]);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCalendarEventsAction(currentYear, currentMonth + 1);
      setEvents(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar calendário";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Cálculo da grade do mês
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Resumo do mês
  const monthIncome = events
    .filter((e) => e.type === "income" && e.amountCents)
    .reduce((acc, e) => acc + (e.amountCents || 0), 0);

  const monthExpense = events
    .filter((e) => (e.type === "expense" || e.type === "wedding" || e.type === "card_due") && e.amountCents)
    .reduce((acc, e) => acc + (e.amountCents || 0), 0);

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
      events: events.filter((e) => e.date === isoDate),
    });
  }

  // Dias do mês atual
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const isoDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      dayNumber: day,
      isoDate,
      isCurrentMonth: true,
      events: events.filter((e) => e.date === isoDate),
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
      events: events.filter((e) => e.date === isoDate),
    });
  }

  const selectedDayEventsList = selectedDayDate
    ? events.filter((e) => e.date === selectedDayDate)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Topo: Navegação do Calendário + Resumo Rápido + Filtro */}
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Botão de Toggle: Ocultar Liquidados */}
          <button
            type="button"
            onClick={() => setHidePaid((v) => !v)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
              hidePaid
                ? "bg-navy/10 text-navy dark:bg-naples/20 dark:text-naples border-navy/20 dark:border-naples/30"
                : "bg-surface border-border text-muted hover:text-foreground"
            }`}
            title="Alternar visibilidade de contas já liquidadas"
          >
            {hidePaid ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Ocultando Liquidados</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Exibindo Todos</span>
              </>
            )}
          </button>

          {/* Mini Resumo do Mês */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium bg-surface border border-border px-4 py-2 rounded-2xl shadow-2xs">
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
              <span className="text-muted">Despesas / Faturas:</span>
              <span className="font-semibold text-expense tabular">
                <MoneyText cents={monthExpense} />
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Grade Mensal estilo Teams / Outlook */}
      <Card className="overflow-hidden border-border/80 shadow-sm">
        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-border bg-background/50 text-center text-xs font-semibold uppercase tracking-wider text-muted py-2">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className={idx === 0 || idx === 6 ? "text-muted/60" : "text-foreground"}
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden text-[11px] font-bold">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Células dos Dias */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-surface">
          {cells.map((cell, idx) => {
            const isToday = cell.isoDate === todayIso;

            // Filtra os eventos da célula conforme a opção hidePaid
            const displayedEvents = cell.events.filter((e) => {
              if (!hidePaid) return true;
              if (e.type === "card_closing") return true; // Melhor dia sempre é informativo
              return e.status === "pending"; // Oculta liquidados por padrão!
            });

            return (
              <div
                key={`${cell.isoDate}-${idx}`}
                onClick={() => setSelectedDayDate(cell.isoDate)}
                className={`min-h-[96px] sm:min-h-32 p-1.5 sm:p-2 transition-all flex flex-col justify-between group cursor-pointer active:scale-[0.98] ${
                  cell.isCurrentMonth
                    ? "bg-surface hover:bg-background/80"
                    : "bg-background/40 opacity-40 hover:opacity-70"
                }`}
              >
                {/* Número do Dia */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-bold rounded-lg px-1.5 py-0.5 transition-colors ${
                      isToday
                        ? "bg-navy text-aurora dark:bg-naples dark:text-navy font-extrabold shadow-xs"
                        : cell.isCurrentMonth
                        ? "text-foreground group-hover:text-foreground"
                        : "text-muted"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Botão de Adicionar ao passar o mouse (desktop) */}
                  <span className="hidden sm:inline-block opacity-0 group-hover:opacity-100 p-0.5 text-muted hover:text-foreground transition-opacity">
                    <Plus className="w-3 h-3" />
                  </span>
                </div>

                {/* Eventos Detalhados (Mobile e Desktop com Badges e Valores) */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {displayedEvents.slice(0, 3).map((evt) => {
                    const isClosing = evt.type === "card_closing";
                    const isDue = evt.type === "card_due";
                    const isWedding = evt.type === "wedding";
                    const isIncome = evt.type === "income";

                    return (
                      <div
                        key={evt.id}
                        className={`text-[9px] sm:text-[11px] leading-tight px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-md font-medium truncate flex items-center justify-between gap-1 shadow-2xs border ${
                          isClosing
                            ? "bg-powder/30 text-navy dark:text-powder border-powder/50 font-bold"
                            : isDue
                            ? "bg-warning/20 text-warning border-warning/40 font-bold"
                            : isWedding
                            ? "bg-accent/25 text-navy dark:text-naples border-accent/40"
                            : isIncome
                            ? "bg-income/10 text-income border-income/30"
                            : "bg-expense/10 text-expense border-expense/30"
                        }`}
                        title={evt.title}
                      >
                        <span className="truncate flex items-center gap-1">
                          {isClosing && <Sparkles className="w-2.5 h-2.5 shrink-0" />}
                          {isDue && <CardIcon className="w-2.5 h-2.5 shrink-0" />}
                          {isWedding && <Gem className="w-2.5 h-2.5 shrink-0" />}
                          {isIncome && <ArrowDownLeft className="w-2.5 h-2.5 shrink-0" />}
                          {!isClosing && !isDue && !isWedding && !isIncome && (
                            <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
                          )}
                          <span className="truncate">{evt.title}</span>
                        </span>

                        {evt.amountCents !== undefined && (
                          <span className="shrink-0 font-semibold tabular ml-0.5">
                            {formatCurrency(evt.amountCents).replace("R$", "").trim()}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {displayedEvents.length > 3 && (
                    <span className="text-[9px] sm:text-[10px] text-muted block text-center font-bold">
                      +{displayedEvents.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal Interativo do Dia (Criar, Liquidar, Excluir) */}
      {selectedDayDate && (
        <DayInteractiveModal
          isOpen={!!selectedDayDate}
          onClose={() => setSelectedDayDate(null)}
          date={selectedDayDate}
          events={selectedDayEventsList}
          onSuccess={loadEvents}
        />
      )}
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-24 text-center text-sm text-muted animate-pulse">
          Carregando calendário...
        </div>
      }
    >
      <CalendarioContent />
    </React.Suspense>
  );
}
