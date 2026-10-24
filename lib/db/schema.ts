import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

/* =========================================================
   1. TABELAS DE AUTENTICAÇÃO (BETTER AUTH)
   ========================================================= */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/* =========================================================
   2. AMBIENTE INDIVIDUAL (ISOLADO POR USER_ID)
   ========================================================= */

export const bankAccounts = pgTable("bank_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // checking | savings | wallet | investment
  initialBalanceCents: integer("initial_balance_cents").default(0).notNull(),
  color: text("color").notNull(),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditCards = pgTable("credit_cards", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  limitCents: integer("limit_cents").default(0).notNull(),
  closingDay: integer("closing_day").notNull(), // 1 a 31
  dueDay: integer("due_day").notNull(), // 1 a 31
  color: text("color").notNull(),
  paymentAccountId: text("payment_account_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cardInvoices = pgTable("card_invoices", {
  id: text("id").primaryKey(),
  creditCardId: text("credit_card_id")
    .notNull()
    .references(() => creditCards.id, { onDelete: "cascade" }),
  referenceMonth: text("reference_month").notNull(), // YYYY-MM
  closingDate: text("closing_date").notNull(), // YYYY-MM-DD
  dueDate: text("due_date").notNull(), // YYYY-MM-DD
  status: text("status").notNull(), // open | closed | paid
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // null = categoria padrão do sistema
  name: text("name").notNull(),
  kind: text("kind").notNull(), // income | expense
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  systemKey: text("system_key"), // wedding | null
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // income | expense | transfer
  amountCents: integer("amount_cents").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  status: text("status").notNull(), // pending | paid
  isForecast: boolean("is_forecast").default(false).notNull(),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  bankAccountId: text("bank_account_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  creditCardId: text("credit_card_id").references(() => creditCards.id, {
    onDelete: "set null",
  }),
  invoiceId: text("invoice_id").references(() => cardInvoices.id, {
    onDelete: "set null",
  }),
  transferToAccountId: text("transfer_to_account_id").references(
    () => bankAccounts.id,
    { onDelete: "set null" }
  ),
  installmentGroupId: text("installment_group_id"),
  installmentNumber: integer("installment_number"),
  installmentTotal: integer("installment_total"),
  recurrenceId: text("recurrence_id"),
  source: text("source").default("manual").notNull(), // manual | auto
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recurrences = pgTable("recurrences", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // income | expense
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  bankAccountId: text("bank_account_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  creditCardId: text("credit_card_id").references(() => creditCards.id, {
    onDelete: "set null",
  }),
  frequency: text("frequency").notNull(), // weekly | monthly | yearly
  dayOfMonth: integer("day_of_month").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  active: boolean("active").default(true).notNull(),
});

export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetCents: integer("target_cents").notNull(),
  targetDate: text("target_date"),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goalContributions = pgTable("goal_contributions", {
  id: text("id").primaryKey(),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  date: text("date").notNull(),
  note: text("note"),
});

export const salaryRecords = pgTable("salary_records", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  company: text("company").notNull(),
  amountCents: integer("amount_cents").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"), // null = atual
  notes: text("notes"),
});

/* =========================================================
   3. AMBIENTE COMPARTILHADO — CASAMENTO
   ========================================================= */

export const weddingSettings = pgTable("wedding_settings", {
  id: text("id").primaryKey().default("wedding_global"),
  weddingDate: text("wedding_date"), // YYYY-MM-DD
  totalBudgetCents: integer("total_budget_cents"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const weddingItems = pgTable("wedding_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  supplier: text("supplier"),
  contact: text("contact"),
  totalCents: integer("total_cents").notNull(),
  eventDate: text("event_date"),
  status: text("status").notNull(), // quoting | closed | paid
  notes: text("notes"),
});

export const weddingInstallments = pgTable("wedding_installments", {
  id: text("id").primaryKey(),
  itemId: text("item_id")
    .notNull()
    .references(() => weddingItems.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  dueDate: text("due_date").notNull(),
  paidAt: text("paid_at"),
});

export const weddingFundEntries = pgTable("wedding_fund_entries", {
  id: text("id").primaryKey(),
  amountCents: integer("amount_cents").notNull(),
  date: text("date").notNull(),
  note: text("note"),
  linkedTransactionId: text("linked_transaction_id"),
});

/* =========================================================
   4. AMBIENTE COMPARTILHADO — EMPRESA VYK
   ========================================================= */

export const companySettings = pgTable("company_settings", {
  id: text("id").primaryKey().default("company_global"),
  targetLaunchDate: text("target_launch_date"),
  targetCapitalCents: integer("target_capital_cents").default(5000000).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companyCostItems = pgTable("company_cost_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // legal | equipment | marketing | operating
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull(), // planned | paid
  notes: text("notes"),
});

export const companyFundEntries = pgTable("company_fund_entries", {
  id: text("id").primaryKey(),
  amountCents: integer("amount_cents").notNull(),
  date: text("date").notNull(),
  note: text("note"),
  linkedTransactionId: text("linked_transaction_id"),
});
