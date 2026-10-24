// vyk-plan/utils/format.ts
// Utilitários de formatação para moeda (BRL centavos), datas e indicadores.

/**
 * Converte um valor em centavos para a string monetária brasileira.
 * Exemplo: 425000 -> "R$ 4.250,00"
 */
export function formatCurrency(cents: number): string {
  const value = cents / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Converte centavos para formato simplificado sem o símbolo "R$".
 * Útil para inputs ou tabelas densas.
 * Exemplo: 425000 -> "4.250,00"
 */
export function formatNumberOnly(cents: number): string {
  const value = cents / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para exibição brasileira legível.
 * Exemplo: "2026-10-22" -> "22 de out. de 2026"
 */
export function formatDate(isoDate: string, options?: Intl.DateTimeFormatOptions): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  // Usa UTC explícito para evitar distorção de fuso horário em datas sem hora
  const date = new Date(Date.UTC(year, month - 1, day));

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  };

  return new Intl.DateTimeFormat("pt-BR", defaultOptions).format(date);
}

/**
 * Formata no formato curto dia/mês.
 * Exemplo: "2026-10-22" -> "22/10"
 */
export function formatDateShort(isoDate: string): string {
  return formatDate(isoDate, { day: "2-digit", month: "2-digit", year: undefined });
}

/**
 * Formata um mês de referência (YYYY-MM) para o nome extenso.
 * Exemplo: "2026-10" -> "Outubro de 2026"
 */
export function formatYearMonth(yearMonth: string): string {
  if (!yearMonth) return "";
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Calcula a quantidade de dias restantes a partir de hoje até a data-alvo.
 * Retorna número negativo se já tiver passado.
 */
export function getDaysRemaining(targetIsoDate: string): number {
  if (!targetIsoDate) return 0;
  const [year, month, day] = targetIsoDate.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula a porcentagem entre 0 e 100 de forma segura.
 */
export function calculatePercentage(current: number, total: number): number {
  if (!total || total <= 0) return 0;
  const pct = (current / total) * 100;
  return Math.min(Math.max(Math.round(pct), 0), 100);
}
