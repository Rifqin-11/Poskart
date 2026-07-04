"use client";

import type { ReactNode } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Camera,
  Clock3,
  LogOut,
  Mail,
  PencilLine,
  Phone,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/auth/actions";
import {
  SettingsInlineHeader,
  SettingsPanelBlock,
} from "./settings-card";

type Account = {
  email: string;
  systemRole: string;
  fullName: string;
  phone: string;
  jobTitle: string;
  timezone: string;
};

type ProfileCardProps = {
  account: Account;
  currentMemberRole?: string;
  onEditProfile: () => void;
};

function ProfileDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-zinc-900 sm:truncate">
        {value || <span className="text-zinc-400">-</span>}
      </div>
    </div>
  );
}

export function ProfileCard({
  account,
  currentMemberRole,
  onEditProfile,
}: ProfileCardProps) {
  const accountInitials = account.fullName
    ? account.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : account.email
      ? account.email.slice(0, 2).toUpperCase()
      : "";

  const accountDisplayName = account.fullName || "User Account";

  return (
    <div className="space-y-8">
      <section className="grid min-w-0 gap-5 border-b border-zinc-100 pb-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsInlineHeader
          icon={<UserRound className="size-4" />}
          title="My details"
          description="Kelola identitas akun yang dipakai untuk dashboard POSKART."
        />
        <SettingsPanelBlock className="min-w-0 overflow-hidden">
          <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative grid size-16 shrink-0 place-items-center rounded-3xl border border-zinc-200 bg-zinc-950 text-xl font-semibold text-white shadow-sm sm:size-20 sm:text-2xl">
                {accountInitials || "PO"}
                <button
                  type="button"
                  className="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
                  aria-label="Change profile photo"
                >
                  <Camera className="size-4" />
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                  Account
                </p>
                <h2 className="mt-1 break-words text-xl font-semibold text-zinc-950 sm:truncate sm:text-2xl">
                  {accountDisplayName}
                </h2>
                <p className="mt-1 flex min-w-0 items-start gap-2 text-sm text-zinc-500 sm:items-center">
                  <Mail className="size-4 shrink-0" />
                  <span className="min-w-0 break-all sm:truncate">
                    {account.email || "Loading account..."}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap gap-1.5 md:justify-end">
              <Badge
                variant="secondary"
                className="capitalize whitespace-nowrap"
              >
                {currentMemberRole ?? "member"}
              </Badge>
              <Badge variant="secondary" className="whitespace-nowrap">
                {account.systemRole}
              </Badge>
            </div>
          </div>
        </SettingsPanelBlock>
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">
            Profile information
          </h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Informasi dasar akun dan akses workspace.
          </p>
        </div>
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileDetail
              icon={<UserRound className="size-3.5" />}
              label="Display name"
              value={account.fullName}
            />
            <ProfileDetail
              icon={<Phone className="size-3.5" />}
              label="Phone"
              value={account.phone}
            />
            <ProfileDetail
              icon={<BriefcaseBusiness className="size-3.5" />}
              label="Job title"
              value={account.jobTitle}
            />
            <ProfileDetail
              icon={<Clock3 className="size-3.5" />}
              label="Timezone"
              value={account.timezone}
            />
            <ProfileDetail
              icon={<BadgeCheck className="size-3.5" />}
              label="Access"
              value={
                <span className="flex min-w-0 flex-wrap gap-1.5">
                  <Badge variant="secondary" className="capitalize">
                    {currentMemberRole ?? "member"}
                  </Badge>
                  <Badge variant="secondary">{account.systemRole}</Badge>
                </span>
              }
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onEditProfile}
              className="rounded-2xl sm:w-auto"
            >
              <PencilLine className="size-4" />
              Change profile
            </Button>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="outline"
                className="w-full rounded-2xl sm:w-auto"
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
