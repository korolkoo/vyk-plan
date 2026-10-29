/**
 * Parser inteligente de notificações e SMS do Banco Banrisul.
 * Extrai valor, tipo (receita/despesa), canal (Pix/Cartão), estabelecimento e data.
 */

export interface ParsedBankNotification {
  bank: "banrisul";
  type: "income" | "expense";
  channel: "pix" | "credit_card" | "debit" | "invoice";
  amountCents: number;
  description: string;
  establishment: string; // Nome limpo do estabelecimento ou pessoa para buscar categoria anterior
  cardLastDigits?: string;
  date: string; // Formato YYYY-MM-DD
  rawText: string;
}

const MONTH_MAP: Record<string, string> = {
  jan: "01",
  fev: "02",
  mar: "03",
  abr: "04",
  mai: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  set: "09",
  out: "10",
  nov: "11",
  dez: "12",
};

/**
 * Converte strings como "R$ 1.080,00", "BRL 59,67" ou "0,01" para centavos inteiros.
 */
function parseAmountToCents(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr
    .replace(/[R$BRL\s]/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const floatVal = parseFloat(cleaned);
  return isNaN(floatVal) ? 0 : Math.round(floatVal * 100);
}

/**
 * Normaliza datas do tipo "28 de out. de 2026", "6 de out. de 2026" ou "07/10/2026" para "YYYY-MM-DD".
 */
function normalizeDate(rawDateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  if (!rawDateStr) return today;

  // Formato DD/MM/YYYY
  const slashMatch = rawDateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Formato "28 de out. de 2026" ou "6 de out de 2026"
  const textMatch = rawDateStr.match(/(\d{1,2})\s+de\s+([a-z]{3})\.?\s+de\s+(\d{4})/i);
  if (textMatch) {
    const day = textMatch[1].padStart(2, "0");
    const monthKey = textMatch[2].toLowerCase();
    const month = MONTH_MAP[monthKey] || "01";
    const year = textMatch[3];
    return `${year}-${month}-${day}`;
  }

  return today;
}

/**
 * Limpa o nome do estabelecimento removendo pontuações finais ou resquícios.
 */
function cleanEstablishment(name: string): string {
  return name
    .trim()
    .replace(/[.,;]+$/, "")
    .replace(/\s+/g, " ");
}

/**
 * Analisa o texto de uma notificação ou SMS do Banrisul e extrai as informações financeiras.
 */
export function parseBanrisulNotification(
  rawText: string
): ParsedBankNotification | null {
  if (!rawText || typeof rawText !== "string") return null;

  const text = rawText.trim();

  // 1. COMPRA NO CARTÃO DE CRÉDITO (ex.: Aprovada transacao CONTACTLESS no cartao de final 8111 de BRL 59,67 as 21:06:16 de 07/10/2026 BRASILI BURGER LAJEADO.)
  const cardMatch = text.match(
    /Aprovada\s+transacao\s+([A-Z]+)?\s*no\s+cartao\s+de\s+final\s+(\d{4})\s+de\s+(?:BRL|R\$)\s*([\d.,]+)\s+as\s+[0-9:]+\s+de\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)/i
  );

  if (cardMatch) {
    const cardLastDigits = cardMatch[2];
    const amountCents = parseAmountToCents(cardMatch[3]);
    const date = normalizeDate(cardMatch[4]);
    const establishment = cleanEstablishment(cardMatch[5]);

    return {
      bank: "banrisul",
      type: "expense",
      channel: "credit_card",
      amountCents,
      establishment,
      description: establishment,
      cardLastDigits,
      date,
      rawText,
    };
  }

  // 1.1 Outra variação comum de cartão Banrisul
  const altCardMatch = text.match(
    /Compra\s+aprovada\s+(?:no\s+cartao\s+final\s+(\d{4}))?\s*no\s+valor\s+de\s+(?:BRL|R\$)\s*([\d.,]+)\s+em\s+(.+?)(?:\s+em\s+(\d{1,2}\/\d{1,2}\/\d{4}))?\.?$/i
  );
  if (altCardMatch) {
    const cardLastDigits = altCardMatch[1] || undefined;
    const amountCents = parseAmountToCents(altCardMatch[2]);
    const establishment = cleanEstablishment(altCardMatch[3]);
    const date = normalizeDate(altCardMatch[4] || "");

    return {
      bank: "banrisul",
      type: "expense",
      channel: "credit_card",
      amountCents,
      establishment,
      description: establishment,
      cardLastDigits,
      date,
      rawText,
    };
  }

  // 2. PIX ENVIADO (Push ou SMS)
  // Ex: "YURI, seu Pix de R$ 0,01 para VITHORIA BERTONCELLI DA COSTA do banco COOP SICREDI... Descrição: Teste para vyk."
  const pixSentMatch = text.match(
    /seu\s+Pix\s+de\s+R\$\s*([\d.,]+)\s+para\s+(.+?)(?:\s+do\s+banco|\s+foi\s+enviado)/i
  );

  if (pixSentMatch) {
    const amountCents = parseAmountToCents(pixSentMatch[1]);
    const recipient = cleanEstablishment(pixSentMatch[2]);

    // Extrai data se houver (ex: em 28 de out. de 2026)
    const dateMatch = text.match(/enviado\s+em\s+(\d{1,2}\s+de\s+[a-z]{3}\.?\s+de\s+\d{4})/i);
    const date = normalizeDate(dateMatch ? dateMatch[1] : "");

    // Extrai descrição opcional do Pix (ex: "Descrição: Teste para vyk")
    const descMatch = text.match(/Descri[cç][aã]o:\s*(.+)$/i);
    const customDesc = descMatch ? descMatch[1].trim() : null;

    const description = customDesc ? `Pix: ${recipient} (${customDesc})` : `Pix: ${recipient}`;

    return {
      bank: "banrisul",
      type: "expense",
      channel: "pix",
      amountCents,
      establishment: recipient,
      description,
      date,
      rawText,
    };
  }

  // 3. PIX RECEBIDO (Push ou SMS)
  // Ex: "Banrisul: YURI, voce recebeu um Pix de R$ 1.080,00 de ROGERIO PAULO KOROLKO do banco BANRISUL... em 6 de out. de 2026"
  const pixReceivedMatch = text.match(
    /voce\s+recebeu\s+um\s+Pix\s+de\s+R\$\s*([\d.,]+)\s+de\s+(.+?)(?:\s+do\s+banco|\s+em\s+\d)/i
  );

  if (pixReceivedMatch) {
    const amountCents = parseAmountToCents(pixReceivedMatch[1]);
    const sender = cleanEstablishment(pixReceivedMatch[2]);

    const dateMatch = text.match(/em\s+(\d{1,2}\s+de\s+[a-z]{3}\.?\s+de\s+\d{4})/i);
    const date = normalizeDate(dateMatch ? dateMatch[1] : "");

    return {
      bank: "banrisul",
      type: "income",
      channel: "pix",
      amountCents,
      establishment: sender,
      description: `Pix recebido: ${sender}`,
      date,
      rawText,
    };
  }

  return null;
}

