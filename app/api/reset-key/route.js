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

  const { key } = body;
  if (!key) {
    return NextResponse.json({ error: "chave não informada" }, { status: 400 });
  }

  const record = (await redis.get(KEY_PREFIX + key)) || { key, activations: [] };

  const activationsRemovidas = record.activations?.length || 0;
  record.activations = [];

  try {
    await redis.set(KEY_PREFIX + key, record);
  } catch (e) {}

  try {
    await logHistory({
      type: "reset",
      key: record.key,
      detail: `${activationsRemovidas} ativacao(oes) removida(s)`,
    });
  } catch (e) {}

  sendDiscordWebhook(
    "🔄 RESET DE HWID DA KEY",
    `Os dispositivos/HWID da chave **${key}** foram liberados pelo Administrador!`,
    0x00f0ff,
    [
      { name: "Chave", value: `\`${key}\``, inline: true },
      { name: "HWID Removidos", value: `${activationsRemovidas}`, inline: true },
    ]
  );

  return NextResponse.json({ ok: true, key: record });
}
