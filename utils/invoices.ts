// vyk-plan/utils/invoices.ts
// Lógica de cálculo de faturas, datas de fechamento, vencimento e distribuição de parcelas.

export interface InvoiceDates {
  referenceMonth: string; // YYYY-MM
  closingDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
}

/**
 * Retorna o número de dias em um determinado mês/ano.
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calcula a fatura (mês de referência, data de fechamento e data de vencimento)
 * para uma transação realizada em uma data específica em um cartão de crédito.
 *
 * Regra:
 * - Se o dia da compra for MENOR ou IGUAL ao closingDay, entra na fatura do mês corrente da compra.
 * - Se o dia da compra for MAIOR que o closingDay, entra na fatura do mês subsequente (melhor dia de compra).
 * - Se o dueDay for menor ou igual ao closingDay (ex: fecha dia 25, vence dia 05), a data de vencimento é no mês seguinte ao fechamento.
 */
export function calculateInvoiceDates(
  purchaseDate: string, // YYYY-MM-DD
  closingDay: number,
  dueDay: number,
  monthOffset: number = 0 // Usado para compras parceladas (+1, +2 meses...)
): InvoiceDates {
  const [pYearStr, pMonthStr, pDayStr] = purchaseDate.split("-");
  const pYear = parseInt(pYearStr, 10);
  const pMonth = parseInt(pMonthStr, 10); // 1-12
  const pDay = parseInt(pDayStr, 10);

  // Se a compra foi feita após o fechamento, avança 1 mês base
  const baseOffset = pDay > closingDay ? 1 : 0;
  const totalOffset = baseOffset + monthOffset;

  // Calcula ano e mês de referência da fatura
  const targetDate = new Date(Date.UTC(pYear, pMonth - 1 + totalOffset, 1));
  const refYear = targetDate.getUTCFullYear();
  const refMonth = targetDate.getUTCMonth() + 1; // 1-12
  const referenceMonth = `${refYear}-${String(refMonth).padStart(2, "0")}`;

  // Data de Fechamento no mês de referência
  const maxDaysInRefMonth = getDaysInMonth(refYear, refMonth);
  const safeClosingDay = Math.min(Math.max(1, closingDay), maxDaysInRefMonth);
  const closingDate = `${referenceMonth}-${String(safeClosingDay).padStart(2, "0")}`;

  // Data de Vencimento
  // Se dueDay <= closingDay, o vencimento ocorre no mês seguinte ao fechamento
  const dueMonthOffset = dueDay <= closingDay ? 1 : 0;
  const dueDateObj = new Date(Date.UTC(refYear, refMonth - 1 + dueMonthOffset, 1));
  const dueYear = dueDateObj.getUTCFullYear();
  const dueMonth = dueDateObj.getUTCMonth() + 1;
  const maxDaysInDueMonth = getDaysInMonth(dueYear, dueMonth);
  const safeDueDay = Math.min(Math.max(1, dueDay), maxDaysInDueMonth);
  const dueDate = `${dueYear}-${String(dueMonth).padStart(2, "0")}-${String(safeDueDay).padStart(2, "0")}`;

  return {
    referenceMonth,
    closingDate,
    dueDate,
  };
}
