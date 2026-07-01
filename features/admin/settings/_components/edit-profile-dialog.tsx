"use client";

import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DialogActions } from "@/features/admin/_components/dialog-actions";

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
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Edit Profile"
    >
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label className="block text-xs font-medium text-zinc-600">
          Display name
          <Input
            className="mt-1"
            placeholder="Nama lengkap"
            value={profileDraft.fullName}
            onChange={(ev) =>
              setProfileDraft((d) => ({ ...d, fullName: ev.target.value }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Email
          <Input
            className="mt-1 bg-zinc-50"
            value={email}
            readOnly
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Phone
          <Input
            className="mt-1"
            placeholder="+62..."
            value={profileDraft.phone}
            onChange={(ev) =>
              setProfileDraft((d) => ({ ...d, phone: ev.target.value }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Job title
          <Input
            className="mt-1"
            placeholder="Owner, Operator, Admin..."
            value={profileDraft.jobTitle}
            onChange={(ev) =>
              setProfileDraft((d) => ({ ...d, jobTitle: ev.target.value }))
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Timezone
          <Select
            className="mt-1"
            value={profileDraft.timezone}
            onChange={(ev) =>
              setProfileDraft((d) => ({ ...d, timezone: ev.target.value }))
            }
          >
            <option value="Asia/Jakarta">Asia/Jakarta</option>
            <option value="Asia/Makassar">Asia/Makassar</option>
            <option value="Asia/Jayapura">Asia/Jayapura</option>
            <option value="UTC">UTC</option>
          </Select>
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Role
          {currentMemberRole === "owner" ? (
            <Select
              className="mt-1"
              value={profileDraft.memberRole}
              onChange={(ev) =>
                setProfileDraft((d) => ({ ...d, memberRole: ev.target.value }))
              }
            >
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="operator">operator</option>
              <option value="akutansi">akutansi</option>
              <option value="partner">partner</option>
            </Select>
          ) : (
            <Input
              className="mt-1 bg-zinc-50"
              value={currentMemberRole ?? "member"}
              readOnly
            />
          )}
        </label>
        <div className="col-span-2 border-t border-zinc-200 pt-4">
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
