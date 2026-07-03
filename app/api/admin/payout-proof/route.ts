import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

import { isSuperAdminEmail } from "@/lib/auth/admin";
import { uploadR2Object } from "@/lib/r2/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_PROOF_SIZE = 8 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function safePathPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!isSuperAdminEmail(authData.user?.email)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const invoiceId = String(form.get("invoiceId") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "File bukti transfer wajib diupload." },
        { status: 400 },
      );
    }
    if (!invoiceId) {
      return NextResponse.json(
        { message: "Invoice ID wajib dikirim." },
        { status: 400 },
      );
    }
    if (!ALLOWED_PROOF_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Format bukti transfer harus JPG, PNG, atau WebP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_PROOF_SIZE) {
      return NextResponse.json(
        { message: "Ukuran bukti transfer maksimal 8 MB." },
        { status: 400 },
      );
    }

    const input = Buffer.from(await file.arrayBuffer());
    const output = await sharp(input, { animated: false })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const key = `admin/payout-proofs/${safePathPart(invoiceId)}/${crypto.randomUUID()}.webp`;
    const uploaded = await uploadR2Object({
      key,
      body: output,
      contentType: "image/webp",
    });

    return NextResponse.json({
      url: uploaded.url,
      key: uploaded.key,
      contentType: "image/webp",
      size: output.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Gagal upload bukti transfer.",
      },
      { status: 500 },
    );
  }
}
