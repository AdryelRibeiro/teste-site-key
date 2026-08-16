import { NextResponse } from "next/server";
import { redis, KEY_PREFIX, KEY_INDEX } from "@/lib/redis";
import { generateKeyString, checkAdminSecret } from "@/lib/utils";
import { logHistory } from "@/lib/history";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (!checkAdminSecret(request, body.adminSecret)) {
      return NextResponse.json({ error: "Não autorizado: Chave de Admin inválida" }, { status: 401 });
    }

    const {
      note = "PRIME EXTREMER",
      productName = "PRIME EXTREMER",
      prefix = "EXTREMER",
      expiresInHours = null,
      maxActivations = 1,
      amount = 1,
    } = body;

    const count = Math.min(Math.max(parseInt(amount) || 1, 1), 500);
    const createdRecords = [];
    const createdCodes = [];
    const now = new Date().toISOString();
    const durationHours = expiresInHours ? Number(expiresInHours) : null;
    const cleanPrefix = (prefix || "EXTREMER").trim().toUpperCase();

    for (let i = 0; i < count; i++) {
      let key = generateKeyString(cleanPrefix);
      let attempts = 0;

      try {
        while ((await redis.get(KEY_PREFIX + key)) && attempts < 5) {
          key = generateKeyString(cleanPrefix);
          attempts++;
        }
      } catch (e) {}

      const record = {
        key,
        note: note || productName,
        productName: productName || "PRIME EXTREMER",
        createdAt: now,
        durationHours,
        firstUsedAt: null,
        expiresAt: null,
        maxActivations: Number(maxActivations) || 1,
        activations: [],
        banned: false,
        banReason: null,
        paused: false,
        assignedUser: null,
        discordId: null,
        status: "UNUSED",
      };

      try {
        await redis.set(KEY_PREFIX + key, record);
        await redis.sadd(KEY_INDEX, key);
      } catch (e) {}

      createdRecords.push(record);
      createdCodes.push(key);
    }

    try {
      await logHistory({
        type: "generated",
        key: createdCodes.length === 1 ? createdCodes[0] : `${createdCodes.length} KEYS`,
        detail: `Geradas ${createdCodes.length} keys para ${productName} (${durationHours ? `${durationHours}h` : "Permanente"})`,
      });
    } catch (e) {}

    // Discord Webhook Log
    try {
      sendDiscordWebhook(
        createdCodes.length === 1 ? "🔑 NOVA KEY GERADA - PRIME EXTREMER" : `⚡ GERAÇÃO EM MASSA (${createdCodes.length} KEYS)`,
        createdCodes.length === 1
          ? `Uma nova licença foi gerada pelo Administrador para **${productName}**!`
          : `Foram geradas **${createdCodes.length} licenças em massa** para **${productName}**!`,
        0x00d2ff,
        [
          {
            name: "Chaves Geradas",
            value: createdCodes.length === 1
              ? `\`${createdCodes[0]}\``
              : `\`\`\`text\n${createdCodes.slice(0, 10).join("\n")}${createdCodes.length > 10 ? `\n... (+${createdCodes.length - 10} mais)` : ""}\n\`\`\``,
            inline: false,
          },
          { name: "Produto", value: productName, inline: true },
          { name: "Duração", value: durationHours ? `${durationHours} Horas` : "Vitalícia / Permanente", inline: true },
        ]
      );
    } catch (e) {}

    return NextResponse.json({
      ok: true,
      key: createdRecords[0],
      keys: createdRecords,
      codes: createdCodes,
      txtContent: createdCodes.join("\r\n"),
    });
  } catch (err) {
    console.error("Generate Key Fatal Error:", err);
    return NextResponse.json({ error: `Erro ao gerar a chave: ${err?.message || "Desconhecido"}` }, { status: 500 });
  }
}
