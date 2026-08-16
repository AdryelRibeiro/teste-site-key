import { NextResponse } from "next/server";
import { redis, KEY_PREFIX, USER_PREFIX } from "@/lib/redis";
import { hashPassword } from "@/lib/utils";
import { logHistory } from "@/lib/history";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { username, password, key, hwid } = body;

    let inputKey = (key || "").trim();
    let inputUser = (username || "").trim();
    let inputPass = (password || "").trim();

    // Se o usuário digitou a Key no campo de username
    if (!inputKey && (inputUser.toUpperCase().startsWith("PRIME-") || inputUser.toUpperCase().startsWith("PHANTOM-"))) {
      inputKey = inputUser;
      inputUser = "";
    }

    if (!inputKey && !inputUser) {
      return NextResponse.json(
        { valid: false, reason: "Key de licença ou usuário não informado." },
        { status: 400 }
      );
    }

    let keyRecord = null;
    let foundUser = null;

    if (inputKey) {
      keyRecord = await redis.get(KEY_PREFIX + inputKey.toUpperCase());
    }

    if (!keyRecord && inputUser) {
      keyRecord = await redis.get(KEY_PREFIX + inputUser.toUpperCase());
    }

    if (!keyRecord && inputUser) {
      const userObj = await redis.get(USER_PREFIX + inputUser.toLowerCase());
      if (userObj) {
        if (inputPass && userObj.passwordHash && userObj.passwordHash !== hashPassword(inputPass)) {
          await logHistory({ type: "validation_failed", key: inputUser, detail: "Senha incorreta", hwid });
          return NextResponse.json(
            { valid: false, reason: "Senha incorreta para esta conta de usuário." },
            { status: 401 }
          );
        }
        foundUser = userObj.displayName || userObj.username;
        if (userObj.key) {
          keyRecord = await redis.get(KEY_PREFIX + userObj.key.toUpperCase());
        }
      }
    }

    if (!keyRecord) {
      await logHistory({ type: "validation_failed", key: inputKey || inputUser, detail: "Key/Usuário não encontrado", hwid });
      return NextResponse.json(
        { valid: false, reason: "Chave (Key) ou Usuário não encontrado no sistema." },
        { status: 404 }
      );
    }

    if (keyRecord.banned) {
      await logHistory({ type: "validation_failed", key: keyRecord.key, detail: "Key banida", hwid });
      sendDiscordWebhook(
        "⚠️ TENTATIVA DE USO DE KEY BANIDA NO LOADER",
        `Alguém tentou usar a key banida **${keyRecord.key}** no Loader!`,
        0xef4444,
        [{ name: "HWID", value: hwid || "Desconhecido", inline: true }]
      );
      return NextResponse.json(
        { valid: false, reason: `Chave banida. Motivo: ${keyRecord.banReason || "Sem motivo informado"}` },
        { status: 403 }
      );
    }

    const nowMs = Date.now();
    if (keyRecord.durationHours && !keyRecord.firstUsedAt) {
      keyRecord.firstUsedAt = new Date(nowMs).toISOString();
      keyRecord.expiresAt = new Date(nowMs + keyRecord.durationHours * 3600000).toISOString();
      await redis.set(KEY_PREFIX + keyRecord.key, keyRecord);
      await logHistory({
        type: "activated",
        key: keyRecord.key,
        detail: `Contagem iniciada no Loader: ${keyRecord.durationHours} horas`,
        hwid,
      });
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      await logHistory({ type: "validation_failed", key: keyRecord.key, detail: "Key expirada", hwid });
      return NextResponse.json(
        { valid: false, reason: "Sua licença expirou.", expired: true },
        { status: 403 }
      );
    }

    // DISCORD WEBHOOK LOG - LOADER SUCCESSFUL LOGIN
    sendDiscordWebhook(
      "🚀 KEY / USUÁRIO AUTENTICADO NO LOADER",
      `Um cliente acabou de fazer login e validar a key no **Loader C#**!`,
      0x10b981,
      [
        { name: "Usuário/Key", value: `\`${foundUser || keyRecord.assignedUser || keyRecord.key}\``, inline: true },
        { name: "Chave Utilizada", value: `\`${keyRecord.key}\``, inline: true },
        { name: "HWID", value: hwid || "Registrado", inline: false },
        { name: "Expira em", value: keyRecord.expiresAt ? new Date(keyRecord.expiresAt).toLocaleString("pt-BR") : "Vitalícia / Permanente", inline: true },
      ]
    );

    const discordAvatar = userObj?.discordAvatarUrl || (keyRecord.discordId ? `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(keyRecord.discordId || "0") % 5n)}.png` : null);
    const discordUser = userObj?.discordName || foundUser || keyRecord.assignedUser || "Prime User";

    return NextResponse.json({
      valid: true,
      username: foundUser || keyRecord.assignedUser || "Cliente PRIME",
      key: keyRecord.key,
      discordId: userObj?.discordId || keyRecord.discordId || null,
      discordName: discordUser,
      discordAvatarUrl: discordAvatar,
      firstUsedAt: keyRecord.firstUsedAt,
      expiresAt: keyRecord.expiresAt,
      maxActivations: keyRecord.maxActivations,
      activationsUsed: keyRecord.activations ? keyRecord.activations.length : 1,
      status: "ATIVO",
    });
  } catch (err) {
    console.error("Loader Validate Error:", err);
    return NextResponse.json(
      { valid: false, reason: `Erro no servidor: ${err?.message || "Desconhecido"}` },
      { status: 500 }
    );
  }
}
