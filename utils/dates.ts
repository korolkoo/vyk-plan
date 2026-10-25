// vyk-plan/utils/dates.ts
// Utilitários para regras de dias úteis (CLT / 5º dia útil) e feriados nacionais.

/** Feriados nacionais fixos brasileiros (mês 1-indexado: dia) */
const BRAZIL_FIXED_HOLIDAYS: Record<string, boolean> = {
  "01-01": true, // Confraternização Universal
  "04-21": true, // Tiradentes
  "05-01": true, // Dia do Trabalho
  "09-07": true, // Independência do Brasil
  "10-12": true, // Nossa Senhora Aparecida
  "11-02": true, // Finados
  "11-15": true, // Proclamação da República
  "11-20": true, // Dia Nacional de Zumbi e da Consciência Negra
  "12-25": true, // Natal
};

/**
 * Verifica se um dia específico é feriado nacional ou fim de semana
 */
export function isBusinessDay(year: number, month: number, day: number): boolean {
  // Mês é 1-indexado (1 a 12)
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado

  // Fim de semana não é dia útil
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Feriado nacional
  const monthDayKey = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (BRAZIL_FIXED_HOLIDAYS[monthDayKey]) {
    return false;
  }

  return true;
}

/**
 * Retorna o dia do mês (1 a 31) correspondente ao N-ésimo dia útil do mês especificado.
 * Por padrão, calcula o 5º dia útil (regra de pagamento salarial CLT).
 */
export function getNthBusinessDay(year: number, month: number, nth: number = 5): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let businessDayCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    if (isBusinessDay(year, month, day)) {
      businessDayCount++;
      if (businessDayCount === nth) {
        return day;
      }
    }
  }

  // Fallback seguro caso atípico
  return Math.min(nth, daysInMonth);
}

/**
 * Retorna a data ISO completa (YYYY-MM-DD) do 5º dia útil de determinado mês/ano.
 */
export function getFifthBusinessDayIso(year: number, month: number): string {
  const day = getNthBusinessDay(year, month, 5);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
