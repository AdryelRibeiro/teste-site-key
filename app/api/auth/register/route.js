import { NextResponse } from "next/server";
import { redis, USER_PREFIX, USER_INDEX, KEY_PREFIX } from "@/lib/redis";
import { hashPassword } from "@/lib/utils";
import { logHistory } from "@/lib/history";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { username, email, password, key, discordId, hwid } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanKey = (key || "").trim().toUpperCase();
    const cleanDiscordId = (discordId || "").trim();
    const cleanEmail = (email || `${cleanUser}@prime.com`).trim().toLowerCase();

    if (cleanUser.length < 3) {
      return NextResponse.json(
        { error: "O nome de usuário deve ter no mínimo 3 caracteres." },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 4 caracteres." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await redis.get(USER_PREFIX + cleanUser);
    if (existingUser) {
      return NextResponse.json(
        { error: "Este nome de usuário já está cadastrado." },
        { status: 400 }
      );
    }

    let keyRecord = null;
    let expiresAt = null;

    // Validate Key if provided (or required)
    if (cleanKey) {
      keyRecord = await redis.get(KEY_PREFIX + cleanKey);
      if (!keyRecord) {
        return NextResponse.json(
          { error: "Chave (Key) de licença inválida ou inexistente." },
          { status: 404 }
        );
      }

      if (keyRecord.banned) {
        return NextResponse.json(
          { error: `Chave banida. Motivo: ${keyRecord.banReason || "Bloqueada pelo administrador"}` },
          { status: 403 }
        );
      }

      if (keyRecord.assignedUser && keyRecord.assignedUser.toLowerCase() !== cleanUser) {
        return NextResponse.json(
          { error: `Esta chave já foi utilizada pelo usuário: ${keyRecord.assignedUser}` },
          { status: 409 }
        );
      }

      // Calculate expiration
      const now = Date.now();
      if (!keyRecord.firstUsedAt) {
        keyRecord.firstUsedAt = new Date(now).toISOString();
        if (keyRecord.durationHours) {
          expiresAt = new Date(now + keyRecord.durationHours * 3600000).toISOString();
        } else if (keyRecord.durationDays) {
          expiresAt = new Date(now + keyRecord.durationDays * 86400000).toISOString();
        }
        keyRecord.expiresAt = expiresAt;
      } else {
        expiresAt = keyRecord.expiresAt || null;
      }

      keyRecord.assignedUser = cleanUser;
      keyRecord.discordId = cleanDiscordId;
      if (hwid) {
        if (!keyRecord.activations) keyRecord.activations = [];
        if (!keyRecord.activations.includes(hwid)) keyRecord.activations.push(hwid);
      }

      await redis.set(KEY_PREFIX + cleanKey, keyRecord);
    }

    // Discord avatar & username resolution
    let discordAvatarUrl = "";
    let discordName = "";
    if (cleanDiscordId) {
      try {
        const discNum = BigInt(cleanDiscordId);
        const defaultAvatarIndex = Number(discNum % 5n);
        discordAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        discordName = cleanUser;
      } catch (e) {
        discordAvatarUrl = "https://cdn-icons-png.flaticon.com/512/2092/2092663.png";
      }
    }

    const passwordHash = hashPassword(password);
    const nowStr = new Date().toLocaleDateString("pt-BR");

    const userObj = {
      username: cleanUser,
      displayName: username.trim(),
      email: cleanEmail,
      passwordHash,
      key: cleanKey || null,
      discordId: cleanDiscordId || null,
      discordName: discordName || username.trim(),
      discordAvatarUrl: discordAvatarUrl || null,
      expiresAt: expiresAt || null,
      role: "CLIENTE_PRIME",
      createdAt: nowStr,
      emailVerified: true,
      hwidResetsMax: 2,
      hwidResetsUsed: 0,
      hwid: hwid || ("HWID-PRIME-" + Math.random().toString(36).substring(2, 8).toUpperCase()),
      products: cleanKey ? ["PRIME EXTREMER"] : [],
      invoices: [],
    };

    // Save user in Redis
    await redis.set(USER_PREFIX + cleanUser, userObj);
    await redis.sadd(USER_INDEX, cleanUser);

    await logHistory({
      type: "activated",
      key: cleanKey || "REGISTRO",
      detail: `Novo registro de usuário: ${cleanUser} (Discord: ${cleanDiscordId || "N/A"})`,
      hwid: userObj.hwid,
    });

    sendDiscordWebhook(
      "⭐ NOVO CADASTRO PRIME EXTREMER",
      `Novo usuário registrado com sucesso no sistema!`,
      0x00d2ff,
      [
        { name: "Usuário", value: userObj.displayName, inline: true },
        { name: "Key", value: cleanKey ? `\`${cleanKey}\`` : "Sem Key", inline: true },
        { name: "Discord ID", value: cleanDiscordId ? `\`${cleanDiscordId}\`` : "Nenhum", inline: true },
        { name: "Validade", value: expiresAt ? new Date(expiresAt).toLocaleString("pt-BR") : "Vitalícia / Permanente", inline: true },
        { name: "HWID", value: userObj.hwid, inline: false },
      ]
    );

    return NextResponse.json({
      ok: true,
      user: {
        username: userObj.displayName,
        email: userObj.email,
        key: userObj.key,
        discordId: userObj.discordId,
        discordName: userObj.discordName,
        discordAvatarUrl: userObj.discordAvatarUrl,
        expiresAt: userObj.expiresAt,
        role: userObj.role,
        createdAt: userObj.createdAt,
        hwid: userObj.hwid,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    return NextResponse.json(
      { error: `Erro interno no servidor: ${err?.message || "Desconhecido"}` },
      { status: 500 }
    );
  }
}
