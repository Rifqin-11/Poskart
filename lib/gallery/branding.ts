export type GalleryBrandingOverrides = {
  brandName?: string;
  logoUrl?: string;
  subtitle?: string;
  footerText?: string;
};

export type GalleryBranding = {
  brandName: string;
  logoUrl: string;
  subtitle: string;
  footerText: string;
};

export const DEFAULT_GALLERY_BRANDING: GalleryBranding = {
  brandName: "POSKART",
  logoUrl: "/Logo Poskart.png",
  subtitle: "Receipt Photobooth",
  footerText: "POSKART",
};

const MAX_BRAND_NAME_LENGTH = 80;
const MAX_LOGO_URL_LENGTH = 2048;

/** Normalizes only the global white-label fields supported by the first release. */
export function normalizeGalleryBrandingOverrides(
  value: unknown,
): GalleryBrandingOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const input = value as Record<string, unknown>;
  const brandName = normalizePlainString(input.brandName, MAX_BRAND_NAME_LENGTH);
  const logoUrl = normalizeLogoUrl(input.logoUrl);
  const subtitle = normalizePlainString(input.subtitle, 80);
  const footerText = normalizePlainString(input.footerText, 160);

  return {
    ...(brandName ? { brandName } : {}),
    ...(logoUrl ? { logoUrl } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(footerText ? { footerText } : {}),
  };
}

export function normalizeGalleryBranding(value: unknown): GalleryBranding {
  return {
    ...DEFAULT_GALLERY_BRANDING,
    ...normalizeGalleryBrandingOverrides(value),
  };
}

function normalizePlainString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return normalized.length > 0 && normalized.length <= maxLength
    ? normalized
    : undefined;
}

function normalizeLogoUrl(value: unknown) {
  const normalized = normalizePlainString(value, MAX_LOGO_URL_LENGTH);
  if (!normalized) return undefined;
  if (normalized.startsWith("/") && !normalized.startsWith("//")) {
    return normalized;
  }

  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:"
      ? normalized
      : undefined;
  } catch {
    return undefined;
  }
}
