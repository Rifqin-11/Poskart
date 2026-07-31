"use client";

import { Dialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DialogActions } from "@/features/admin/_components/dialog-actions";
import { BriefcaseBusiness, Clock3, Mail, Phone, UserRound } from "lucide-react";
import { SettingField, SettingsFormIntro } from "./settings-card";

type ProfileDraft = {
  fullName: string;
  phone: string;
  jobTitle: string;
  timezone: string;
  memberRole: string;
};

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  profileDraft: ProfileDraft;
  setProfileDraft: React.Dispatch<React.SetStateAction<ProfileDraft>>;
  onSubmit: () => void;
  profileSaving: boolean;
  email: string;
  currentMemberRole?: string;
};

export function EditProfileDialog({
  open,
  onClose,
  profileDraft,
  setProfileDraft,
  onSubmit,
  profileSaving,
  email,
  currentMemberRole,
}: EditProfileDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Edit profile"
      className="max-w-2xl rounded-3xl"
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <SettingsFormIntro
          icon={<UserRound className="size-4" />}
          title="Personal information"
          description="Update the information shown to other members in your POSKART workspace."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <SettingField label="Display name">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder={t("profile.fullNamePlaceholder")}
                value={profileDraft.fullName}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    fullName: event.target.value,
                  }))
                }
              />
            </div>
          </SettingField>
          <SettingField label="Email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="bg-zinc-50 pl-9 text-zinc-500"
                value={email}
                readOnly
              />
            </div>
          </SettingField>
          <SettingField label="Phone">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="+62..."
                value={profileDraft.phone}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    phone: event.target.value,
                  }))
                }
              />
            </div>
          </SettingField>
          <SettingField label="Job title">
            <div className="relative">
              <BriefcaseBusiness className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Owner, Operator, Admin..."
                value={profileDraft.jobTitle}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    jobTitle: event.target.value,
                  }))
                }
              />
            </div>
          </SettingField>
          <SettingField label="Timezone">
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-zinc-400" />
              <Select
                className="pl-9"
                value={profileDraft.timezone}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    timezone: event.target.value,
                  }))
                }
              >
                <option value="Asia/Jakarta">Asia/Jakarta</option>
                <option value="Asia/Makassar">Asia/Makassar</option>
                <option value="Asia/Jayapura">Asia/Jayapura</option>
                <option value="UTC">UTC</option>
              </Select>
            </div>
          </SettingField>
          <SettingField label="Workspace role">
            <Input
              className="bg-zinc-50 font-medium capitalize text-zinc-500"
              value={currentMemberRole ?? "member"}
              readOnly
            />
          </SettingField>
        </div>

        <div className="-mx-4 -mb-4 border-t border-zinc-100 bg-white px-4 pt-3 sm:-mx-5 sm:-mb-5 sm:px-5">
          <DialogActions
            submitting={profileSaving}
            submitLabel="Save changes"
            submittingLabel="Saving..."
            onCancel={onClose}
          />
        </div>
      </form>
    </Dialog>
  );
}
