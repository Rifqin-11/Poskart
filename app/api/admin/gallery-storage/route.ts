import { NextResponse, type NextRequest } from "next/server";

import { isSuperAdminProfile } from "@/lib/auth/admin";
import {
  getGalleryStorageSummary,
  normalizeProvider,
  saveGalleryStorageSettings,
} from "@/lib/gallery/storage-provider";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const forbidden = await requireSuperAdmin();
  if (forbidden) return forbidden;

  try {
    return NextResponse.json(await getGalleryStorageSummary());
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load storage" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const forbidden = await requireSuperAdmin();
  if (forbidden) return forbidden;

  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
    imagekit?: {
      publicKey?: unknown;
      privateKey?: unknown;
      urlEndpoint?: unknown;
    };
    cloudinary?: {
      cloudName?: unknown;
      apiKey?: unknown;
      apiSecret?: unknown;
    };
  } | null;

  try {
    await saveGalleryStorageSettings({
      provider: normalizeProvider(body?.provider),
      imagekit: {
        publicKey: toString(body?.imagekit?.publicKey),
        privateKey: toString(body?.imagekit?.privateKey),
        urlEndpoint: toString(body?.imagekit?.urlEndpoint),
      },
      cloudinary: {
        cloudName: toString(body?.cloudinary?.cloudName),
        apiKey: toString(body?.cloudinary?.apiKey),
        apiSecret: toString(body?.cloudinary?.apiSecret),
      },
    });

    return NextResponse.json(await getGalleryStorageSummary());
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save storage" },
      { status: 400 },
    );
  }
}

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!(await isSuperAdminProfile(supabase, authData.user?.id))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
}

function toString(value: unknown) {
  return typeof value === "string" ? value : "";
}
