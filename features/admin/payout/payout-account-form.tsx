"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { Landmark, Loader2, Save, ShieldCheck } from "lucide-react";
import { showErrorToast, toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BankSelect } from "@/features/admin/payout/bank-select";
import {
  cancelPayoutAccountChangeOtp,
  confirmPayoutAccountChangeOtp,
  requestPayoutAccountChangeOtp,
} from "@/server/admin/actions/payout-actions";
import { usePermission } from "@/features/admin/hooks/use-permission";
import type { PayoutAccount } from "@/types/payout";

const emptyOtpDigits = () => ["", "", "", "", "", ""];

export function PayoutAccountForm({
  account,
  compact = false,
  onSaved,
  isEditing = false,
}: {
  account: PayoutAccount | null;
  compact?: boolean;
  onSaved?: () => void;
  isEditing?: boolean;
}) {
  return (
    <PayoutAccountFields
      key={account?.updatedAt ?? "new-payout-account"}
      account={account}
      compact={compact}
      onSaved={onSaved}
      isEditing={isEditing}
    />
  );
}

function PayoutAccountFields({
  account,
  compact,
  onSaved,
  isEditing = false,
}: {
  account: PayoutAccount | null;
  compact: boolean;
  onSaved?: () => void;
  isEditing?: boolean;
}) {
  const { isReadOnly } = usePermission();
  const [isPending, startTransition] = useTransition();
  const [otpChallenge, setOtpChallenge] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(emptyOtpDigits);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const verificationCodeRef = useRef<string | null>(null);
  const verificationInFlightRef = useRef(false);
  const [form, setForm] = useState({
    bankName: account?.bankName ?? "",
    accountNumber: account?.accountNumber ?? "",
    accountHolderName: account?.accountHolderName ?? "",
  });
  const otpChallengeId = otpChallenge?.id;

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCountdown((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (!otpChallengeId) return;
    const timer = window.setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [otpChallengeId]);

  useEffect(() => {
    if (!otpError || isPending) return;
    const timer = window.setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [otpError, isPending]);

  const clearOtpEntry = () => {
    setOtpDigits(emptyOtpDigits());
    setOtpError(null);
    verificationCodeRef.current = null;
  };

  const verifyOtp = (code: string) => {
    if (
      !otpChallenge ||
      code.length !== 6 ||
      verificationInFlightRef.current ||
      verificationCodeRef.current === code
    ) {
      return;
    }

    verificationCodeRef.current = code;
    verificationInFlightRef.current = true;
    startTransition(async () => {
      try {
        const result = await confirmPayoutAccountChangeOtp({
          challengeId: otpChallenge.id,
          code,
          account: form,
        });

        if (!result.success) {
          if (result.invalidCode) {
            setOtpDigits(emptyOtpDigits());
            setOtpError(result.error ?? "Kode OTP salah. Silakan coba lagi.");
            verificationCodeRef.current = null;
            return;
          }

          showErrorToast(
            "Payout account not saved",
            result.error ? new Error(result.error) : null,
            "Kode OTP tidak dapat diverifikasi. Silakan coba lagi.",
          );
          if (result.requiresNewCode) {
            setOtpChallenge(null);
            clearOtpEntry();
            setResendCountdown(0);
            return;
          }

          setOtpDigits(emptyOtpDigits());
          setOtpError(result.error ?? "Verifikasi gagal. Silakan coba lagi.");
          verificationCodeRef.current = null;
          return;
        }

        setOtpChallenge(null);
        clearOtpEntry();
        setResendCountdown(0);
        toast.success("Payout account saved");
        onSaved?.();
      } catch (error) {
        showErrorToast(
          "Payout account not saved",
          error instanceof Error ? error : null,
          "Kode OTP tidak dapat diverifikasi. Silakan coba lagi.",
        );
        setOtpDigits(emptyOtpDigits());
        setOtpError("Verifikasi gagal. Silakan coba lagi.");
        verificationCodeRef.current = null;
      } finally {
        verificationInFlightRef.current = false;
      }
    });
  };

  const handleOtpInput = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6 - index);
    const nextDigits = [...otpDigits];

    if (digits.length > 1) {
      digits.split("").forEach((digit, offset) => {
        nextDigits[index + offset] = digit;
      });
    } else {
      nextDigits[index] = digits;
    }

    setOtpDigits(nextDigits);
    setOtpError(null);

    const nextCode = nextDigits.join("");
    if (nextCode.length === 6) {
      verifyOtp(nextCode);
      return;
    }

    if (digits.length > 1) {
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
    } else if (digits && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    } else if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      event.preventDefault();
      setOtpDigits((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
      setOtpError(null);
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const submit = () => {
    startTransition(async () => {
      const result = await requestPayoutAccountChangeOtp(form);
      if (!result.success) {
        showErrorToast(
          "OTP could not be sent",
          result.error ? new Error(result.error) : null,
          "Kode verifikasi tidak dapat dikirim ke email owner.",
        );
        if (result.challengeId) {
          setOtpChallenge({
            id: result.challengeId,
            email: result.maskedEmail ?? "email owner organisasi",
          });
          clearOtpEntry();
          setResendCountdown(result.retryAfterSeconds ?? 60);
        }
        return;
      }
      if (!result.challengeId) {
        showErrorToast(
          "OTP could not be sent",
          null,
          "Kode verifikasi tidak dapat dikirim ke email owner.",
        );
        return;
      }
      setOtpChallenge({
        id: result.challengeId,
        email: result.maskedEmail ?? "email owner organisasi",
      });
      clearOtpEntry();
      setResendCountdown(60);
      toast.success("Verification code sent to the organization owner");
    });
  };

  const resendCode = () => {
    startTransition(async () => {
      const result = await requestPayoutAccountChangeOtp(form);
      if (!result.success) {
        showErrorToast(
          "OTP could not be sent",
          result.error ? new Error(result.error) : null,
          "Kode verifikasi tidak dapat dikirim ke email owner.",
        );
        if (result.retryAfterSeconds) {
          setResendCountdown(result.retryAfterSeconds);
        }
        if (result.challengeId) {
          setOtpChallenge({
            id: result.challengeId,
            email: result.maskedEmail ?? otpChallenge?.email ?? "email owner organisasi",
          });
        }
        return;
      }
      if (result.challengeId) {
        setOtpChallenge({
          id: result.challengeId,
          email: result.maskedEmail ?? otpChallenge?.email ?? "email owner organisasi",
        });
      }
      clearOtpEntry();
      setResendCountdown(60);
      toast.success("A new verification code was sent to the owner");
    });
  };

  const cancelVerification = () => {
    if (!otpChallenge) return;
    startTransition(async () => {
      const result = await cancelPayoutAccountChangeOtp(otpChallenge.id);
      if (!result.success) {
        showErrorToast(
          "Verification could not be canceled",
          result.error ? new Error(result.error) : null,
          "Sesi verifikasi tidak dapat dibatalkan.",
        );
        return;
      }
      setOtpChallenge(null);
      clearOtpEntry();
      setResendCountdown(0);
    });
  };

  if (!isEditing) {
    return (
      <div
        className={
          compact
            ? "space-y-4"
            : "rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4"
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {!compact ? (
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-zinc-100 text-zinc-700">
                <Landmark className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">
                  Payout account
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  This account is snapshotted when a withdrawal request is
                  created.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
            <div className="text-xs font-medium text-zinc-500">Bank</div>
            <div className="mt-1.5 text-sm font-semibold text-zinc-950">
              {account?.bankName || "-"}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
            <div className="text-xs font-medium text-zinc-500">
              Account number
            </div>
            <div className="mt-1.5 text-sm font-semibold text-zinc-950">
              {account?.accountNumber || "-"}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
            <div className="text-xs font-medium text-zinc-500">
              Account holder
            </div>
            <div className="mt-1.5 text-sm font-semibold text-zinc-950">
              {account?.accountHolderName || "-"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div
      className={
        compact
          ? "space-y-3"
          : "rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
      }
    >
      {!compact ? (
        <div className="mb-4 flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-zinc-100 text-zinc-700">
            <Landmark className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">
              Payout account
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              This account is snapshotted when a withdrawal request is created.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-xs font-medium text-zinc-600">
          Bank
          <BankSelect
            value={form.bankName}
            disabled={isReadOnly("invoices") || Boolean(otpChallenge) || isPending}
            onValueChange={(bankName) =>
              setForm((current) => ({
                ...current,
                bankName,
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Account number
          <Input
            className="mt-1.5"
            value={form.accountNumber}
            placeholder="1234567890"
            maxLength={64}
            disabled={Boolean(otpChallenge) || isPending}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                accountNumber: event.target.value,
              }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Account holder
          <Input
            className="mt-1.5"
            value={form.accountHolderName}
            placeholder="Company / account holder name"
            maxLength={160}
            disabled={Boolean(otpChallenge) || isPending}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                accountHolderName: event.target.value,
              }))
            }
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          className="rounded-2xl"
          onClick={submit}
          disabled={isPending || isReadOnly("invoices")}
        >
          <Save className="size-4" />
          {isPending ? "Sending code..." : "Save account"}
        </Button>
      </div>
    </div>
    <Dialog
      open={Boolean(otpChallenge)}
      onOpenChange={(open) => {
        if (!open && !isPending) cancelVerification();
      }}
      title="Verifikasi rekening payout"
      className="max-w-md rounded-3xl"
      overlayClassName="bg-black/50"
    >
      {otpChallenge ? (
        <div className="mx-auto max-w-sm space-y-5 py-1">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-[#00357B] ring-1 ring-blue-100">
            <ShieldCheck className="size-6" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-zinc-950">
              Masukkan kode verifikasi
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Kode 6 digit sudah dikirim ke <strong>{otpChallenge.email}</strong>.
              Rekening lama tetap aktif sampai kode berhasil diverifikasi.
            </p>
            <p className="mt-1 text-xs text-zinc-400">Kode berlaku selama 5 menit.</p>
          </div>

          <fieldset disabled={isPending}>
            <legend className="sr-only">Kode OTP enam digit</legend>
            <div className="mx-auto grid max-w-xs grid-cols-6 gap-2">
              {otpDigits.map((digit, index) => (
                <Input
                  key={index}
                  ref={(element) => {
                    otpInputRefs.current[index] = element;
                  }}
                  autoFocus={index === 0}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  pattern="[0-9]*"
                  maxLength={6}
                  aria-label={`Digit ${index + 1} dari 6`}
                  aria-invalid={Boolean(otpError)}
                  value={digit}
                  onChange={(event) => handleOtpInput(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={(event) => {
                    const pastedDigits = event.clipboardData
                      .getData("text")
                      .replace(/\D/g, "");
                    if (!pastedDigits) return;
                    event.preventDefault();
                    handleOtpInput(index, pastedDigits);
                  }}
                  className={`h-14 min-w-0 px-1 text-center font-mono text-xl font-semibold tabular-nums ${
                    otpError
                      ? "border-red-300 text-red-700 focus-visible:ring-red-400"
                      : "focus-visible:ring-[#00357B]"
                  }`}
                />
              ))}
            </div>
          </fieldset>

          <div className="min-h-5 text-center" aria-live="polite">
            {otpError ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {otpError}
              </p>
            ) : isPending ? (
              <p className="inline-flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="size-4 animate-spin" />
                {otpDigits.join("").length === 6
                  ? "Memverifikasi kode..."
                  : "Memproses permintaan..."}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-500"
              onClick={cancelVerification}
              disabled={isPending}
            >
              Batalkan
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={resendCode}
              disabled={isPending || resendCountdown > 0}
            >
              {resendCountdown > 0
                ? `Kirim ulang dalam ${resendCountdown} detik`
                : "Kirim ulang kode"}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
    </>
  );
}
