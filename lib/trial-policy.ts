import type { TrialEligibility } from "@/types/trial";

export function trialUnavailableMessage(reason: string | null): string {
  switch (reason) {
    case "duplicate_organization":
      return "Organisasi ini sudah pernah menggunakan trial. Silakan pilih paket berlangganan.";
    case "duplicate_email":
      return "Email ini sudah pernah digunakan untuk trial. Silakan pilih paket berlangganan.";
    case "duplicate_owner":
      return "Akun ini sudah pernah menggunakan trial. Silakan pilih paket berlangganan.";
    case "subscription_exists":
      return "Organisasi ini sudah memiliki subscription. Trial baru tidak tersedia.";
    case "email_unverified":
      return "Verifikasi email Anda terlebih dahulu untuk memulai trial.";
    case "not_owner":
      return "Hanya pemilik organisasi yang dapat memulai trial.";
    default:
      return "Trial belum dapat diverifikasi. Silakan coba lagi.";
  }
}

export function trialEligibilityTitle(eligibility: TrialEligibility): string {
  if (eligibility.claimStatus === "revoked") return "Trial dibatalkan";
  if (eligibility.claimStatus === "expired") return "Trial telah berakhir";
  if (eligibility.reason?.startsWith("duplicate_")) return "Jatah trial sudah digunakan";
  return "Trial tidak tersedia";
}
