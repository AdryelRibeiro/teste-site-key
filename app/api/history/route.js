import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/utils";
import { getHistory } from "@/lib/history";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!checkAdminSecret(request, body.adminSecret)) {
    return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
  }

  const history = await getHistory(300);
  return NextResponse.json({ ok: true, history });
}
