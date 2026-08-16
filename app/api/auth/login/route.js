import { NextResponse } from "next/server";
import { redis, USER_PREFIX, KEY_PREFIX } from "@/lib/redis";
import { hashPassword, checkAdminCredentials } from "@/lib/utils";
import { sendDiscordWebhook } from "@/lib/discord";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password, hwid } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanUser = username.trim();

    // Check if Admin Login (SEVEN / adryel1104)
    if (checkAdminCredentials(cleanUser, password)) {
      sendDiscordWebhook(
        "ADMIN LOGIN",
        `O administrador **${cleanUser}** realizou login no painel PRIME.`,
        0x7000ff
      );

      return NextResponse.json({
        ok: true,
        isAdmin: true,
        user: {
          username: "SEVEN (ADMIN)",
          displayName: "SEVEN (ADMIN)",
          email: "admin@prime.com",
          role: "ADMINISTRADOR",
          discordName: "SEVEN (ADMIN)",
          discordAvatarUrl: "https://cdn-icons-png.flaticon.com/512/2092/2092663.png",
          expiresAt: null,
          key: "ADMIN-LIFETIME",
          createdAt: "10/08/2026",
          emailVerified: true,
          hwidResetsMax: 99,
          hwidResetsUsed: 0,
          hwid: "HWID-ADMIN-PRO-001",
          products: ["PRIME EXTREMER"],
          invoices: [],
        },
      });
    }

    // Client User Login
    const userObj = await redis.get(USER_PREFIX + cleanUser.toLowerCase());
    if (!userObj) {
      return NextResponse.json(
        { error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    const inputHash = hashPassword(password);
    if (userObj.passwordHash && userObj.passwordHash !== inputHash) {
      return NextResponse.json(
        { error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    // Check linked key status & expiration
    let keyObj = null;
    if (userObj.key) {
      keyObj = await redis.get(KEY_PREFIX + userObj.key.toUpperCase());
      if (keyObj && keyObj.banned) {
        return NextResponse.json(
          { error: `Sua licença foi banida. Motivo: ${keyObj.banReason || "Bloqueio administrativo"}` },
          { status: 403 }
        );
      }
      if (keyObj && keyObj.expiresAt) {
        userObj.expiresAt = keyObj.expiresAt;
        if (new Date(keyObj.expiresAt) < new Date()) {
          return NextResponse.json(
            { error: "Sua licença expirou. Adquira uma nova chave para continuar.", expired: true },
            { status: 403 }
          );
        }
      }
    }

    // Update HWID if new
    if (hwid && (!userObj.hwid || userObj.hwid.startsWith("HWID-PRIME-"))) {
      userObj.hwid = hwid;
      await redis.set(USER_PREFIX + cleanUser.toLowerCase(), userObj);
    }

    sendDiscordWebhook(
      "LOGIN DE USUÁRIO PRIME EXTREMER",
      `O usuário **${userObj.displayName || cleanUser}** acessou o painel!`,
      0x00d2ff,
      [
        { name: "Usuário", value: userObj.displayName || userObj.username, inline: true },
        { name: "Key", value: userObj.key ? `\`${userObj.key}\`` : "Vitalícia", inline: true },
        { name: "Discord ID", value: userObj.discordId ? `\`${userObj.discordId}\`` : "Nenhum", inline: true },
        { name: "Validade", value: userObj.expiresAt ? new Date(userObj.expiresAt).toLocaleString("pt-BR") : "Vitalícia / Permanente", inline: true },
      ]
    );

    return NextResponse.json({
      ok: true,
      isAdmin: false,
      user: {
        username: userObj.displayName || userObj.username,
        displayName: userObj.displayName || userObj.username,
        email: userObj.email || `${cleanUser}@prime.com`,
        key: userObj.key || null,
        discordId: userObj.discordId || null,
        discordName: userObj.discordName || userObj.displayName || userObj.username,
        discordAvatarUrl: userObj.discordAvatarUrl || null,
        expiresAt: userObj.expiresAt || null,
        role: userObj.role || "OPERADOR",
        createdAt: userObj.createdAt || "10/08/2026",
        emailVerified: true,
        hwidResetsMax: userObj.hwidResetsMax ?? 2,
        hwidResetsUsed: userObj.hwidResetsUsed ?? 0,
        hwid: userObj.hwid || "HWID-PRIME-892A",
        products: userObj.products || ["PRIME EXTREMER"],
        invoices: userObj.invoices || [],
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor ao realizar login." },
      { status: 500 }
    );
  }
}
