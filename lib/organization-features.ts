export type OrganizationFeatureKey = "posKasir" | "showcase";

export type OrganizationFeatureAccess = Record<OrganizationFeatureKey, boolean>;

export const DEFAULT_ORGANIZATION_FEATURES: OrganizationFeatureAccess = {
  posKasir: false,
  showcase: false,
};

export const ORGANIZATION_FEATURE_LABELS: Record<OrganizationFeatureKey, string> = {
  posKasir: "POS Cashier",
  showcase: "Showcase",
};

export function normalizeOrganizationFeatures(
  value: unknown,
): OrganizationFeatureAccess {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    posKasir: source.posKasir === true,
    showcase: source.showcase === true,
  };
}
