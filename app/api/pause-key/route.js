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

  const { key, paused = true } = body;
  if (!key) {
    return NextResponse.json({ error: "chave não informada" }, { status: 400 });
  }

  const record = (await redis.get(KEY_PREFIX + key)) || { key };
  record.paused = !!paused;
  record.status = paused ? "PAUSED" : (record.assignedUser ? "USED" : "UNUSED");

  try {
    await redis.set(KEY_PREFIX + key, record);
  } catch (e) {}

  try {
    await logHistory({
      type: paused ? "paused" : "unpaused",
      key: record.key,
      detail: paused ? "Chave pausada pelo Admin" : "Chave despausada",
    });
  } catch (e) {}

  sendDiscordWebhook(
    paused ? "⏸️ CHAVE PAUSADA PELO ADMIN" : "▶️ CHAVE DESPAUSADA PELO ADMIN",
    paused ? `A contagem/uso da chave **${key}** foi pausada!` : `A chave **${key}** voltou ao estado ativo!`,
    paused ? 0xf59e0b : 0x10b981,
    [{ name: "Chave", value: `\`${key}\``, inline: true }]
  );

  return NextResponse.json({ ok: true, key: record });
}
