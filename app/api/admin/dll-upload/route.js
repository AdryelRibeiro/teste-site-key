import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { checkAdminSecret } from "@/lib/utils";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const formData = await request.formData().catch(() => null);
    
    let adminSecret = "";
    let file = null;
    let externalUrl = "";

    if (formData) {
      adminSecret = formData.get("adminSecret") || "";
      file = formData.get("file");
      externalUrl = formData.get("externalUrl") || "";
    }

    if (!checkAdminSecret(request, adminSecret)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let fileUrl = externalUrl ? externalUrl.trim() : null;
    let fileName = "Client.dll";

    if (file && typeof file.arrayBuffer === "function") {
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fileName = file.name || "Client.dll";
        const filePath = path.join(uploadDir, "Client.dll");
        fs.writeFileSync(filePath, buffer);
        fileUrl = "/uploads/Client.dll";
      } catch (writeErr) {
        console.warn("Serverless DLL write warning:", writeErr.message);
      }
    }

    const dllConfig = {
      updatedAt: new Date().toISOString(),
      fileName: "Client.dll",
      externalUrl: externalUrl ? externalUrl.trim() : null,
      fileUrl: fileUrl || "/api/loader/dll",
    };

    await redis.set("dll:config", dllConfig);

    return NextResponse.json({
      ok: true,
      config: dllConfig,
      message: "DLL Client.dll atualizada com sucesso no servidor!",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao processar atualização da DLL." },
      { status: 500 }
    );
  }
}
