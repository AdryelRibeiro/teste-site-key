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
    let fileName = "PHANTOM_Loader.exe";

    if (file && typeof file.arrayBuffer === "function") {
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fileName = file.name || "PHANTOM_Loader.exe";
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
        fileUrl = `/uploads/${fileName}`;
      } catch (writeErr) {
        console.warn("Serverless file write warning:", writeErr.message);
      }
    }

    const loaderConfig = {
      updatedAt: new Date().toISOString(),
      fileName: fileName || "PHANTOM_Loader.exe",
      fileUrl: fileUrl || "/api/loader/download",
    };

    await redis.set("loader:config", loaderConfig);

    return NextResponse.json({
      ok: true,
      config: loaderConfig,
      message: "Link/Arquivo do Loader atualizado com sucesso!",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao processar atualização do loader." },
      { status: 500 }
    );
  }
}
