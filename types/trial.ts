export type TrialRequestStatus =
  | "pending"
  | "needs_information"
  | "approved"
  | "activated"
  | "rejected"
  | "canceled"
  | "activation_expired";

export type TrialClaimStatus = "active" | "converted" | "expired" | "revoked";

export type TrialRiskFlag =
  | "duplicate_owner"
  | "duplicate_organization"
  | "duplicate_email"
  | "duplicate_hardware"
  | "duplicate_payout";

export type TrialRequest = {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  requesterProfileId: string | null;
  requesterEmail: string | null;
  deviceId: string | null;
  hardwareIdHash: string | null;
  emailSnapshot: string;
  contactPhone: string | null;
  businessName: string | null;
  city: string | null;
  intendedUse: string | null;
  eventDate: string | null;
  status: TrialRequestStatus;
  riskFlags: TrialRiskFlag[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectionCode: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  activationDeadline: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  claimStatus: TrialClaimStatus | null;
  trialEndsAt: string | null;
  revokeReason: string | null;
};

export type TrialEligibility = {
  checkedAt: string;
  eligible: boolean;
  reason: string | null;
  claimStatus: TrialClaimStatus | null;
  endsAt: string | null;
  revokeReason: string | null;
};

export type TrialClaim = {
  id: string;
  requestId: string;
  organizationId: string | null;
  ownerProfileId: string | null;
  deviceId: string | null;
  startedAt: string;
  endsAt: string;
  status: TrialClaimStatus;
  convertedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  createdAt: string;
};

export type SubmitTrialRequestInput = {
  organizationId: string;
  deviceId: string;
  hardwareIdHash?: string | null;
  contactPhone?: string | null;
  businessName?: string | null;
  city?: string | null;
  intendedUse?: string | null;
  eventDate?: string | null;
};

export type ReviewTrialRequestInput = {
  requestId: string;
  decision: "approved" | "rejected" | "needs_information";
  note?: string | null;
  rejectionCode?: string | null;
};

export type TrialRequestFilters = {
  status?: TrialRequestStatus | "all";
  page?: number;
  pageSize?: number;
};
