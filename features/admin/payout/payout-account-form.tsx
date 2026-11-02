"use client";

import { useEffect, useState, useTransition } from "react";
import { Landmark, Save } from "lucide-react";
import { showErrorToast, toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BankSelect } from "@/features/admin/payout/bank-select";
import {
  cancelPayoutAccountChangeOtp,
  confirmPayoutAccountChangeOtp,
  requestPayoutAccountChangeOtp,
} from "@/server/admin/actions/payout-actions";
import { usePermission } from "@/features/admin/hooks/use-permission";
import type { PayoutAccount } from "@/types/payout";

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
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [form, setForm] = useState({
    bankName: account?.bankName ?? "",
    accountNumber: account?.accountNumber ?? "",
    accountHolderName: account?.accountHolderName ?? "",
  });

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCountdown((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

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
      setOtpCode("");
      setResendCountdown(60);
      toast.success("Verification code sent to the organization owner");
    });
  };

  const confirm = () => {
    if (!otpChallenge) return;
    startTransition(async () => {
      const result = await confirmPayoutAccountChangeOtp({
        challengeId: otpChallenge.id,
        code: otpCode,
        account: form,
      });
      if (!result.success) {
        showErrorToast(
          "Payout account not saved",
          result.error ? new Error(result.error) : null,
          "Kode OTP tidak valid. Periksa email owner lalu coba lagi.",
        );
        if (result.requiresNewCode) {
          setOtpChallenge(null);
          setOtpCode("");
          setResendCountdown(0);
        }
        return;
      }
      setOtpChallenge(null);
      setOtpCode("");
      setResendCountdown(0);
      toast.success("Payout account saved");
      onSaved?.();
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
      setOtpCode("");
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
      setOtpCode("");
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

      {otpChallenge ? (
        <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Verify with the organization owner
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-600">
              A 6-digit code was sent to {otpChallenge.email}. The current payout
              account stays active until the code is verified. Code expires in 5
              minutes.
            </p>
          </div>
          <label className="block max-w-xs text-xs font-medium text-zinc-600">
            Email verification code
            <Input
              className="mt-1.5 tracking-[0.3em]"
              value={otpCode}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              disabled={isPending}
              onChange={(event) =>
                setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={cancelVerification}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={resendCode}
              disabled={isPending || resendCountdown > 0}
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
            </Button>
            <Button
              type="button"
              className="rounded-2xl"
              onClick={confirm}
              disabled={isPending || isReadOnly("invoices") || otpCode.length !== 6}
            >
              <Save className="size-4" />
              {isPending ? "Verifying..." : "Verify & save"}
            </Button>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
