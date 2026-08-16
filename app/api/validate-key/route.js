import { NextResponse } from "next/server";
import { redis, KEY_PREFIX } from "@/lib/redis";
import { logHistory } from "@/lib/history";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { key, hwid } = body;

  if (!key) {
    return NextResponse.json(
      { valid: false, reason: "chave nao informada" },
      { status: 400 }
    );
  }

  const normalizedKey = key.trim().toUpperCase();
  const record = await redis.get(KEY_PREFIX + normalizedKey);

  if (!record) {
    await logHistory({ type: "validation_failed", key: normalizedKey, detail: "chave invalida", hwid });
    return NextResponse.json({ valid: false, reason: "chave invalida" });
  }

  if (record.banned) {
    await logHistory({ type: "validation_failed", key: record.key, detail: "chave banida", hwid });
    return NextResponse.json({ valid: false, reason: "chave banida" });
  }

  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    await logHistory({ type: "validation_failed", key: record.key, detail: "chave expirada", hwid });
    return NextResponse.json({ valid: false, reason: "chave expirada" });
  }

  const activations = record.activations || [];
  const alreadyActivatedHere = hwid
    ? activations.some((a) => a.hwid === hwid)
    : false;

  if (!alreadyActivatedHere && activations.length >= record.maxActivations) {
    await logHistory({ type: "validation_failed", key: record.key, detail: "limite de ativacoes atingido", hwid });
    return NextResponse.json({
      valid: false,
      reason: "limite de ativacoes atingido",
    });
  }

  // registra a ativacao deste dispositivo, se ainda nao registrada
  if (hwid && !alreadyActivatedHere) {
    activations.push({ hwid, activatedAt: new Date().toISOString() });
    record.activations = activations;
    await redis.set(KEY_PREFIX + record.key, record);
    await logHistory({ type: "activated", key: record.key, detail: null, hwid });
  }

  return NextResponse.json({
    valid: true,
    expiresAt: record.expiresAt,
    activationsUsed: record.activations.length,
    maxActivations: record.maxActivations,
  });
}
