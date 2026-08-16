import { NextResponse } from "next/server";
import { redis, KEY_PREFIX, KEY_INDEX } from "@/lib/redis";
import { checkAdminSecret } from "@/lib/utils";

async function getKeysList() {
  try {
    const allKeys = await redis.smembers(KEY_INDEX);
    if (!allKeys || allKeys.length === 0) {
      return [];
    }

    const records = await Promise.all(
      allKeys.map((k) => redis.get(KEY_PREFIX + k))
    );

    return records
      .filter(Boolean)
      .map((r) => ({
        code: r.key,
        productName: r.productName || "PRIME MENU FREE FIRE",
        durationDays: r.durationHours ? Math.round(r.durationHours / 24) : 9999,
        status: r.status || (r.assignedUser ? "USED" : "UNUSED"),
        redeemedBy: r.assignedUser || null,
        banned: !!r.banned,
        paused: !!r.paused,
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (e) {
    return [];
  }
}

export async function GET() {
  const keys = await getKeysList();
  return NextResponse.json({ ok: true, keys });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!checkAdminSecret(request, body.adminSecret)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const keys = await getKeysList();
  return NextResponse.json({ ok: true, keys });
}
