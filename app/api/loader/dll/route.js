import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import fs from "fs";
import path from "path";

export async function GET(request) {
  try {
    const dllConfig = await redis.get("dll:config");

    // Se o Admin configurou uma URL externa para a DLL
    if (dllConfig && dllConfig.externalUrl) {
      return NextResponse.redirect(dllConfig.externalUrl);
    }

    // Se o Admin enviou um arquivo local
    let targetPath = path.join(process.cwd(), "public", "uploads", "Client.dll");
    
    if (fs.existsSync(targetPath)) {
      const fileBuffer = fs.readFileSync(targetPath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": 'attachment; filename="Client.dll"',
        },
      });
    }

    // Fallback: Tenta pegar da pasta do loader local se existir
    const fallbackPath = "C:\\Users\\adrye\\Pictures\\loader\\Dll\\Client.dll";
    if (fs.existsSync(fallbackPath)) {
      const fileBuffer = fs.readFileSync(fallbackPath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": 'attachment; filename="Client.dll"',
        },
      });
    }

    return NextResponse.json(
      { error: "Nenhuma DLL cadastrada ainda no painel Admin." },
      { status: 404 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao processar download da DLL." },
      { status: 500 }
    );
  }
}
