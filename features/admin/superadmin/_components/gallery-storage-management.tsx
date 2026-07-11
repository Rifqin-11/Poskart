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
    publicKey: string;
    urlEndpoint: string;
    hasPrivateKey: boolean;
    privateKeyLast4: string | null;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    hasApiSecret: boolean;
    apiSecretLast4: string | null;
    usingEnvFallback: boolean;
  };
};

const EMPTY_SUMMARY: GalleryStorageSummary = {
  provider: "cloudinary",
  imagekit: {
    publicKey: "",
    urlEndpoint: "",
    hasPrivateKey: false,
    privateKeyLast4: null,
  },
  cloudinary: {
    cloudName: "",
    apiKey: "",
    hasApiSecret: false,
    apiSecretLast4: null,
    usingEnvFallback: false,
  },
};

export function GalleryStorageManagement() {
  const [summary, setSummary] = useState<GalleryStorageSummary>(EMPTY_SUMMARY);
  const [provider, setProvider] =
    useState<GalleryStorageProvider>("cloudinary");
  const [imagekit, setImagekit] = useState({
    publicKey: "",
    privateKey: "",
    urlEndpoint: "",
  });
  const [cloudinary, setCloudinary] = useState({
    cloudName: "",
    apiKey: "",
    apiSecret: "",
  });
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
          setImagekit({
            publicKey: payload.imagekit.publicKey,
            privateKey: "",
            urlEndpoint: payload.imagekit.urlEndpoint,
          });
          setCloudinary({
            cloudName: payload.cloudinary.cloudName,
            apiKey: payload.cloudinary.apiKey,
            apiSecret: "",
          });
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
          imagekit,
          cloudinary,
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
        setImagekit((draft) => ({ ...draft, privateKey: "" }));
        setCloudinary((draft) => ({ ...draft, apiSecret: "" }));
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
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-950">
              ImageKit credentials
            </div>
            <div className="mt-1 text-xs leading-5 text-zinc-500">
              Required when ImageKit is the active provider.
            </div>
            <div className="mt-4 grid gap-3">
              <Field
                label="Public key"
                value={imagekit.publicKey}
                placeholder="public_xxxxx"
                onChange={(value) =>
                  setImagekit((draft) => ({ ...draft, publicKey: value }))
                }
              />
              <Field
                label="Private key"
                type="password"
                value={imagekit.privateKey}
                placeholder={
                  summary.imagekit.hasPrivateKey
                    ? `Stored ••••${summary.imagekit.privateKeyLast4 ?? ""}`
                    : "private_xxxxx"
                }
                onChange={(value) =>
                  setImagekit((draft) => ({ ...draft, privateKey: value }))
                }
              />
              <Field
                label="URL endpoint"
                value={imagekit.urlEndpoint}
                placeholder="https://ik.imagekit.io/your_id"
                onChange={(value) =>
                  setImagekit((draft) => ({ ...draft, urlEndpoint: value }))
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-950">
              Cloudinary credentials
            </div>
            <div className="mt-1 text-xs leading-5 text-zinc-500">
              Required when Cloudinary is the active provider. Env fallback can
              keep legacy setup working.
            </div>
            <div className="mt-4 grid gap-3">
              <Field
                label="Cloud name"
                value={cloudinary.cloudName}
                placeholder="your-cloud-name"
                onChange={(value) =>
                  setCloudinary((draft) => ({ ...draft, cloudName: value }))
                }
              />
              <Field
                label="API key"
                value={cloudinary.apiKey}
                placeholder="1234567890"
                onChange={(value) =>
                  setCloudinary((draft) => ({ ...draft, apiKey: value }))
                }
              />
              <Field
                label="API secret"
                type="password"
                value={cloudinary.apiSecret}
                placeholder={
                  summary.cloudinary.hasApiSecret
                    ? `Stored ••••${summary.cloudinary.apiSecretLast4 ?? ""}`
                    : "cloudinary-api-secret"
                }
                onChange={(value) =>
                  setCloudinary((draft) => ({ ...draft, apiSecret: value }))
                }
              />
            </div>
          </div>
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

function Field({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "password";
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
      />
    </label>
  );
}
