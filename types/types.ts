// vyk-plan/types/types.ts
// Contrato de dados do app. Espelha o schema do banco (lib/db/schema.ts — Fase 2)
// e os mocks em /mocks. Convenções:
//   - Dinheiro SEMPRE em centavos (integer) → sufixo "Cents".
//   - Datas de competência: "YYYY-MM-DD" (ISODate). Mês de referência: "YYYY-MM".

export type ID = string;
/** Data sem hora, ex.: "2026-10-22" */
export type ISODate = string;
/** Mês de referência, ex.: "2026-10" */
export type YearMonth = string;

/* =========================================================
   USUÁRIO (gerenciado pelo Better Auth)
   ========================================================= */

export interface User {
  id: ID;
  name: string;
  email: string;
  image?: string | null;
}

/* =========================================================
   AMBIENTE INDIVIDUAL — todas as entidades têm userId
   ========================================================= */

export type BankAccountType = "checking" | "savings" | "wallet" | "investment";

export interface BankAccount {
  id: ID;
  userId: ID;
  name: string;
  type: BankAccountType;
  initialBalanceCents: number;
  color: string;
  archived: boolean;
}

/** Conta com saldo calculado (inicial + lançamentos pagos). Derivado, não persistido. */
export interface BankAccountWithBalance extends BankAccount {
  currentBalanceCents: number;
}

export interface CreditCard {
  id: ID;
  userId: ID;
  name: string;
  limitCents: number;
  /** Dia do mês em que a fatura fecha (1–31) */
  closingDay: number;
  /** Dia do mês em que a fatura vence (1–31) */
  dueDay: number;
  color: string;
  /** Conta usada para pagar a fatura */
  paymentAccountId: ID | null;
}

export type InvoiceStatus = "open" | "closed" | "paid";

export interface CardInvoice {
  id: ID;
  creditCardId: ID;
  referenceMonth: YearMonth;
  closingDate: ISODate;
  dueDate: ISODate;
  status: InvoiceStatus;
}

/** Fatura com total somado das compras. Derivado, não persistido. */
export interface CardInvoiceWithTotal extends CardInvoice {
  totalCents: number;
}

/** Cartão de crédito com totais calculados (fatura aberta atual e limite disponível). */
export interface CreditCardWithDetails extends CreditCard {
  currentInvoice: CardInvoiceWithTotal | null;
  usedLimitCents: number;
  availableLimitCents: number;
}

export type CategoryKind = "income" | "expense";

/** Chaves de categorias do sistema com comportamento especial */
export type CategorySystemKey = "wedding";

export interface Category {
  id: ID;
  /** null = categoria padrão do sistema (visível para os dois) */
  userId: ID | null;
  name: string;
  kind: CategoryKind;
  /** Nome do ícone lucide-react, ex.: "ShoppingCart" */
  icon: string;
  color: string;
  /** "wedding" → lançamentos nessa categoria geram aporte na reserva do casamento */
  systemKey: CategorySystemKey | null;
}

export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "paid";
export type TransactionSource = "manual" | "auto";

export interface Transaction {
  id: ID;
  userId: ID;
  type: TransactionType;
  amountCents: number;
  description: string;
  date: ISODate;
  status: TransactionStatus;
  /** true = gerado por recorrência e ainda não confirmado pelo usuário */
  isForecast: boolean;
  categoryId: ID | null;
  bankAccountId: ID | null;
  creditCardId: ID | null;
  invoiceId: ID | null;
  /** Só para type = "transfer" */
  transferToAccountId: ID | null;
  /** Parcelamento: mesmo grupo para todas as parcelas da compra */
  installmentGroupId: ID | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  recurrenceId: ID | null;
  /** Preparado para captura automática (V2) */
  source: TransactionSource;
  notes: string | null;
}

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

export interface Recurrence {
  id: ID;
  userId: ID;
  type: Exclude<TransactionType, "transfer">;
  description: string;
  amountCents: number;
  categoryId: ID | null;
  bankAccountId: ID | null;
  creditCardId: ID | null;
  frequency: RecurrenceFrequency;
  /** Dia de referência (dia do mês p/ monthly/yearly; 0–6 p/ weekly) */
  dayOfMonth: number;
  startDate: ISODate;
  endDate: ISODate | null;
  active: boolean;
}

export interface Goal {
  id: ID;
  userId: ID;
  name: string;
  targetCents: number;
  targetDate: ISODate | null;
  icon: string;
  color: string;
}

export interface GoalContribution {
  id: ID;
  goalId: ID;
  amountCents: number;
  date: ISODate;
  note: string | null;
}

/** Meta com total já guardado. Derivado, não persistido. */
export interface GoalWithProgress extends Goal {
  savedCents: number;
}

/* =========================================================
   AMBIENTE COMPARTILHADO — CASAMENTO (sem userId)
   ========================================================= */

/** Linha única */
export interface WeddingSettings {
  weddingDate: ISODate | null;
  totalBudgetCents: number | null;
}

export type WeddingItemStatus = "quoting" | "closed" | "paid";

export interface WeddingItem {
  id: ID;
  name: string;
  supplier: string | null;
  contact: string | null;
  totalCents: number;
  eventDate: ISODate | null;
  status: WeddingItemStatus;
  notes: string | null;
}

export interface WeddingInstallment {
  id: ID;
  itemId: ID;
  amountCents: number;
  dueDate: ISODate;
  /** null = ainda não paga */
  paidAt: ISODate | null;
}

/** Aporte na reserva (cofrinho) do casamento */
export interface WeddingFundEntry {
  id: ID;
  amountCents: number;
  date: ISODate;
  note: string | null;
  /** Preenchido quando o aporte veio de um lançamento individual com categoria "Casamento" */
  linkedTransactionId: ID | null;
}

export type PayoffProjectionBase = "average3m" | "currentMonth" | "lastMonth" | "custom";

/** Painel do casamento. Derivado, não persistido. */
export interface WeddingSummary {
  /** Total de aportes na reserva */
  reserveCents: number;
  /** Soma das parcelas já pagas */
  paidCents: number;
  /** Soma do valor total dos itens fechados/pagos */
  committedCents: number;
  /** committed − paid − reserva disponível (nunca negativo) */
  remainingCents: number;
  totalBudgetCents: number | null;
  /** Base usada no cálculo da previsão */
  projectionBase: PayoffProjectionBase;
  monthlyContributionCents: number;
  /** null quando não há aportes suficientes para projetar */
  projectedPayoffDate: ISODate | null;
}

/* =========================================================
   AMBIENTE COMPARTILHADO — EMPRESA VYK (sem userId)
   ========================================================= */

export interface CompanySettings {
  targetLaunchDate: ISODate | null;
  targetCapitalCents: number; // Meta de capital inicial
}

export type CompanyCostStatus = "planned" | "paid";

export interface CompanyCostItem {
  id: ID;
  name: string;
  category: "legal" | "equipment" | "marketing" | "operating";
  amountCents: number;
  status: CompanyCostStatus;
  notes: string | null;
}

export interface CompanyFundEntry {
  id: ID;
  amountCents: number;
  date: ISODate;
  note: string | null;
  linkedTransactionId: ID | null;
}

export interface CompanySummary {
  reserveCents: number;
  paidCostsCents: number;
  plannedCostsCents: number;
  remainingCapitalCents: number;
}

/* =========================================================
   HISTÓRICO SALARIAL / EVOLUÇÃO DE RENDA
   ========================================================= */

export interface SalaryRecord {
  id: ID;
  userId: ID;
  title: string; // Ex: "Desenvolvedor Pleno", "Sênior"
  company: string;
  amountCents: number;
  startDate: ISODate;
  endDate: ISODate | null; // null = atual
  notes: string | null;
}

