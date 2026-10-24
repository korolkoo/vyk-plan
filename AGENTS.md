# VYK Plan — Documento de Contexto (Handoff para IAs)

> **LEIA ANTES DE QUALQUER AÇÃO.** Este arquivo é a fonte da verdade do projeto.
> Atualize a seção **Status Atual** e o **Changelog** ao final de cada etapa concluída.

Última atualização: 2026-10-24 — Fase 5 concluída (Cartões de Crédito, Faturas com fechamento/vencimento automático, Compras Parceladas e Quitação). Próxima: Fase 6 (Dashboard Conectado).

---

## 1. Visão do Produto

Software minimalista de controle financeiro pessoal + planejamento de casamento.
Usuários: **apenas 2** — Yuri e Vithória. Sem cadastro público.

| Ambiente | Visibilidade | Conteúdo |
|---|---|---|
| **Individual** | Só o dono vê | Contas, cartões/faturas, lançamentos, recorrências, metas, calendário |
| **Compartilhado** | Ambos leem e editam | Planejamento do Casamento |

Uso intenso em **mobile E desktop** — ambos devem funcionar perfeitamente.

---

## 2. Regras de Trabalho com a IA

- Trabalhar em **etapas**: plano → aprovação do usuário ("Pode seguir") → **um arquivo/componente por vez**.
- **Exceção à regra global de monorepo:** neste projeto a IA **PODE** mexer em tudo
  (front, banco, Server Actions, auth). Autorizado pelo usuário em 2026-10-22.
- Todo dado consumido deve ter `interface` TypeScript em `types/` refletida em `mocks/`.
- Next.js **App Router** estrito. Diferenciar Server Components e `"use client"`.
- Idioma da UI e das rotas: **português**.
- Gerar/atualizar este `.md` frequentemente.

---

## 3. Stack (decidida)

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Mesmo do WFX |
| Estilo | Tailwind CSS **v4** (config CSS-first via `@theme`) | Evitar mistura v3/v4 que existe no WFX |
| Banco | **Neon** (PostgreSQL serverless) | Grátis, Postgres = padrão enterprise, integra com Vercel |
| ORM | **Drizzle ORM** + drizzle-kit (migrations) | Leve, SQL-like, tipagem forte, serverless-friendly |
| Auth | **Better Auth** (email + senha, `disableSignUp`) | Caseiro; 2 usuários criados via seed |
| Estado UI | Zustand (`store/`) | Mesmo do WFX |
| Ícones | lucide-react | Mesmo do WFX |
| Toasts | react-hot-toast | Mesmo do WFX |
| Tema | next-themes (claro/escuro) | Mesmo do WFX |
| Deploy | Vercel | Mesmo do WFX |

Convenções de dados:
- Dinheiro sempre em **centavos (integer)**. Nunca float.
- Fuso: `America/Sao_Paulo`. Datas de competência como `date` (sem hora).
- Isolamento: **toda query individual filtra por `userId` no servidor** (nunca confiar no cliente).

---

## 4. Identidade Visual

- Logo: texto `vyk` minúsculo, fonte **League Spartan**, cor Navy Blue.
- League Spartan: **só logo e H1**. Restante da UI: **Inter**.
- Minimalista, muito respiro.

| Token | Cor | Uso |
|---|---|---|
| `aurora` | `#F6F9FE` | Fundo |
| `navy` | `#173B64` | Texto / logo |
| `powder` | `#A3C5EB` | Detalhes, bordas, estados |
| `naples` | `#FEDE6F` | CTAs / destaques / botão "+" |
| `alice` | `#FFFAA4` | Cards |

Modo escuro (V1): definido em `app/globals.css`.

**Regra de uso de cores nos componentes:** usar SEMPRE os tokens semânticos
(`bg-background`, `bg-surface`, `bg-card`, `text-foreground`, `text-muted`, `border-border`,
`bg-accent`/`text-accent-foreground`, `ring`). Eles trocam sozinhos no `.dark`.
Cores da marca (`bg-navy`, `bg-naples`...) só para casos fixos (logo, ilustrações).
Fontes: `font-sans` (Inter, padrão) e `font-display` (League Spartan — logo/H1; `h1` já aplica).

### Notas técnicas do setup (Next 16.4)
- `next.config.ts` veio com **`cacheComponents: true`** e `partialPrefetching: true` (padrão do template).
  ⚠️ Com Cache Components, acessar dados dinâmicos (`cookies()`, `headers()`, sessão, queries)
  fora de `<Suspense>` gera erro de build. Envolver partes dinâmicas em `<Suspense>`
  ou usar `"use cache"` onde fizer sentido.
- Tailwind v4 roda via loader `@tailwindcss/turbopack` configurado em `next.config.ts`
  (não há `postcss.config`). Dark mode por classe: `@custom-variant dark` no `globals.css`.
- Projeto criado com `create-next-app --no-src-dir`, alias `@/*`.

---

## 5. Arquitetura de Pastas (padrão herdado do WFX)

Referência analisada: `korolkoo/WFX---Website` (app/, components/, lib/, store/, types/, utils/, middleware.ts).
Melhorias aplicadas: `proxy.ts` (substitui `middleware.ts` no Next 16), cliente de banco único, pasta `mocks/`.

```
vyk-plan/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (app)/                      # layout com sidebar (desktop) / bottom-nav (mobile) + FAB "+"
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Dashboard pessoal
│   │   ├── financas/               # lançamentos do mês
│   │   │   └── recorrencias/
│   │   ├── contas/
│   │   ├── cartoes/[id]/           # faturas do cartão
│   │   ├── calendario/
│   │   ├── metas/
│   │   ├── casamento/
│   │   │   └── itens/[id]/
│   │   └── configuracoes/          # categorias, perfil, tema
│   ├── api/auth/[...all]/route.ts  # handler do Better Auth (única rota de API)
│   ├── layout.tsx
│   ├── providers.tsx
│   └── globals.css                 # tokens @theme
├── actions/                        # Server Actions por domínio
├── components/
│   ├── ui/                         # Button, Card, Input, Modal, ProgressBar...
│   ├── layout/                     # Sidebar, BottomNav, Fab, Logo
│   ├── financas/
│   ├── cartoes/
│   ├── calendario/
│   └── casamento/
├── lib/
│   ├── db/{index.ts, schema.ts}
│   └── auth.ts
├── mocks/
├── store/
├── types/types.ts
├── utils/                          # formatCurrency, datas, cálculo de fatura
├── drizzle/                        # migrations geradas
├── scripts/seed.ts                 # cria Yuri e Vithória + categorias padrão
└── proxy.ts                        # proteção de rotas
```

---

## 6. Escopo V1

### Individual
- **Contas** (corrente, poupança, carteira, investimento) com saldo.
- **Cartões de crédito** com dia de fechamento/vencimento, **faturas** e **compras parceladas** (ex.: 3/10).
- **Lançamentos**: receita, despesa, transferência. Status **pago / pendente**.
- **Categorias**: padrões do sistema + criadas pelo usuário.
- **Recorrências**: geram lançamentos **previstos** que o usuário confirma.
- **Metas** pessoais com progresso.
- **Calendário** mensal com vencimentos, lançamentos e faturas.
- **Dashboard**: saldo do mês, próximas contas, faturas abertas, metas.
- **Botão flutuante "+"** (naples) para lançamento rápido em qualquer tela.
- **Modo escuro**.

### Compartilhado — Casamento
- Configuração preenchível: data do casamento e orçamento total (opcionais).
- **Contador regressivo** até a data.
- **Itens** (buffet, fotógrafo...): fornecedor, contato, valor total, data, status
  (orçando / fechado / pago), observações, **parcelas com vencimento**.
- **Reserva** (cofrinho): aportes ao fundo do casamento.
- Painel: total da reserva, total pago/destinado, total restante,
  **barra de progresso do dinheiro** e **previsão de quitação**.
- Sem histórico de alterações e sem atribuição de autor.
- No individual, o dinheiro destinado aparece só como categoria "Casamento" (não o item).

### V2+ (backlog)
- Captura automática de transações (notificações do celular / Open Finance).
  → Preparar desde já: campo `source` ('manual' | 'auto') em `transactions`.
- Relatórios/gráficos, comparação mês a mês.
- Importar extrato (OFX/CSV), anexos de comprovante/contrato.

---

## 7. Modelagem de Dados (rascunho — aguardando aprovação)

Individual (todas com `userId`):
- `users` — gerenciada pelo Better Auth (+ sessions, accounts, verifications).
- `bank_accounts` — name, type, initialBalanceCents, color, archived.
- `credit_cards` — name, limitCents, closingDay, dueDay, color, paymentAccountId.
- `card_invoices` — creditCardId, referenceMonth (YYYY-MM), closingDate, dueDate, status (open|closed|paid).
- `categories` — userId **nullable** (null = padrão do sistema), name, kind (income|expense), icon, color.
- `transactions` — type (income|expense|transfer), amountCents, description, date, status (pending|paid),
  isForecast, categoryId, bankAccountId?, creditCardId?, invoiceId?, transferToAccountId?,
  installmentGroupId?, installmentNumber?, installmentTotal?, recurrenceId?, source, notes.
- `recurrences` — template do lançamento, frequency, dayOfMonth, startDate, endDate?, active.
- `goals` / `goal_contributions`.

Compartilhado (sem `userId`):
- `wedding_settings` — linha única: weddingDate?, totalBudgetCents?.
- `wedding_items` — name, supplier, contact, totalCents, eventDate?, status, notes.
- `wedding_installments` — itemId, amountCents, dueDate, paidAt?.
- `wedding_fund_entries` — amountCents, date, note, linkedTransactionId?.

Previsão de quitação (padrão) = (total restante − reserva) ÷ média mensal de aportes dos últimos 3 meses.
Modo simulação: usuário escolhe base "mês atual", "mês passado" ou valor X digitado → recalcula a data prevista.

Decisões de regra (2026-10-22):
- Lançamento individual com categoria "Casamento" **cria aporte automático** em `wedding_fund_entries`
  (via `linkedTransactionId`; editar/excluir o lançamento reflete no aporte).
- `isForecast` (previsto, gerado por recorrência, não confirmado) é **separado** de `status` (pending|paid).
- **PWA na V1** (manifest + ícones + instalável), entregue na Fase 10.

---

## 8. Roadmap

| Fase | Entrega | Status |
|---|---|---|
| 0 | Setup: create-next-app, deps, Tailwind v4 + tokens, fontes, pastas | ✅ Concluída |
| 1 | Design system (ui/) + shell (sidebar/bottom-nav/FAB/tema) com mocks | ✅ Concluída |
| 2 | Neon + Drizzle schema + migrations + seed + Better Auth + proxy.ts + login | ✅ Concluída |
| 3 | Contas e Categorias (CRUD com Server Actions e Neon) | ✅ Concluída |
| 4 | Lançamentos + Recorrências (previstos) | ✅ Concluída |
| 5 | Cartões, Faturas e Parcelamento | ✅ Concluída |
| 6 | Dashboard conectado | ⏳ Próxima |
| 7 | Calendário conectado | ⬜ |
| 8 | Metas conectadas | ⬜ |
| 9 | Casamento (itens, parcelas, reserva, progresso, previsão, contador) | ⬜ |
| 10 | Polimento, responsividade, PWA, deploy Vercel | ⬜ |

---

## 9. Status Atual

- [x] Escopo e stack definidos com o usuário.
- [x] Análise do repositório WFX concluída.
- [x] Usuário aprovou plano e respondeu perguntas (ver decisões na seção 7).
- [x] Fase 1 — Design System, Shell e Rotas com Mocks concluídos (build OK).
- [x] Fase 2 — Neon + Drizzle + Better Auth concluída (build e migrations OK).
- [x] Fase 3 — Contas e Categorias CRUD concluída (build, Server Actions e testes em navegador OK).
- [x] Fase 4 — Lançamentos + Recorrências concluída (build, Server Actions, testes em navegador e Neon OK).
- [x] Fase 5 — Cartões, Faturas e Parcelamento concluída (build, Server Actions, testes em navegador e Neon OK).
  - Cálculo de datas de fechamento e vencimento de faturas em `utils/invoices.ts`.
  - Server actions de cartões (`actions/cartoes.ts`): criação, listagem com cálculo de limite comprometido/disponível e fatura aberta atual.
  - Server actions de faturas e compras parceladas (`actions/faturas.ts`): distribuição automática de N parcelas em faturas consecutivas e quitação de fatura com débito em conta.
  - Interface do modal de cartão `CreditCardModal.tsx` e tela `/cartoes` conectada ao Neon.
  - Tela detalhada de faturas `/cartoes/[id]` com abas dinâmicas de competência, tags de parcelas e modal de quitação `PayInvoiceModal.tsx`.
  - `QuickTransactionModal.tsx` com suporte a seleção de cartões reais do Neon e parcelamento de 1x a 24x.
- [ ] Fase 6 — Dashboard conectado (aguardando "Pode seguir").

### Perguntas pendentes
- Nenhuma no momento.

---

## 10. Changelog

- **2026-10-24** — Fase 5 concluída: Cartões de Crédito, Faturas e Parcelamento. Lógica matemática de fechamento e melhor dia de compra, distribuição de parcelas (1/N, 2/N) em faturas futuras, tela `/cartoes` e `/cartoes/[id]` integradas ao Neon, pagamento de faturas com débito em conta e modal rápido com suporte a parcelamento. Build 100% OK e verificado no navegador.

- **2026-10-24** — Primeiro Commit Git: Projeto consolidado com Fases 0 a 4 concluídas (Design System, Autenticação Better Auth, Neon PostgreSQL, Contas, Categorias, Lançamentos e Recorrências com previsões automáticas). Arquivos de credenciais locais protegidos no `.gitignore`.
- **2026-10-24** — Fase 4 concluída: Lançamentos e Recorrências com Server Actions e Neon PostgreSQL. Transações reais conectadas ao QuickTransactionModal e tela de Finanças, gerador automático de previsões de despesas/receitas fixas e regra de aporte automático de Casamento. Build 100% OK e verificado no navegador.
- **2026-10-24** — Fase 3 concluída: Contas e Categorias integradas com Server Actions no Neon PostgreSQL. Modais de criação/edição/arquivamento de contas e gerenciamento de categorias implementados e validados no navegador.
- **2026-10-24** — Fase 2 concluída: Neon PostgreSQL conectado e testado, schemas Drizzle aplicados, Better Auth configurado (cadastro fechado), tela de login criada, seed de Yuri & Vithória executado e middleware de proteção ativo. Build 100% OK.
- **2026-10-22** — Melhorias de UX e Novos Módulos: Modo Privacidade global com Zustand ("olhinho" bancário), Calendário em grade estilo Teams/Outlook, novo módulo compartilhado "Empresa VYK" (`/empresa`) e histórico de evolução salarial em `/financas`. Build 100% OK.
- **2026-10-22** — Fase 1 concluída: Design system em `components/ui/`, layout desktop (Sidebar) e mobile (BottomNav + gaveta), FAB "+", modal de lançamento rápido, dashboard e páginas de todas as rotas com mocks. Build 100% OK.
- **2026-10-22** — Fase 0 concluída: Next 16.4.2 + React 19.3 + Tailwind v4, tokens claro/escuro, fontes, providers, deps.
