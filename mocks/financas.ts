// vyk-plan/mocks/financas.ts
// Dados de exemplo do ambiente individual (usuário: Yuri, mês: 2026-10).
import type {
  BankAccountWithBalance,
  CardInvoiceWithTotal,
  Category,
  CreditCard,
  GoalWithProgress,
  Recurrence,
  Transaction,
} from "@/types/types";

const U = "usr_yuri";

export const mockCategories: Category[] = [
  { id: "cat_salario", userId: null, name: "Salário", kind: "income", icon: "Briefcase", color: "#2F9E6F", systemKey: null },
  { id: "cat_extra", userId: null, name: "Renda extra", kind: "income", icon: "Sparkles", color: "#4FB38A", systemKey: null },
  { id: "cat_mercado", userId: null, name: "Mercado", kind: "expense", icon: "ShoppingCart", color: "#E8A33D", systemKey: null },
  { id: "cat_moradia", userId: null, name: "Moradia", kind: "expense", icon: "Home", color: "#5B7593", systemKey: null },
  { id: "cat_transporte", userId: null, name: "Transporte", kind: "expense", icon: "Car", color: "#6C8EBF", systemKey: null },
  { id: "cat_lazer", userId: null, name: "Lazer", kind: "expense", icon: "Popcorn", color: "#C76BA8", systemKey: null },
  { id: "cat_saude", userId: null, name: "Saúde", kind: "expense", icon: "HeartPulse", color: "#D9534F", systemKey: null },
  { id: "cat_assinaturas", userId: null, name: "Assinaturas", kind: "expense", icon: "Repeat", color: "#8A6FD1", systemKey: null },
  { id: "cat_casamento", userId: null, name: "Casamento", kind: "expense", icon: "Gem", color: "#FEDE6F", systemKey: "wedding" },
  { id: "cat_pet", userId: U, name: "Pet", kind: "expense", icon: "PawPrint", color: "#A3C5EB", systemKey: null },
];

export const mockBankAccounts: BankAccountWithBalance[] = [
  { id: "acc_nubank", userId: U, name: "Nubank", type: "checking", initialBalanceCents: 120000, color: "#8A05BE", archived: false, currentBalanceCents: 384250 },
  { id: "acc_poupanca", userId: U, name: "Poupança", type: "savings", initialBalanceCents: 500000, color: "#2F9E6F", archived: false, currentBalanceCents: 650000 },
  { id: "acc_carteira", userId: U, name: "Carteira", type: "wallet", initialBalanceCents: 15000, color: "#E8A33D", archived: false, currentBalanceCents: 8000 },
];

export const mockCreditCards: CreditCard[] = [
  { id: "card_nu", userId: U, name: "Nubank Roxinho", limitCents: 800000, closingDay: 3, dueDay: 10, color: "#8A05BE", paymentAccountId: "acc_nubank" },
  { id: "card_inter", userId: U, name: "Inter Gold", limitCents: 400000, closingDay: 20, dueDay: 27, color: "#FF7A00", paymentAccountId: "acc_nubank" },
];

export const mockInvoices: CardInvoiceWithTotal[] = [
  { id: "inv_nu_2026_10", creditCardId: "card_nu", referenceMonth: "2026-10", closingDate: "2026-10-03", dueDate: "2026-10-10", status: "paid", totalCents: 142090 },
  { id: "inv_nu_2026_11", creditCardId: "card_nu", referenceMonth: "2026-11", closingDate: "2026-11-03", dueDate: "2026-11-10", status: "open", totalCents: 98730 },
  { id: "inv_inter_2026_10", creditCardId: "card_inter", referenceMonth: "2026-10", closingDate: "2026-10-20", dueDate: "2026-10-27", status: "closed", totalCents: 45990 },
];

/** Base para não repetir campos nulos */
const base = {
  userId: U,
  isForecast: false,
  bankAccountId: null,
  creditCardId: null,
  invoiceId: null,
  transferToAccountId: null,
  installmentGroupId: null,
  installmentNumber: null,
  installmentTotal: null,
  recurrenceId: null,
  source: "manual",
  notes: null,
} satisfies Partial<Transaction>;

export const mockTransactions: Transaction[] = [
  { ...base, id: "tx_01", type: "income", amountCents: 650000, description: "Salário", date: "2026-10-05", status: "paid", categoryId: "cat_salario", bankAccountId: "acc_nubank", recurrenceId: "rec_salario" },
  { ...base, id: "tx_02", type: "expense", amountCents: 180000, description: "Aluguel", date: "2026-10-10", status: "paid", categoryId: "cat_moradia", bankAccountId: "acc_nubank", recurrenceId: "rec_aluguel" },
  { ...base, id: "tx_03", type: "expense", amountCents: 54320, description: "Mercado do mês", date: "2026-10-12", status: "paid", categoryId: "cat_mercado", creditCardId: "card_nu", invoiceId: "inv_nu_2026_11" },
  { ...base, id: "tx_04", type: "expense", amountCents: 39990, description: "Fone Bluetooth", date: "2026-10-14", status: "paid", categoryId: "cat_lazer", creditCardId: "card_nu", invoiceId: "inv_nu_2026_11", installmentGroupId: "grp_fone", installmentNumber: 3, installmentTotal: 10 },
  { ...base, id: "tx_05", type: "expense", amountCents: 50000, description: "Reserva do casamento", date: "2026-10-15", status: "paid", categoryId: "cat_casamento", bankAccountId: "acc_nubank" },
  { ...base, id: "tx_06", type: "transfer", amountCents: 150000, description: "Guardar na poupança", date: "2026-10-16", status: "paid", categoryId: null, bankAccountId: "acc_nubank", transferToAccountId: "acc_poupanca" },
  { ...base, id: "tx_07", type: "expense", amountCents: 5590, description: "Spotify", date: "2026-10-18", status: "paid", categoryId: "cat_assinaturas", creditCardId: "card_inter", invoiceId: "inv_inter_2026_10", recurrenceId: "rec_spotify" },
  { ...base, id: "tx_08", type: "expense", amountCents: 12000, description: "Uber", date: "2026-10-21", status: "paid", categoryId: "cat_transporte", creditCardId: "card_nu", invoiceId: "inv_nu_2026_11" },
  { ...base, id: "tx_09", type: "expense", amountCents: 18990, description: "Internet", date: "2026-10-25", status: "pending", categoryId: "cat_moradia", bankAccountId: "acc_nubank", recurrenceId: "rec_internet" },
  { ...base, id: "tx_10", type: "expense", amountCents: 9500, description: "Academia", date: "2026-10-28", status: "pending", isForecast: true, categoryId: "cat_saude", bankAccountId: "acc_nubank", recurrenceId: "rec_academia" },
  { ...base, id: "tx_11", type: "income", amountCents: 80000, description: "Freela", date: "2026-10-30", status: "pending", categoryId: "cat_extra", bankAccountId: "acc_nubank" },
];

export const mockRecurrences: Recurrence[] = [
  { id: "rec_salario", userId: U, type: "income", description: "Salário", amountCents: 650000, categoryId: "cat_salario", bankAccountId: "acc_nubank", creditCardId: null, frequency: "monthly", dayOfMonth: 5, startDate: "2025-01-05", endDate: null, active: true },
  { id: "rec_aluguel", userId: U, type: "expense", description: "Aluguel", amountCents: 180000, categoryId: "cat_moradia", bankAccountId: "acc_nubank", creditCardId: null, frequency: "monthly", dayOfMonth: 10, startDate: "2025-01-10", endDate: null, active: true },
  { id: "rec_spotify", userId: U, type: "expense", description: "Spotify", amountCents: 5590, categoryId: "cat_assinaturas", bankAccountId: null, creditCardId: "card_inter", frequency: "monthly", dayOfMonth: 18, startDate: "2025-03-18", endDate: null, active: true },
  { id: "rec_internet", userId: U, type: "expense", description: "Internet", amountCents: 18990, categoryId: "cat_moradia", bankAccountId: "acc_nubank", creditCardId: null, frequency: "monthly", dayOfMonth: 25, startDate: "2025-01-25", endDate: null, active: true },
  { id: "rec_academia", userId: U, type: "expense", description: "Academia", amountCents: 9500, categoryId: "cat_saude", bankAccountId: "acc_nubank", creditCardId: null, frequency: "monthly", dayOfMonth: 28, startDate: "2026-06-28", endDate: null, active: true },
];

export const mockGoals: GoalWithProgress[] = [
  { id: "goal_reserva", userId: U, name: "Reserva de emergência", targetCents: 2000000, targetDate: "2027-06-30", icon: "ShieldCheck", color: "#2F9E6F", savedCents: 650000 },
  { id: "goal_viagem", userId: U, name: "Lua de mel", targetCents: 1500000, targetDate: null, icon: "Plane", color: "#A3C5EB", savedCents: 320000 },
];
