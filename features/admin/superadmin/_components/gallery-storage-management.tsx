"use client";

import { useEffect, useState } from "react";
import { Check, Cloud, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GalleryStorageProvider = "cloudinary" | "imagekit";

type GalleryStorageSummary = {
  provider: GalleryStorageProvider;
  imagekit: {
    configured: boolean;
    publicKeyLast4: string | null;
    urlEndpoint: string | null;
  };
  cloudinary: {
    configured: boolean;
    cloudName: string | null;
    apiKeyLast4: string | null;
    apiSecretLast4: string | null;
  };
};

const EMPTY_SUMMARY: GalleryStorageSummary = {
  provider: "cloudinary",
  imagekit: {
    configured: false,
    publicKeyLast4: null,
    urlEndpoint: null,
  },
  cloudinary: {
    configured: false,
    cloudName: null,
    apiKeyLast4: null,
    apiSecretLast4: null,
  },
};

export function GalleryStorageManagement() {
  const [summary, setSummary] = useState<GalleryStorageSummary>(EMPTY_SUMMARY);
  const [provider, setProvider] =
    useState<GalleryStorageProvider>("cloudinary");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStorage() {
      try {
        const response = await fetch("/api/admin/gallery-storage", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | GalleryStorageSummary
          | { message?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload && "message" in payload
              ? payload.message
              : "Unable to load gallery storage",
          );
        }

        if (!cancelled && payload && "provider" in payload) {
          setSummary(payload);
          setProvider(payload.provider);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load gallery storage",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStorage();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveStorage = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/gallery-storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | GalleryStorageSummary
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "message" in payload
            ? payload.message
            : "Unable to save gallery storage",
        );
      }

      if (payload && "provider" in payload) {
        setSummary(payload);
      }
      toast.success("Gallery storage updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gallery Storage</CardTitle>
        <CardDescription>
          Choose where new photobooth gallery files are uploaded. Existing files
          keep using the provider stored on each gallery item.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-2">
          <StorageProviderCard
            icon={Cloud}
            title="Cloudinary"
            description="Use Cloudinary for new gallery uploads. Old Cloudinary files stay accessible."
            selected={provider === "cloudinary"}
            disabled={loading || saving}
            onClick={() => setProvider("cloudinary")}
          />
          <StorageProviderCard
            icon={ImageIcon}
            title="ImageKit"
            description="Route new gallery uploads to ImageKit while keeping old Cloudinary URLs alive."
            selected={provider === "imagekit"}
            disabled={loading || saving}
            onClick={() => setProvider("imagekit")}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ProviderStatusCard
            title="ImageKit environment"
            configured={summary.imagekit.configured}
            description="Used when ImageKit is selected. Configure these in Vercel and Railway, not in the dashboard."
            items={[
              ["IMAGEKIT_PUBLIC_KEY", summary.imagekit.publicKeyLast4],
              ["IMAGEKIT_PRIVATE_KEY", summary.imagekit.configured ? "set" : null],
              ["IMAGEKIT_URL_ENDPOINT", summary.imagekit.urlEndpoint],
            ]}
          />

          <ProviderStatusCard
            title="Cloudinary environment"
            configured={summary.cloudinary.configured}
            description="Used when Cloudinary is selected and for provider-specific asset deletion."
            items={[
              ["CLOUDINARY_CLOUD_NAME", summary.cloudinary.cloudName],
              ["CLOUDINARY_API_KEY", summary.cloudinary.apiKeyLast4],
              ["CLOUDINARY_API_SECRET", summary.cloudinary.apiSecretLast4],
            ]}
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
          Active upload target:{" "}
          <span className="font-semibold text-zinc-950">
            {provider === "imagekit" ? "ImageKit" : "Cloudinary"}
          </span>
          . Existing gallery rows continue to load from their saved URL, so
          switching back later only affects new uploads.
        </div>

        <Button onClick={() => void saveStorage()} disabled={loading || saving}>
          <ShieldCheck className="size-4" />
          {saving ? "Saving..." : "Save gallery storage"}
        </Button>
      </CardContent>
    </Card>
  );
}

function StorageProviderCard({
  icon: Icon,
  title,
  description,
  selected,
  disabled,
  onClick,
}: {
  icon: typeof Cloud;
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border p-4 text-left transition",
        selected
          ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
          : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-current/15 bg-current/5">
          <Icon className="size-5" />
        </div>
        {selected ? <Check className="size-5" /> : null}
      </div>
      <div className="mt-4 text-sm font-semibold">{title}</div>
      <div
        className={cn(
          "mt-2 text-xs leading-5",
          selected ? "text-zinc-300" : "text-zinc-500",
        )}
      >
        {description}
      </div>
    </button>
  );
}

function ProviderStatusCard({
  title,
  description,
  configured,
  items,
}: {
  title: string;
  description: string;
  configured: boolean;
  items: Array<[string, string | null]>;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-950">{title}</div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">
            {description}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            configured
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          )}
        >
          {configured ? "Configured" : "Incomplete"}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs"
          >
            <span className="font-medium text-zinc-500">{label}</span>
            <span className="truncate text-right font-semibold text-zinc-950">
              {value ? maskValue(value) : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function maskValue(value: string) {
  return value === "set" || value.startsWith("http") ? value : `••••${value}`;
}
