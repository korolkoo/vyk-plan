import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  transactions,
  user,
  weddingInstallments,
  weddingItems,
} from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { formatCurrency } from "@/utils/format";

const DEFAULT_SECRET = process.env.NOTIFICATION_WEBHOOK_SECRET || "vyk_secret_notification";

export async function GET(request: NextRequest) {
  try {
    const querySecret = request.nextUrl.searchParams.get("secret");
    const authHeader = request.headers.get("authorization");

    const providedSecret =
      (authHeader && authHeader.replace(/^Bearer\s+/i, "")) || querySecret;

    if (providedSecret !== DEFAULT_SECRET) {
      return NextResponse.json(
        { error: "Acesso negado: chave secreta inválida." },
        { status: 401 }
      );
    }

    const userParam = (request.nextUrl.searchParams.get("user") || "yuri").toLowerCase().trim();

    const allUsers = await db.select().from(user);
    const targetUser =
      allUsers.find(
        (u) =>
          u.name.toLowerCase().includes(userParam) ||
          u.email.toLowerCase().includes(userParam)
      ) || allUsers[0];

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const now = new Date();
    const todayIso = now.toISOString().split("T")[0];

    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowIso = tomorrowDate.toISOString().split("T")[0];

    // 1. Contas pendentes do usuário
    const pendingTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, targetUser.id),
          eq(transactions.status, "pending"),
          inArray(transactions.date, [todayIso, tomorrowIso])
        )
      );

    const todayBills = pendingTxs.filter((t) => t.date === todayIso && t.type === "expense");
    const tomorrowBills = pendingTxs.filter((t) => t.date === tomorrowIso && t.type === "expense");

    // 2. Parcelas do Casamento (ambos os noivos!)
    const weddingInsts = await db
      .select({
        id: weddingInstallments.id,
        amountCents: weddingInstallments.amountCents,
        dueDate: weddingInstallments.dueDate,
        itemName: weddingItems.name,
      })
      .from(weddingInstallments)
      .innerJoin(weddingItems, eq(weddingInstallments.itemId, weddingItems.id))
      .where(
        and(
          isNull(weddingInstallments.paidAt),
          inArray(weddingInstallments.dueDate, [todayIso, tomorrowIso])
        )
      );

    const todayWedding = weddingInsts.filter((w) => w.dueDate === todayIso);
    const tomorrowWedding = weddingInsts.filter((w) => w.dueDate === tomorrowIso);

    const totalTodayCount = todayBills.length + todayWedding.length;
    const totalTomorrowCount = tomorrowBills.length + tomorrowWedding.length;

    let notificationTitle = "VYK Plan · Lembretes";
    let notificationText = "";

    if (totalTodayCount > 0 && totalTomorrowCount > 0) {
      notificationTitle = "⚠️ Contas Vencendo Hoje e Amanhã!";
      notificationText = `${totalTodayCount} conta(s) vencem hoje e ${totalTomorrowCount} amanhã. Toque para conferir.`;
    } else if (totalTodayCount > 0) {
      notificationTitle = "⚠️ Contas Vencendo Hoje!";
      const itemsList = [...todayBills.map((b) => b.description), ...todayWedding.map((w) => `Casamento: ${w.itemName}`)].slice(0, 2).join(", ");
      notificationText = `Você tem ${totalTodayCount} conta(s) hoje: ${itemsList}.`;
    } else if (totalTomorrowCount > 0) {
      notificationTitle = "🔔 Contas Vencendo Amanhã";
      notificationText = `Lembrete: ${totalTomorrowCount} conta(s) vencem amanhã.`;
    } else {
      notificationText = "Tudo em dia! Nenhuma conta a vencer hoje ou amanhã.";
    }

    return NextResponse.json({
      success: true,
      hasReminders: totalTodayCount > 0 || totalTomorrowCount > 0,
      notificationTitle,
      notificationText,
      today: {
        count: totalTodayCount,
        bills: todayBills.map((b) => ({ description: b.description, amountCents: b.amountCents })),
        wedding: todayWedding.map((w) => ({ item: w.itemName, amountCents: w.amountCents })),
      },
      tomorrow: {
        count: totalTomorrowCount,
        bills: tomorrowBills.map((b) => ({ description: b.description, amountCents: b.amountCents })),
        wedding: tomorrowWedding.map((w) => ({ item: w.itemName, amountCents: w.amountCents })),
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

