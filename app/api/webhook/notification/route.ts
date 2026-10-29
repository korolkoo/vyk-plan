import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  bankAccounts,
  cardInvoices,
  categories,
  creditCards,
  transactions,
  user,
} from "@/lib/db/schema";
import { parseBanrisulNotification } from "@/utils/parsers/banrisul";
import { calculateInvoiceDates } from "@/utils/invoices";
import { and, desc, eq, isNotNull, like, or } from "drizzle-orm";

const DEFAULT_SECRET = process.env.NOTIFICATION_WEBHOOK_SECRET || "vyk_secret_notification";

export async function POST(request: NextRequest) {
  try {
    // 1. Validação de Autenticação / Segredo do Webhook
    const authHeader = request.headers.get("authorization");
    const customHeader = request.headers.get("x-webhook-secret");
    const querySecret = request.nextUrl.searchParams.get("secret");

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição deve ser um JSON válido." },
        { status: 400 }
      );
    }

    const providedSecret =
      (authHeader && authHeader.replace(/^Bearer\s+/i, "")) ||
      customHeader ||
      querySecret ||
      (typeof body.secret === "string" ? body.secret : null);

    if (providedSecret !== DEFAULT_SECRET) {
      return NextResponse.json(
        { error: "Acesso negado: chave secreta do webhook inválida ou ausente." },
        { status: 401 }
      );
    }

    // 2. Extrai o texto da notificação ou SMS
    const rawText =
      typeof body.text === "string"
        ? body.text
        : typeof body.message === "string"
        ? body.message
        : typeof body.body === "string"
        ? body.body
        : "";

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "O campo 'text' com a mensagem da notificação é obrigatório." },
        { status: 400 }
      );
    }

    // 3. Determina o usuário destinatário (Yuri ou Vithória)
    const targetUserParam =
      typeof body.user === "string"
        ? body.user.toLowerCase().trim()
        : typeof body.userEmail === "string"
        ? body.userEmail.toLowerCase().trim()
        : request.nextUrl.searchParams.get("user") || "yuri";

    const allUsers = await db.select().from(user);
    const targetUser =
      allUsers.find(
        (u) =>
          u.name.toLowerCase().includes(targetUserParam) ||
          u.email.toLowerCase().includes(targetUserParam)
      ) || allUsers[0];

    if (!targetUser) {
      return NextResponse.json(
        { error: "Nenhum usuário correspondente encontrado no sistema." },
        { status: 404 }
      );
    }

    // 4. Interpreta o texto da notificação via Parser inteligente
    const parsed = parseBanrisulNotification(rawText);

    if (!parsed) {
      return NextResponse.json({
        success: false,
        status: "ignored",
        message: "Notificação recebida, mas não corresponde a uma transação financeira conhecida do Banrisul.",
        rawText,
      });
    }

    // 5. Vincula a Conta Bancária ou Cartão de Crédito correspondente
    let bankAccountId: string | null = null;
    let creditCardId: string | null = null;
    let invoiceId: string | null = null;

    if (parsed.channel === "credit_card") {
      const userCards = await db
        .select()
        .from(creditCards)
        .where(eq(creditCards.userId, targetUser.id));

      const matchedCard =
        userCards.find(
          (c) =>
            c.name.toLowerCase().includes("banrisul") ||
            (parsed.cardLastDigits && c.name.includes(parsed.cardLastDigits))
        ) || userCards[0];

      if (matchedCard) {
        creditCardId = matchedCard.id;

        // Calcula a fatura correspondente da compra no cartão
        const invDates = calculateInvoiceDates(
          parsed.date,
          matchedCard.closingDay,
          matchedCard.dueDay,
          0
        );

        const [existingInvoice] = await db
          .select()
          .from(cardInvoices)
          .where(
            and(
              eq(cardInvoices.creditCardId, matchedCard.id),
              eq(cardInvoices.referenceMonth, invDates.referenceMonth)
            )
          )
          .limit(1);

        if (existingInvoice) {
          invoiceId = existingInvoice.id;
        } else {
          invoiceId = "inv_" + Math.random().toString(36).substring(2, 10);
          await db.insert(cardInvoices).values({
            id: invoiceId,
            creditCardId: matchedCard.id,
            referenceMonth: invDates.referenceMonth,
            closingDate: invDates.closingDate,
            dueDate: invDates.dueDate,
            status: "open",
          });
        }
      }
    } else {
      // Pix ou débito em conta
      const userAccounts = await db
        .select()
        .from(bankAccounts)
        .where(and(eq(bankAccounts.userId, targetUser.id), eq(bankAccounts.archived, false)));

      const matchedAccount =
        userAccounts.find((a) => a.name.toLowerCase().includes("banrisul")) ||
        userAccounts[0];

      if (matchedAccount) {
        bankAccountId = matchedAccount.id;
      }
    }

    // 6. Inteligência de Memória: Busca se o usuário já classificou esse mesmo estabelecimento antes
    let suggestedCategory: { id: string; name: string; icon: string; color: string } | null = null;

    if (parsed.establishment) {
      const previousTx = await db
        .select({
          categoryId: transactions.categoryId,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, targetUser.id),
            isNotNull(transactions.categoryId),
            or(
              like(transactions.description, `%${parsed.establishment}%`),
              like(transactions.notes, `%${parsed.establishment}%`)
            )
          )
        )
        .orderBy(desc(transactions.createdAt))
        .limit(1);

      if (previousTx.length > 0 && previousTx[0].categoryId) {
        const [foundCat] = await db
          .select({
            id: categories.id,
            name: categories.name,
            icon: categories.icon,
            color: categories.color,
          })
          .from(categories)
          .where(eq(categories.id, previousTx[0].categoryId))
          .limit(1);

        if (foundCat) {
          suggestedCategory = foundCat;
        }
      }
    }

    // 7. Cadastra o lançamento no Neon como pendente de revisão (source: "auto")
    const txId = "tx_auto_" + Math.random().toString(36).substring(2, 10);

    const notesPayload = JSON.stringify({
      autoCapture: true,
      establishment: parsed.establishment,
      channel: parsed.channel,
      bank: parsed.bank,
      suggestedCategoryId: suggestedCategory?.id || null,
      suggestedCategoryName: suggestedCategory?.name || null,
      cardLastDigits: parsed.cardLastDigits || null,
      rawText: parsed.rawText,
    });

    await db.insert(transactions).values({
      id: txId,
      userId: targetUser.id,
      type: parsed.type,
      amountCents: parsed.amountCents,
      description: parsed.description,
      date: parsed.date,
      status: "pending", // Aguardando confirmação / categorização
      isForecast: false,
      categoryId: null, // Permanece null até a aprovação de 1 toque no app
      bankAccountId,
      creditCardId,
      invoiceId,
      source: "auto",
      notes: notesPayload,
    });

    // 8. Revalida as rotas do app para atualizar a UI em tempo real
    revalidatePath("/");
    revalidatePath("/financas");
    revalidatePath("/calendario");

    return NextResponse.json({
      success: true,
      message: "Lançamento capturado automaticamente e aguardando confirmação de categoria.",
      transaction: {
        id: txId,
        user: targetUser.name,
        type: parsed.type,
        channel: parsed.channel,
        amountCents: parsed.amountCents,
        description: parsed.description,
        establishment: parsed.establishment,
        date: parsed.date,
        suggestedCategory,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido ao processar notificação";
    console.error("Erro no webhook de notificação:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

