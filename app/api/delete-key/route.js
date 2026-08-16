import { NextResponse } from "next/server";
import { redis, KEY_PREFIX, KEY_INDEX } from "@/lib/redis";
import { checkAdminSecret } from "@/lib/utils";
import { logHistory } from "@/lib/history";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!checkAdminSecret(request, body.adminSecret)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const { key } = body;
  if (!key) {
    return NextResponse.json({ error: "chave não informada" }, { status: 400 });
  }

  try {
    await redis.del(KEY_PREFIX + key);
    await redis.srem(KEY_INDEX, key);
  } catch (e) {}

  try {
    await logHistory({ type: "deleted", key, detail: "Deletada pelo Admin" });
  } catch (e) {}

  sendDiscordWebhook(
    "🗑️ CHAVE DELETADA PELO ADMIN",
    `A chave **${key}** foi excluída permanentemente do sistema.`,
    0xef4444,
    [{ name: "Chave", value: `\`${key}\``, inline: true }]
  );

  return NextResponse.json({ ok: true });
}
