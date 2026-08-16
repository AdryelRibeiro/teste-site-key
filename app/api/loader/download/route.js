import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import fs from "fs";
import path from "path";

export async function GET(request) {
  try {
    const loaderConfig = await redis.get("loader:config");
    let targetPath = null;
    let fileName = "PHANTOM_Loader.exe";

    if (loaderConfig && loaderConfig.fileName) {
      fileName = loaderConfig.fileName;
      const relativePath = loaderConfig.fileUrl.replace(/^\//, "");
      targetPath = path.join(process.cwd(), "public", relativePath);
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      // Fallback default file check
      const fallbackPath = path.join(process.cwd(), "public", "uploads", "PHANTOM_Loader.exe");
      if (fs.existsSync(fallbackPath)) {
        targetPath = fallbackPath;
      } else {
        // Try loader build directory
        const buildExe = "C:\\Users\\adrye\\Pictures\\loader\\bin\\Debug\\net7.0-windows\\Max Basic.exe";
        if (fs.existsSync(buildExe)) {
          targetPath = buildExe;
        }
      }
    }

    if (targetPath && fs.existsSync(targetPath)) {
      const fileBuffer = fs.readFileSync(targetPath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Arquivo do loader ainda não foi postado pelo Admin." },
      { status: 404 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao processar download do loader." },
      { status: 500 }
    );
  }
}
