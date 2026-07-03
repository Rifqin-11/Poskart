export type OrganizationFeatureKey = "posKasir" | "money";

export type OrganizationFeatureAccess = Record<OrganizationFeatureKey, boolean>;

export const DEFAULT_ORGANIZATION_FEATURES: OrganizationFeatureAccess = {
  posKasir: false,
  money: false,
};

export const ORGANIZATION_FEATURE_LABELS: Record<OrganizationFeatureKey, string> = {
  posKasir: "POS Kasir",
  money: "Keuangan",
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
    money: source.money === true,
  };
}
