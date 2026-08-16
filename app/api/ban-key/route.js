import { NextResponse } from "next/server";
import { redis, KEY_PREFIX } from "@/lib/redis";
import { checkAdminSecret } from "@/lib/utils";
import { logHistory } from "@/lib/history";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!checkAdminSecret(request, body.adminSecret)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const { key, banned = true, reason = "" } = body;
  if (!key) {
    return NextResponse.json({ error: "chave não informada" }, { status: 400 });
  }

  const record = (await redis.get(KEY_PREFIX + key)) || { key };
  record.banned = !!banned;
  record.banReason = banned ? reason || "Banido pelo Administrador" : null;

  try {
    await redis.set(KEY_PREFIX + key, record);
  } catch (e) {}

  try {
    await logHistory({
      type: banned ? "banned" : "unbanned",
      key: record.key,
      detail: banned ? reason || "Banido pelo Admin" : "Desbanido",
    });
  } catch (e) {}

  sendDiscordWebhook(
    banned ? "⛔ CHAVE BANIDA PELO ADMIN" : "✅ CHAVE DESBANIDA PELO ADMIN",
    banned ? `A chave **${key}** foi banida pelo Administrador!` : `A chave **${key}** foi desbanida pelo Administrador!`,
    banned ? 0xef4444 : 0x10b981,
    [
      { name: "Chave", value: `\`${key}\``, inline: true },
      { name: "Motivo", value: reason || "Administrativo", inline: true },
    ]
  );

  return NextResponse.json({ ok: true, key: record });
}
