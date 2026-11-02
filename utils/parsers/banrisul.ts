import { getLocalTodayDateString } from "@/utils/dates";

/**
 * Parser inteligente e flexível de notificações e SMS do Banco Banrisul.
 * Extrai valor, tipo (receita/despesa), canal (Pix/Cartão), estabelecimento e data.
 */

export interface ParsedBankNotification {
  bank: "banrisul";
  type: "income" | "expense";
  channel: "pix" | "credit_card" | "debit" | "invoice";
  amountCents: number;
  description: string;
  establishment: string;
  cardLastDigits?: string;
  date: string;
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

function parseAmountToCents(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr
    .replace(/[R$BRL\s]/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const floatVal = parseFloat(cleaned);
  return isNaN(floatVal) ? 0 : Math.round(floatVal * 100);
}

function normalizeDate(rawDateStr: string): string {
  const today = getLocalTodayDateString();
  if (!rawDateStr) return today;

  const slashMatch = rawDateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

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

function cleanEstablishment(name: string): string {
  return name
    .trim()
    .replace(/[.,;:]+$/, "")
    .replace(/^(para|de|em)\s+/i, "")
    .replace(/\s+/g, " ");
}

export function parseBanrisulNotification(
  rawText: string
): ParsedBankNotification | null {
  if (!rawText || typeof rawText !== "string") return null;

  const text = rawText.trim();

  // 1. COMPRA NO CARTÃO DE CRÉDITO
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

  const altCardMatch = text.match(
    /(?:Compra|Transa[cç][aã]o)\s+aprovada.*?(?:final\s+(\d{4}))?.*?(?:BRL|R\$)\s*([\d.,]+)\s+em\s+(.+?)(?:\s+em\s+(\d{1,2}\/\d{1,2}\/\d{4})|\.|\n|$)/i
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

  // 2. PIX ENVIADO (Múltiplas variações suportadas)
  const isPixSent =
    /(?:seu\s+Pix|Pix\s+enviado|Pix\s+de|Envio\s+de\s+Pix|Transfer[eê]ncia\s+Pix)/i.test(text) &&
    /para\s+/i.test(text);

  if (isPixSent) {
    const amountMatch = text.match(/(?:R\$|BRL)\s*([\d.,]+)/i);
    const amountCents = amountMatch ? parseAmountToCents(amountMatch[1]) : 0;

    const recipientMatch = text.match(
      /para\s+([A-Za-z0-9À-ÿ\s.-]+?)(?:\s+realizado|\s+do\s+banco|\s+no\s+valor|\s+foi\s+|\s+em\s+\d|\s+com\s+sucesso|\.|\n|Descri[cç][aã]o:|$)/i
    );
    const recipient = recipientMatch ? cleanEstablishment(recipientMatch[1]) : "Pix Enviado";

    // Extrai data
    const dateMatch =
      text.match(/(\d{1,2}\s+de\s+[a-z]{3}\.?\s+de\s+\d{4})/i) ||
      text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    const date = normalizeDate(dateMatch ? dateMatch[1] : "");

    // Extrai descrição opcional
    const descMatch = text.match(/Descri[cç][aã]o:\s*(.+)$/i);
    const customDesc = descMatch ? descMatch[1].trim() : null;
    const description = customDesc ? `Pix: ${recipient} (${customDesc})` : `Pix: ${recipient}`;

    if (amountCents > 0) {
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
  }

  // 3. PIX RECEBIDO (Múltiplas variações suportadas)
  const isPixReceived =
    /(?:recebeu\s+um\s+Pix|Pix\s+recebido|Recebimento\s+Pix)/i.test(text);

  if (isPixReceived) {
    const amountMatch = text.match(/(?:R\$|BRL)\s*([\d.,]+)/i);
    const amountCents = amountMatch ? parseAmountToCents(amountMatch[1]) : 0;

    const senderMatch = text.match(
      /de\s+([A-Za-z0-9À-ÿ\s.-]+?)(?:\s+do\s+banco|\s+em\s+\d|\.|\n|$)/i
    );
    const sender = senderMatch ? cleanEstablishment(senderMatch[1]) : "Pix Recebido";

    const dateMatch =
      text.match(/(\d{1,2}\s+de\s+[a-z]{3}\.?\s+de\s+\d{4})/i) ||
      text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    const date = normalizeDate(dateMatch ? dateMatch[1] : "");

    if (amountCents > 0) {
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
  }

  return null;
}
