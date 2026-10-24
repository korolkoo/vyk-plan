// vyk-plan/mocks/salarios.ts
import type { SalaryRecord } from "@/types/types";

export const mockSalaryHistory: SalaryRecord[] = [
  {
    id: "sal_01",
    userId: "usr_yuri",
    title: "Desenvolvedor Júnior",
    company: "Tech Solutions",
    amountCents: 450000, // R$ 4.500,00
    startDate: "2024-01-01",
    endDate: "2025-06-30",
    notes: "Contratação inicial.",
  },
  {
    id: "sal_02",
    userId: "usr_yuri",
    title: "Desenvolvedor Pleno",
    company: "Tech Solutions",
    amountCents: 550000, // R$ 5.500,00
    startDate: "2025-07-01",
    endDate: "2026-05-31",
    notes: "Promoção por desempenho (+22,2%).",
  },
  {
    id: "sal_03",
    userId: "usr_yuri",
    title: "Desenvolvedor Sênior",
    company: "Tech Solutions",
    amountCents: 650000, // R$ 6.500,00
    startDate: "2026-06-01",
    endDate: null, // Atual
    notes: "Reajuste salarial atual (+18,2%).",
  },
];
