import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const ORGANIZATION_INVITATION_TTL_DAYS = 7;

export function createOrganizationInvitationToken() {
  return randomBytes(32).toString("hex");
}

export function hashOrganizationInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function organizationInvitationPath(token: string) {
  return `/organization/invitations/${encodeURIComponent(token)}`;
}

export function organizationInvitationExpiry() {
  return new Date(
    Date.now() + ORGANIZATION_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}
