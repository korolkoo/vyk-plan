// vyk-plan/mocks/casamento.ts
// Dados de exemplo do ambiente compartilhado (Casamento Yuri & Vithória).
// Espelha o contrato definido em types/types.ts.

import type {
  WeddingFundEntry,
  WeddingInstallment,
  WeddingItem,
  WeddingSettings,
  WeddingSummary,
} from "@/types/types";

/** Configurações gerais do casamento */
export const mockWeddingSettings: WeddingSettings = {
  weddingDate: "2027-10-16",
  totalBudgetCents: 6500000, // R$ 65.000,00
};

/** Itens e fornecedores orçados ou contratados */
export const mockWeddingItems: WeddingItem[] = [
  {
    id: "wed_buffet",
    name: "Espaço & Buffet Jardim Real",
    supplier: "Buffet Jardim Real",
    contact: "(11) 98765-4321 - Carla",
    totalCents: 2800000, // R$ 28.000,00
    eventDate: "2027-10-16",
    status: "closed",
    notes: "Entrada paga. Restante em 10 parcelas mensais.",
  },
  {
    id: "wed_foto",
    name: "Fotografia e Vídeo",
    supplier: "Luz & Foco Studio",
    contact: "(11) 99123-4567 - Marcos",
    totalCents: 850000, // R$ 8.500,00
    eventDate: "2027-10-16",
    status: "closed",
    notes: "Pacote completo com pré-wedding e álbum impresso.",
  },
  {
    id: "wed_musica",
    name: "Banda & Iluminação da Pista",
    supplier: "Banda Sonora",
    contact: "contato@bandasonora.art",
    totalCents: 600000, // R$ 6.000,00
    eventDate: "2027-10-16",
    status: "quoting",
    notes: "Aguardando confirmação de repertório e Rider técnico.",
  },
  {
    id: "wed_decor",
    name: "Decoração Floral e Cenografia",
    supplier: "Arranjos & Estilo",
    contact: "(11) 97654-3210 - Amanda",
    totalCents: 1100000, // R$ 11.000,00
    eventDate: "2027-10-16",
    status: "closed",
    notes: "Flores da estação e arco de cerimônia externo.",
  },
  {
    id: "wed_traje_noiva",
    name: "Vestido da Noiva",
    supplier: "Ateliê Elegance",
    contact: "atendimento@elegance.com",
    totalCents: 520000, // R$ 5.200,00
    eventDate: "2027-10-16",
    status: "paid",
    notes: "Primeiro aluguel com ajustes e véu inclusos. 100% quitado.",
  },
];

/** Parcelas associadas aos itens */
export const mockWeddingInstallments: WeddingInstallment[] = [
  // Vestido (Quitado)
  {
    id: "inst_traje_1",
    itemId: "wed_traje_noiva",
    amountCents: 260000,
    dueDate: "2026-08-10",
    paidAt: "2026-08-09",
  },
  {
    id: "inst_traje_2",
    itemId: "wed_traje_noiva",
    amountCents: 260000,
    dueDate: "2026-09-10",
    paidAt: "2026-09-08",
  },

  // Espaço & Buffet
  {
    id: "inst_buffet_entrada",
    itemId: "wed_buffet",
    amountCents: 500000,
    dueDate: "2026-09-15",
    paidAt: "2026-09-15",
  },
  {
    id: "inst_buffet_p1",
    itemId: "wed_buffet",
    amountCents: 230000,
    dueDate: "2026-10-15",
    paidAt: "2026-10-14",
  },
  {
    id: "inst_buffet_p2",
    itemId: "wed_buffet",
    amountCents: 230000,
    dueDate: "2026-11-15",
    paidAt: null,
  },
  {
    id: "inst_buffet_p3",
    itemId: "wed_buffet",
    amountCents: 230000,
    dueDate: "2026-12-15",
    paidAt: null,
  },

  // Foto & Vídeo
  {
    id: "inst_foto_p1",
    itemId: "wed_foto",
    amountCents: 200000,
    dueDate: "2026-10-20",
    paidAt: "2026-10-19",
  },
  {
    id: "inst_foto_p2",
    itemId: "wed_foto",
    amountCents: 200000,
    dueDate: "2026-11-20",
    paidAt: null,
  },

  // Decoração
  {
    id: "inst_decor_sinal",
    itemId: "wed_decor",
    amountCents: 300000,
    dueDate: "2026-10-28",
    paidAt: null,
  },
];

/** Aportes na reserva do casamento */
export const mockWeddingFundEntries: WeddingFundEntry[] = [
  {
    id: "fund_01",
    amountCents: 250000, // R$ 2.500,00
    date: "2026-08-05",
    note: "Aporte inicial conjunto",
    linkedTransactionId: null,
  },
  {
    id: "fund_02",
    amountCents: 150000, // R$ 1.500,00
    date: "2026-09-05",
    note: "Aporte mensal Setembro",
    linkedTransactionId: null,
  },
  {
    id: "fund_03",
    amountCents: 50000, // R$ 500,00 - ligado à transação tx_05 de Yuri
    date: "2026-10-15",
    note: "Reserva do casamento (via lançamento individual)",
    linkedTransactionId: "tx_05",
  },
  {
    id: "fund_04",
    amountCents: 100000, // R$ 1.000,00
    date: "2026-10-20",
    note: "Economia extra do mês",
    linkedTransactionId: null,
  },
];

/** Resumo consolidado pré-calculado para o painel */
export const mockWeddingSummary: WeddingSummary = {
  reserveCents: 550000, // R$ 5.500,00 na reserva
  paidCents: 1210000, // R$ 12.100,00 já pagos em parcelas
  committedCents: 5270000, // Itens fechados/pagos somados (28k + 8.5k + 11k + 5.2k)
  remainingCents: 3510000, // R$ 35.100,00 restantes (committed - paid - reserve)
  totalBudgetCents: 6500000,
  projectionBase: "average3m",
  monthlyContributionCents: 183333, // Média mensal ~ R$ 1.833,33
  projectedPayoffDate: "2027-06-15", // Quitação prevista meses antes da data do casamento
};
