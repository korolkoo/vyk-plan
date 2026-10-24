// vyk-plan/mocks/empresa.ts
// Dados de exemplo do ambiente compartilhado (Empresa VYK).
// Espelha o contrato definido em types/types.ts.

import type {
  CompanyCostItem,
  CompanyFundEntry,
  CompanySettings,
  CompanySummary,
} from "@/types/types";

export const mockCompanySettings: CompanySettings = {
  targetLaunchDate: "2028-01-10",
  targetCapitalCents: 5000000, // R$ 50.000,00 de meta de capital inicial
};

export const mockCompanyCosts: CompanyCostItem[] = [
  {
    id: "cost_inpi",
    name: "Registro de Marca no INPI",
    category: "legal",
    amountCents: 142000, // R$ 1.420,00
    status: "planned",
    notes: "Taxas federais e honorários de registro de marca e software.",
  },
  {
    id: "cost_cnpj",
    name: "Abertura de CNPJ e Certificado Digital",
    category: "legal",
    amountCents: 65000, // R$ 650,00
    status: "planned",
    notes: "Certificado e-CNPJ A1 e taxas da junta comercial.",
  },
  {
    id: "cost_equipamentos",
    name: "Estações de Trabalho & Equipamentos",
    category: "equipment",
    amountCents: 1800000, // R$ 18.000,00
    status: "planned",
    notes: "Hardware de alta performance para desenvolvimento e design.",
  },
  {
    id: "cost_identidade",
    name: "Identidade Visual & Domínios",
    category: "marketing",
    amountCents: 35000, // R$ 350,00
    status: "paid",
    notes: "Registro do domínio vyk.com.br e materiais iniciais.",
  },
  {
    id: "cost_giro",
    name: "Capital de Giro Inicial",
    category: "operating",
    amountCents: 2000000, // R$ 20.000,00
    status: "planned",
    notes: "Fundo de segurança operacional para os primeiros 6 meses.",
  },
];

export const mockCompanyFundEntries: CompanyFundEntry[] = [
  {
    id: "comp_fund_01",
    amountCents: 100000, // R$ 1.000,00
    date: "2026-08-01",
    note: "Aporte inicial para a empresa VYK",
    linkedTransactionId: null,
  },
  {
    id: "comp_fund_02",
    amountCents: 100000, // R$ 1.000,00
    date: "2026-09-01",
    note: "Aporte Setembro",
    linkedTransactionId: null,
  },
  {
    id: "comp_fund_03",
    amountCents: 150000, // R$ 1.500,00
    date: "2026-10-01",
    note: "Aporte Outubro - Lucro de projeto extra",
    linkedTransactionId: null,
  },
];

export const mockCompanySummary: CompanySummary = {
  reserveCents: 350000, // R$ 3.500,00 já acumulados
  paidCostsCents: 35000, // R$ 350,00 pagos (domínios)
  plannedCostsCents: 4007000, // R$ 40.070,00 em custos previstos
  remainingCapitalCents: 4650000, // R$ 46.500,00 restantes para atingir os 50k
};
