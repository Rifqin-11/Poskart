import { NextResponse, type NextRequest } from "next/server";

import { isSuperAdminProfile } from "@/lib/auth/admin";
import {
  getGalleryStorageSummary,
  normalizeProvider,
  saveGalleryStorageSettings,
} from "@/lib/gallery/storage-provider";
import { safeApiError } from "@/lib/http/safe-api-error";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const forbidden = await requireSuperAdmin();
  if (forbidden) return forbidden;

  try {
    return NextResponse.json(await getGalleryStorageSummary());
  } catch (error) {
    return safeApiError(error, {
      context: "api/admin/gallery-storage GET",
      message: "Pengaturan penyimpanan galeri belum dapat dimuat.",
    });
  }
}

export async function PATCH(request: NextRequest) {
  const forbidden = await requireSuperAdmin();
  if (forbidden) return forbidden;

  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
  } | null;

  try {
    await saveGalleryStorageSettings({
      provider: normalizeProvider(body?.provider),
    });

    return NextResponse.json(await getGalleryStorageSummary());
  } catch (error) {
    return safeApiError(error, {
      context: "api/admin/gallery-storage PATCH",
      message: "Pengaturan penyimpanan galeri belum dapat disimpan.",
    });
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
