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

/**
 * Conta a quantidade de dias da semana específicos (ex.: 1 a 4 para Seg a Qui) em um determinado mês.
 * 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
 */
export function countDaysOfWeekInMonth(
  year: number,
  month: number, // 1-indexado
  daysOfWeek: number[] = [1, 2, 3, 4]
): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (daysOfWeek.includes(dayOfWeek)) {
      count++;
    }
  }

  return count;
}

/**
 * Retorna o Domingo de Páscoa de determinado ano (Algoritmo Meeus/Jones/Butcher).
 */
export function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Retorna conjunto de datas em formato YYYY-MM-DD que são feriados ou recessos acadêmicos na Univates / RS / Brasil.
 */
export function getUnivatesAcademicHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  // Feriados fixos nacionais, estaduais do RS e recessos acadêmicos Univates
  const fixed = [
    "01-01", // Confraternização Universal
    "04-21", // Tiradentes
    "05-01", // Dia do Trabalho
    "09-07", // Independência do Brasil
    "09-20", // Revolução Farroupilha (RS)
    "10-12", // Nossa Senhora Aparecida
    "10-13", // Recesso Univates / Dia do Professor (emenda 12/Out)
    "11-02", // Finados
    "11-15", // Proclamação da República
    "11-20", // Consciência Negra
    "12-25", // Natal
  ];

  for (const f of fixed) {
    holidays.add(`${year}-${f}`);
  }

  // Feriados móveis a partir da Páscoa
  const easter = getEasterSunday(year);
  const easterDate = new Date(year, easter.month - 1, easter.day);

  // Segunda e Terça de Carnaval (-48 e -47 dias)
  const carnMon = new Date(easterDate);
  carnMon.setDate(carnMon.getDate() - 48);
  holidays.add(
    `${carnMon.getFullYear()}-${String(carnMon.getMonth() + 1).padStart(2, "0")}-${String(carnMon.getDate()).padStart(2, "0")}`
  );

  const carnTue = new Date(easterDate);
  carnTue.setDate(carnTue.getDate() - 47);
  holidays.add(
    `${carnTue.getFullYear()}-${String(carnTue.getMonth() + 1).padStart(2, "0")}-${String(carnTue.getDate()).padStart(2, "0")}`
  );

  // Sexta-feira Santa (-2 dias)
  const goodFri = new Date(easterDate);
  goodFri.setDate(goodFri.getDate() - 2);
  holidays.add(
    `${goodFri.getFullYear()}-${String(goodFri.getMonth() + 1).padStart(2, "0")}-${String(goodFri.getDate()).padStart(2, "0")}`
  );

  // Corpus Christi (+60 dias)
  const corpus = new Date(easterDate);
  corpus.setDate(corpus.getDate() + 60);
  holidays.add(
    `${corpus.getFullYear()}-${String(corpus.getMonth() + 1).padStart(2, "0")}-${String(corpus.getDate()).padStart(2, "0")}`
  );

  return holidays;
}

/**
 * Determina se determinado dia é dia de aula letivo na Univates
 */
export function isUnivatesClassDay(year: number, month: number, day: number): boolean {
  // Janeiro: férias escolares completas
  if (month === 1) return false;

  // Fevereiro: início das aulas somente na última semana (~dia 24)
  if (month === 2 && day < 24) return false;

  // Julho: no Semestre B as aulas iniciam na última semana (~dia 27)
  if (month === 7 && day < 27) return false;

  // Dezembro: encerramento das aulas no dia 21. Após dia 21 é recesso escolar de verão.
  // Conforme o calendário Univates:
  // 4ª feira encerra no dia 9 (dia 16 repõe sexta-feira)
  // 5ª feira encerra no dia 10 (exceto dia 17 que repõe segunda-feira)
  // 3ª feira encerra no dia 15
  // 2ª feira encerra no dia 21
  if (month === 12) {
    if (day > 21) return false;
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 3 && day > 9) return false;
    if (dayOfWeek === 4 && day > 10 && day !== 17) return false;
    if (dayOfWeek === 2 && day > 15) return false;
  }

  // Feriados e recessos da Univates
  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const holidays = getUnivatesAcademicHolidays(year);
  if (holidays.has(isoDate)) return false;

  return true;
}

/**
 * Conta os dias letivos acadêmicos da semana (ex.: Seg a Qui [1,2,3,4]) considerando
 * feriados nacionais, estaduais do RS e calendário escolar da Univates.
 */
export function countAcademicDaysInMonth(
  year: number,
  month: number, // 1-indexado
  daysOfWeek: number[] = [1, 2, 3, 4]
): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    if (daysOfWeek.includes(dayOfWeek) && isUnivatesClassDay(year, month, day)) {
      count++;
    }
  }

  return count;
}


