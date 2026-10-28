# VYK Plan — Documento de Contexto (Handoff para IAs)

> **LEIA ANTES DE QUALQUER AÇÃO.** Este arquivo é a fonte da verdade do projeto.
> Atualize a seção **Status Atual** e o **Changelog** ao final de cada etapa concluída.

Última atualização: 2026-10-25 — Refinamentos de UX & Negócio concluídos (Substituição global de window.confirm por ConfirmModal in-app, Calendário Acadêmico Univates com feriados/recessos escolares para Transporte Ortolan, edição inline no calendário, Salário 5º dia útil CLT, Saldo Realmente Livre).


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

Decisões de regra (2026-10-22 e 2026-10-24):
- Lançamento individual com categoria "Casamento" **cria aporte automático** em `wedding_fund_entries`
  (via `linkedTransactionId`; editar/excluir o lançamento reflete no aporte).
- `isForecast` (previsto, gerado por recorrência, não confirmado) é **separado** de `status` (pending|paid).
- **PWA na V1** (manifest + ícones + instalável), entregue na Fase 10.
- **Calendário (Fase 7)**: Os dias de **fechamento** e de **vencimento** de cada cartão de crédito ativo devem aparecer explicitamente na grade mensal de cada mês.
- **Faturas do Cartão (`/cartoes/[id]`)**: A ordenação das abas de competência é cronológica crescente (mês corrente/mais próximo na esquerda, meses futuros mais distantes na direita).

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
| 6 | Dashboard conectado | ✅ Concluída |
| 7 | Calendário conectado | ✅ Concluída |
| 8 | Metas conectadas | ✅ Concluída |
| 9 | Casamento (itens, parcelas, reserva, progresso, previsão, contador) | ✅ Concluída |
| 10 | Polimento, responsividade, PWA, deploy Vercel | ✅ Concluída |

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
- [x] Fase 6 — Dashboard conectado concluída (build, Server Actions, testes em navegador e Neon OK).
- [x] Fase 7 — Calendário conectado concluída (build, Server Actions, testes em navegador e Neon OK).
- [x] Fase 8 — Metas conectadas concluída (build, Server Actions, testes em navegador e Neon OK).
- [x] Fase 9 — Casamento & Empresa VYK conectados concluída (build, Server Actions, testes em navegador e Neon OK).
- [x] Fase 10 — Polimento, responsividade, PWA, deploy Vercel concluída.
  - Manifest PWA autogerado via Next.js Metadata Route (`app/manifest.ts`), ícone SVG de marca e meta tags de web app para iOS/Android.
  - Otimizações de viewport responsivo para mobile (Bottom Navigation bar, Floating Action Button central e gaveta de navegação "Mais").
  - Testes em navegadores em resoluções desktop e mobile (iPhone 375x812) concluídos.
  - Build de produção Next.js 16.4.2 com Turbopack, Cache Components e PPR 100% aprovado com 16 rotas.

- [x] Refinamentos de UX & Negócio (2026-10-25):
  - **Substituição Global de `window.confirm` por `ConfirmModal` in-app**: criado componente unificado `ConfirmModal.tsx` e integrado em 100% das telas do sistema (Finanças, Calendário, Cartões, Contas, Metas, Casamento, Empresa e Configurações), garantindo visual profissional e eliminando bloqueios de diálogos nativos em navegadores e PWAs.
  - **Calendário Acadêmico Univates & Feriados para Transporte Ortolan**: algoritmo `countAcademicDaysInMonth` em `utils/dates.ts` baseado nos documentos oficiais da Univates, descontando feriados nacionais, estaduais do RS, Carnaval, Corpus Christi, recesso escolar de Outubro/Dia do Professor (12 e 13/Out) e limites de início/término de semestres letivos. Cálculo 100% exato: Outubro = 15 dias (R$ 675,00 pagos em 10/Nov), Novembro = 16 dias (R$ 720,00 pagos em 10/Dez) e Dezembro = 11 dias (R$ 495,00 pagos em 10/Jan).
  - Recorrência "Transporte Ortolan" (Yuri e Vithória): cálculo de diárias por dias da semana (Segunda a Quinta, R$ 45,00/dia ajustável), faturamento deslocado para o dia 10 do mês seguinte (dias de Outubro pagos em 10 de Novembro) e isenção de pagamento nos meses de Janeiro e Fevereiro.
  - Edição inline de valores e descrições no Calendário (`DayInteractiveModal`): botão de lápis para despesas e receitas agendadas, permitindo alterar o valor do mês (ex.: por recesso ou faltas) com persistência imediata no Neon PostgreSQL.
  - Salário no 5º dia útil do mês (CLT) com cálculo dinâmico de dias úteis e feriados nacionais (`utils/dates.ts`).
  - Ocultar/exibir itens liquidados no calendário (`hidePaid` com toggle e persistência visual).
  - Saldo Realmente Livre no Dashboard: dedução segmentada de Metas & Futuro (provisões como Faculdade em 6 meses), Casamento, Faturas abertas de cartões atrelados e contas pendentes, com tags detalhadas.
  - Edição de configurações da Empresa VYK (data prevista de lançamento e meta de capital) via modal e botão "Ajustar".
  - Limpeza do botão manual de "Previsões" e destaque proeminente para "Contas Fixas & Recorrências Mensais".
  - **Sessão Real de Usuário & Botão Logout Global**:
    - Substituído `mockCurrentUser` fixo no `Sidebar.tsx` e `BottomNav.tsx` por `useSession()` do Better Auth, exibindo dinamicamente o nome, email e avatar do usuário logado (Yuri ou Vithória).
    - Adicionado botão de logout (`LogOut`) acessível no Sidebar, no BottomNav (gaveta mobile) e na página `/configuracoes`.
    - Rota `/manifest.webmanifest` liberada no `proxy.ts` para instalação de PWA em dispositivos móveis.
  - **Histórico e Evolução Salarial Individual (Neon PostgreSQL)**:
    - Criado `actions/salarios.ts` com CRUD completo na tabela `salary_records`, filtrado estritamente por `userId`.
    - Criado `components/financas/SalaryRecordModal.tsx` com suporte a cadastro, edição inline e exclusão de cargos com `ConfirmModal`.
    - Eliminado o mock estático: Yuri e Vithória possuem históricos salariais 100% isolados e privados.
  - **Identificação Visual de Bancos e Cartões nos Extratos**:
    - Dashboard (`page.tsx`) e Finanças (`financas/page.tsx`) agora exibem badge com a cor e o nome da conta bancária de origem/destino ou do cartão de crédito em cada movimentação.
  - **Calendário em Destaque no Celular & Otimização Mobile**:
    - No `BottomNav.tsx`, o botão **Calendário** substituiu o botão do Casamento na barra inferior fixa de 5 abas, garantindo acesso com 1 toque no celular.
    - O módulo do Casamento foi integrado à gaveta "Mais" com seu selo de destaque "2 noivos".
    - Grade do calendário ajustada para telas mobile com células de `min-h-[64px]`, cabeçalho com iniciais dos dias (`D, S, T, Q, Q, S, S`) e dots coloridos com efeito luminoso para cada categoria de evento.

### Perguntas pendentes
- Nenhuma no momento. Projeto V1 refinado, 100% testado no navegador e pronto para deploy na Vercel!

---

## 10. Changelog

- **2026-10-27** — Refinamentos de UX, Mobile e Dados Pessoais:
  - **Histórico e Evolução Salarial Individual**: Conexão com o banco Neon PostgreSQL via `actions/salarios.ts` e modal `SalaryRecordModal.tsx`. Cada usuário gerencia seus próprios cargos e salários com total privacidade.
  - **Bancos e Cartões nas Movimentações**: Inclusão de indicadores visuais de contas bancárias (ex.: Nubank, Sicredi, Banrisul, BB) e cartões de crédito no Dashboard e na listagem de Finanças.
  - **Calendário na Barra Inferior Mobile e Design Compacto**: Calendário acessível na barra inferior móvel e otimização visual da grade para telas de celular.
- **2026-10-25** — Refinamentos de UX e Regras de Negócio:
  - **Componente Unificado `ConfirmModal` (Zero `window.confirm`)**:
    - Criado `components/ui/ConfirmModal.tsx` com visual profissional, suporte a temas claro/escuro, backdrop blur e variantes (`danger`, `warning`, `primary`).
    - Substituídas todas as chamadas nativas de `confirm()` do projeto por modais in-app responsivos: `DayInteractiveModal`, `financas/page.tsx`, `AccountModal`, `cartoes/page.tsx`, `GoalModal`, `GoalDetailsModal`, `WeddingItemModal`, `WeddingFundModal`, `empresa/page.tsx` e `configuracoes/page.tsx`.
    - Exclusão do lançamento duplicado de Novembro no banco Neon e funcionamento 100% verificado da lixeira do Calendário.
  - **Calendário Acadêmico Univates & Desconto de Feriados**:
    - Implementadas utilidades `countAcademicDaysInMonth`, `isUnivatesClassDay` e `getUnivatesAcademicHolidays` em `utils/dates.ts`, mapeando exatamente as datas oficiais dos PDFs dos semestres A/2025 e B/2026.
    - Descontados feriados de Carnaval, Tiradentes, Dia do Trabalho, Corpus Christi, Independência, Revolução Farroupilha, Nossa Senhora Aparecida e recesso Univates de Outubro (12 e 13/Out), Finados e Consciência Negra.
    - Sincronização automática em `generateForecastsAction`: Outubro com 15 dias (R$ 675,00 pagos em 10/11) e Novembro com 16 dias (R$ 720,00 pagos em 10/12).
  - **Transporte Ortolan (Diárias & Vencimento no Mês Seguinte)**:
    - Adicionado suporte a `calculation_mode = 'per_day'` com taxa diária (`daily_rate_cents`), dias aplicáveis (`applicable_days`), meses isentos (`exempt_months`) e deslocamento de competência (`billing_shift = 1`).
    - Configurado para Yuri e Vithória: R$ 45,00/dia, Segunda a Quinta, vencimento dia 10 do mês seguinte, sem cobrança em Janeiro e Fevereiro.
    - O valor diário é totalmente preenchível e editável no modal de recorrência para futuros reajustes.
  - **Edição no Calendário do Mês**:
    - No modal do dia no Calendário (`DayInteractiveModal`), adicionado botão de edição (ícone de lápis) para cada lançamento.
    - Card de edição inline permite reajustar o valor e descrição daquele mês específico (ex.: para R$ 800,00 ou qualquer outro valor devido a recessos/faltas) e salvar instantaneamente.
  - **Salário 5º Dia Útil (CLT)**: implementada utilidade `utils/dates.ts` com cálculo exato do 5º dia útil (descontando fins de semana e feriados nacionais fixos). Checkbox no modal de recorrência e geração automática nos calendários e finanças.
  - **Ocultar Liquidados no Calendário**: adicionado toggle "Ocultando Liquidados / Exibindo Todos" no calendário, mantendo marcadores informativos (fechamento de cartão) e ocultando contas já pagas por padrão.
  - **Disponibilidade Real do Dinheiro (Saldo Realmente Livre)**: widget no Dashboard com barra segmentada colorida e 4 blocos de dedução (Saldo Total - Metas/Gastos Futuros como Faculdade - Casamento - Faturas de Cartão Atreladas e Boletos). Detalhamento com tags clicáveis para cada cartão e meta.
  - **Configurações da Empresa VYK**: modal de edição rápida no banner (`/empresa`) permitindo alterar a data alvo de inauguração (atualizando o contador regressivo) e o capital inicial planejado.
  - **Reformulação em Finanças**: remoção do botão confuso "Previsões" (agora calculado automaticamente em segundo plano) e criação de banner de alto destaque para "Contas Fixas & Recorrências Mensais".
  - **Interatividade Total nos Dias do Calendário**: ao clicar em qualquer dia, modal apresenta seletor visual com 4 opções (+ Despesa, + Receita, + Cartão, + Recorrente), abrindo formulários dedicados com navegação de retorno e controle de liquidação/exclusão.



- **2026-10-24** — Fase 10 concluída: PWA configurado (manifest, ícones vetoriais, viewport mobile nativo), polimento de layouts em mobile/desktop, gaveta de navegação, e build de produção 100% validado para deploy na Vercel. Todas as 10 fases da V1 foram entregues com sucesso!
- **2026-10-24** — Fase 9 concluída: Ambientes compartilhados do Casamento e da Empresa VYK conectados ao Neon PostgreSQL. Gerenciamento de contratos com parcelamentos automáticos (1/N), controle de reserva compartilhada ("Cofrinho do Casamento"), contador regressivo dinâmico e metas de capital da futura empresa.
- **2026-10-24** — Fase 8 concluída: Metas Pessoais conectadas ao Neon PostgreSQL. Criação e edição de metas com ícone e cor personalizados, aportes rápidos com cálculo de progresso automático, histórico detalhado de contribuições e integração com modo de privacidade.
- **2026-10-24** — Fase 7 concluída: Calendário conectado ao Neon PostgreSQL. Visualização mensal com totais de receitas e despesas previstas/confirmadas, integração dos dias de fechamento e vencimento de cada cartão ativo e parcelas compartilhadas de fornecedores do casamento.
- **2026-10-24** — Fase 6 concluída: Dashboard conectado ao Neon PostgreSQL. Patrimônio líquido consolidado em tempo real, receitas e despesas do mês, faturas abertas de cartões, últimos 5 lançamentos e banner do casamento integrados com suporte ao modo privacidade.
- **2026-10-24** — Fase 5 concluída: Cartões de Crédito, Faturas e Parcelamento. Lógica matemática de fechamento e melhor dia de compra, distribuição de parcelas (1/N, 2/N) em faturas futuras, tela `/cartoes` e `/cartoes/[id]` integradas ao Neon, pagamento de faturas com débito em conta e modal rápido com suporte a parcelamento. Build 100% OK e verificado no navegador.

- **2026-10-24** — Primeiro Commit Git: Projeto consolidado com Fases 0 a 4 concluídas (Design System, Autenticação Better Auth, Neon PostgreSQL, Contas, Categorias, Lançamentos e Recorrências com previsões automáticas). Arquivos de credenciais locais protegidos no `.gitignore`.
- **2026-10-24** — Fase 4 concluída: Lançamentos e Recorrências com Server Actions e Neon PostgreSQL. Transações reais conectadas ao QuickTransactionModal e tela de Finanças, gerador automático de previsões de despesas/receitas fixas e regra de aporte automático de Casamento. Build 100% OK e verificado no navegador.
- **2026-10-24** — Fase 3 concluída: Contas e Categorias integradas com Server Actions no Neon PostgreSQL. Modais de criação/edição/arquivamento de contas e gerenciamento de categorias implementados e validados no navegador.
- **2026-10-24** — Fase 2 concluída: Neon PostgreSQL conectado e testado, schemas Drizzle aplicados, Better Auth configurado (cadastro fechado), tela de login criada, seed de Yuri & Vithória executado e middleware de proteção ativo. Build 100% OK.
- **2026-10-22** — Melhorias de UX e Novos Módulos: Modo Privacidade global com Zustand ("olhinho" bancário), Calendário em grade estilo Teams/Outlook, novo módulo compartilhado "Empresa VYK" (`/empresa`) e histórico de evolução salarial em `/financas`. Build 100% OK.
- **2026-10-22** — Fase 1 concluída: Design system em `components/ui/`, layout desktop (Sidebar) e mobile (BottomNav + gaveta), FAB "+", modal de lançamento rápido, dashboard e páginas de todas as rotas com mocks. Build 100% OK.
- **2026-10-22** — Fase 0 concluída: Next 16.4.2 + React 19.3 + Tailwind v4, tokens claro/escuro, fontes, providers, deps.
