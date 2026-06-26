"use client";

import { Camera, Mail, PencilLine, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signOutAction } from "@/app/auth/actions";

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
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-zinc-200 bg-gradient-to-br from-blue-800 via-blue-900 to-blue-950 p-6 text-white">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative grid size-20 place-items-center rounded-3xl border border-white/15 bg-white/10 text-2xl font-semibold shadow-inner">
              {accountInitials || "PO"}
              <button
                type="button"
                className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full border border-white/20 bg-white text-zinc-950 shadow-sm"
                aria-label="Change profile photo"
              >
                <Camera className="size-4" />
              </button>
            </div>
            <div>
              <h2 className="text-2xl font-semibold">
                {accountDisplayName}
              </h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-white/65">
                <Mail className="size-4" />
                {account.email || "Loading account..."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="capitalize whitespace-nowrap">
              {currentMemberRole ?? "member"}
            </Badge>
            <Badge variant="secondary" className="whitespace-nowrap">
              {account.systemRole}
            </Badge>
          </div>
        </div>
      </div>
      <CardContent className="flex flex-col flex-1 px-6 pb-4 pt-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Display name</p>
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-800">
              {account.fullName || <span className="text-zinc-400">—</span>}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Email</p>
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-800">
              {account.email || <span className="text-zinc-400">—</span>}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Phone</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-800">
              {account.phone || <span className="text-zinc-400">—</span>}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Job title</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-800">
              {account.jobTitle || <span className="text-zinc-400">—</span>}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Timezone</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-800">
              {account.timezone}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Access</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="capitalize">
                {currentMemberRole ?? "member"}
              </Badge>
              <Badge variant="secondary">{account.systemRole}</Badge>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 mt-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onEditProfile}
          >
            <PencilLine className="size-4" />
            Change profile
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
