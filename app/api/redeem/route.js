import { NextResponse } from "next/server";
import { redis, KEY_PREFIX, USER_PREFIX } from "@/lib/redis";
import { logHistory } from "@/lib/history";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, keyCode } = body;

    if (!username || !keyCode) {
      return NextResponse.json(
        { error: "Usuário e código da key são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanKey = keyCode.trim().toUpperCase();

    // Fetch key from redis / memory
    const keyObj = await redis.get(KEY_PREFIX + cleanKey);

    if (!keyObj) {
      return NextResponse.json(
        { error: "Chave (Key) inválida ou não encontrada." },
        { status: 404 }
      );
    }

    if (keyObj.status === "USED" || keyObj.assignedUser) {
      return NextResponse.json(
        { error: "Esta chave já foi resgatada por outro usuário." },
        { status: 400 }
      );
    }

    if (keyObj.banned) {
      return NextResponse.json(
        { error: "Esta chave está banida." },
        { status: 400 }
      );
    }

    // Mark key as used
    keyObj.status = "USED";
    keyObj.assignedUser = cleanUser;
    keyObj.redeemedAt = new Date().toLocaleString("pt-BR");
    await redis.set(KEY_PREFIX + cleanKey, keyObj);

    // Fetch user and add product + invoice
    const userObj = (await redis.get(USER_PREFIX + cleanUser)) || {
      username: cleanUser,
      displayName: username,
      products: [],
      invoices: [],
    };

    if (!userObj.products) userObj.products = [];
    if (!userObj.invoices) userObj.invoices = [];

    const newProd = {
      productName: keyObj.productName || "PRIME FREE FIRE VIP",
      keyCode: cleanKey,
      downloadUrl: keyObj.downloadUrl || "https://prime-downloads.dev/files/Prime_FF_VIP.exe",
      redeemedAt: new Date().toLocaleDateString("pt-BR"),
    };

    const newInv = {
      id: "INV-" + Math.floor(100000 + Math.random() * 900000),
      productName: keyObj.productName || "PRIME FREE FIRE VIP",
      keyCode: cleanKey,
      date: new Date().toLocaleDateString("pt-BR"),
    };

    userObj.products.push(newProd);
    userObj.invoices.push(newInv);

    await redis.set(USER_PREFIX + cleanUser, userObj);

    await logHistory({
      type: "activated",
      key: cleanKey,
      detail: `Key ${cleanKey} resgatada por ${cleanUser}`,
    });

    sendDiscordWebhook(
      "🔑 CHAVE RESGATADA NO PAINEL",
      `A chave **${cleanKey}** foi ativada com sucesso!`,
      0x10b981,
      [
        { name: "Usuário", value: userObj.displayName || cleanUser, inline: true },
        { name: "Produto", value: newProd.productName, inline: true },
        { name: "Chave", value: `\`${cleanKey}\``, inline: false },
      ]
    );

    return NextResponse.json({
      ok: true,
      productName: newProd.productName,
      user: {
        products: userObj.products,
        invoices: userObj.invoices,
      },
    });
  } catch (err) {
    console.error("Redeem Error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor ao resgatar chave." },
      { status: 500 }
    );
  }
}
