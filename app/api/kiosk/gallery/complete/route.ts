import { after } from "next/server";

import {
  jsonError,
  jsonOk,
  requireKioskContext,
  requireOrganizationDevice,
} from "@/lib/kiosk/server";
import { getPublicGalleryUrl } from "@/lib/gallery/urls";
import {
  deleteGalleryAssets,
  normalizeProvider,
  type GalleryStorageProvider,
} from "@/lib/gallery/storage-provider";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UploadedAsset = {
  kind?: "raw" | "framed";
  photoIndex?: number;
  publicId?: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  resourceType?: "image" | "video";
  storageProvider?: GalleryStorageProvider;
};

type CompleteBody = {
  deviceId?: string;
  sessionId?: string;
  templateName?: string;
  themeName?: string;
  socialMediaConsent?: boolean;
  testMode?: boolean;
  mediaGeneration?: number;
  assets?: UploadedAsset[];
};

export async function POST(request: Request) {
  try {
    const context = await requireKioskContext(request);
    const body = (await request.json()) as CompleteBody;
    const device = await requireOrganizationDevice(
      context,
      body.deviceId ?? "",
    );
    const sessionId = body.sessionId?.trim() ?? "";
    const assets = (body.assets ?? []).filter(
      (asset) =>
        (asset.kind === "raw" || asset.kind === "framed") &&
        Number.isInteger(asset.photoIndex) &&
        Boolean(asset.publicId?.trim()) &&
        Boolean(asset.secureUrl?.startsWith("https://")),
    );

    if (!sessionId || assets.length === 0) {
      return jsonOk(
        {
          error: "A session ID and uploaded assets are required.",
          code: "KIOSK_GALLERY_COMPLETE_INVALID",
        },
        { status: 400 },
      );
    }

    const shareUrl = getPublicGalleryUrl(sessionId);
    const requestedGeneration = Number(body.mediaGeneration ?? 0);
    const mediaGeneration =
      Number.isSafeInteger(requestedGeneration) && requestedGeneration >= 0
        ? requestedGeneration
        : 0;
    const includesPrimaryFrame = assets.some(
      (asset) => asset.kind === "framed" && asset.photoIndex === 0,
    );
    const incomingAssetKeys = new Set(
      assets.map(
        (asset) =>
          `${asset.kind}:${Math.max(0, asset.photoIndex ?? 0)}`,
      ),
    );

    // Keep the old provider IDs until the replacement upload has completed.
    // They are deleted only after the logical gallery slots are successfully
    // updated, so a failed retake upload cannot break the existing gallery.
    const { data: previousAssets, error: previousAssetsError } =
      await context.client
        .from("gallery_photos")
        .select(
          "kind,photo_index,storage_provider,provider_public_id,cloudinary_public_id",
        )
        .eq("organization_id", context.organizationId)
        .eq("session_id", sessionId);
    if (previousAssetsError) throw previousAssetsError;

    if (!includesPrimaryFrame) {
      const { data: existingPrimaryFrame, error: existingFrameError } =
        await context.client
          .from("gallery_photos")
          .select("id")
          .eq("organization_id", context.organizationId)
          .eq("session_id", sessionId)
          .eq("kind", "framed")
          .eq("photo_index", 0)
          .maybeSingle();
      if (existingFrameError) throw existingFrameError;
      if (!existingPrimaryFrame) {
        return jsonOk(
          {
            error:
              "Primary framed photo is required before supplemental gallery assets.",
            code: "KIOSK_GALLERY_PRIMARY_FRAME_REQUIRED",
          },
          { status: 409 },
        );
      }
    }

    const { data: completion, error: completionError } =
      await createSupabaseAdminClient().rpc(
        "complete_gallery_upload_generation",
        {
          p_session_id: sessionId,
          p_organization_id: context.organizationId,
          p_device_id: device.id,
          p_template_name: body.templateName?.trim() ?? "",
          p_theme_name: body.themeName?.trim() ?? "",
          p_social_media_consent: body.socialMediaConsent === true,
          p_test_mode: body.testMode === true,
          p_media_generation: mediaGeneration,
          p_replace_generation: includesPrimaryFrame,
          p_assets: assets.map((asset) => ({
            storageProvider: normalizeProvider(asset.storageProvider),
            kind: asset.kind,
            photoIndex: Math.max(0, asset.photoIndex ?? 0),
            publicId: asset.publicId!.trim(),
            secureUrl: asset.secureUrl!.trim(),
            resourceType: asset.resourceType === "video" ? "video" : "image",
            width: asset.width ?? null,
            height: asset.height ?? null,
            bytes: asset.bytes ?? null,
            format: asset.format?.trim() || null,
          })),
          p_share_url: shareUrl,
        },
      );
    if (completionError) throw completionError;

    const completionResult = completion as
      | { applied?: boolean; replacedGeneration?: boolean }
      | null;
    if (completionResult?.applied !== true) {
      return jsonOk({ success: true, sessionId, shareUrl, skipped: true });
    }

    const incomingPublicIds = new Set(
      assets.map((asset) => asset.publicId!.trim()),
    );
    const replacedAssets = (previousAssets ?? [])
      .filter((asset) => {
        const logicalKey = `${asset.kind}:${Math.max(0, asset.photo_index ?? 0)}`;
        const previousPublicId =
          asset.provider_public_id || asset.cloudinary_public_id;
        return (
          incomingAssetKeys.has(logicalKey) &&
          Boolean(previousPublicId) &&
          !incomingPublicIds.has(previousPublicId)
        );
      })
      .map((asset) => ({
        storage_provider: normalizeProvider(asset.storage_provider),
        provider_public_id: asset.provider_public_id ?? undefined,
        cloudinary_public_id: asset.cloudinary_public_id ?? undefined,
      }));

    if (completionResult.replacedGeneration) {
      replacedAssets.push(
        ...(previousAssets ?? [])
          .filter(
            (asset) =>
              (asset.kind === "raw" && asset.photo_index === 98) ||
              (asset.kind === "framed" && asset.photo_index === 1),
          )
          .map((asset) => ({
            storage_provider: normalizeProvider(asset.storage_provider),
            provider_public_id: asset.provider_public_id ?? undefined,
            cloudinary_public_id: asset.cloudinary_public_id ?? undefined,
          })),
      );
    }

    if (replacedAssets.length > 0) {
      after(async () => {
        try {
          await deleteGalleryAssets(replacedAssets);
        } catch (cleanupError) {
          // The gallery already points at the new generation. Cleanup is best
          // effort and must not make a successful retake appear failed.
          console.error(
            "Unable to remove superseded gallery assets:",
            cleanupError,
          );
        }
      });
    }

    return jsonOk({ success: true, sessionId, shareUrl });
  } catch (error) {
    return jsonError(error);
  }
}
