import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildKioskBootstrap,
  KioskApiError,
  resolveKioskContext,
} from "@/lib/kiosk/server";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

const TICKET_TTL_MS = 90_000;
const CALLBACK_URI = "poskart://auth/callback";

function getServerCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !publishableKey || !serviceRoleKey) {
    throw new KioskApiError(
      "Kiosk Google authentication is not configured.",
      500,
      "KIOSK_GOOGLE_AUTH_NOT_CONFIGURED",
    );
  }

  return { url, publishableKey, serviceRoleKey };
}

function getEncryptionKey() {
  const { serviceRoleKey } = getServerCredentials();
  return createHash("sha256")
    .update(`poskart-kiosk-oauth:${serviceRoleKey}`)
    .digest();
}

function hashTicket(ticket: string) {
  return createHash("sha256").update(ticket).digest("hex");
}

function encryptPayload(payload: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted]
    .map((value) => value.toString("base64url"))
    .join(".");
}

function decryptPayload(payload: string) {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new KioskApiError(
      "The Google login ticket is invalid.",
      401,
      "KIOSK_GOOGLE_TICKET_INVALID",
    );
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as unknown;
  } catch {
    throw new KioskApiError(
      "The Google login ticket could not be verified.",
      401,
      "KIOSK_GOOGLE_TICKET_INVALID",
    );
  }
}

export function createKioskOAuthClient(request: NextRequest) {
  const { url, publishableKey } = getServerCredentials();
  const pendingCookies: PendingCookie[] = [];
  const client = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        pendingCookies.push(...cookies);
      },
    },
  });

  return {
    client,
    applyCookies(response: NextResponse, clear = false) {
      for (const cookie of pendingCookies) {
        response.cookies.set(
          cookie.name,
          clear ? "" : cookie.value,
          clear
            ? { ...cookie.options, expires: new Date(0), maxAge: 0 }
            : cookie.options,
        );
      }
      return response;
    },
  };
}

function createServiceClient() {
  const { url, serviceRoleKey } = getServerCredentials();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function issueKioskOAuthTicket(input: {
  userId: string;
  deviceId: string;
  sessionPayload: unknown;
}) {
  const ticket = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TICKET_TTL_MS);
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("kiosk_oauth_tickets").insert({
    ticket_hash: hashTicket(ticket),
    user_id: input.userId,
    device_id: input.deviceId,
    session_payload: encryptPayload(input.sessionPayload),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new KioskApiError(
      `Unable to create Google login ticket: ${error.message}`,
      500,
      "KIOSK_GOOGLE_TICKET_CREATE_FAILED",
    );
  }

  void serviceClient
    .from("kiosk_oauth_tickets")
    .delete()
    .lt("expires_at", new Date(Date.now() - 86_400_000).toISOString());

  return ticket;
}

export async function consumeKioskOAuthTicket(ticket: string) {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("kiosk_oauth_tickets")
    .update({ consumed_at: new Date().toISOString() })
    .eq("ticket_hash", hashTicket(ticket))
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("session_payload")
    .maybeSingle();

  if (error) {
    throw new KioskApiError(
      `Unable to exchange Google login ticket: ${error.message}`,
      500,
      "KIOSK_GOOGLE_TICKET_EXCHANGE_FAILED",
    );
  }

  if (!data?.session_payload) {
    throw new KioskApiError(
      "The Google login ticket is invalid, expired, or already used.",
      401,
      "KIOSK_GOOGLE_TICKET_INVALID",
    );
  }

  return decryptPayload(data.session_payload);
}

export function kioskCallbackUri(params: Record<string, string>) {
  const url = new URL(CALLBACK_URI);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export function kioskCallbackPage(callbackUri: string, success: boolean) {
  const encodedUri = JSON.stringify(callbackUri).replaceAll("<", "\\u003c");
  const title = success ? "Login berhasil" : "Login gagal";
  const message = success
    ? "Kembali ke aplikasi POSKART untuk melanjutkan."
    : "Kembali ke aplikasi POSKART dan coba lagi.";

  return new NextResponse(
    `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} - POSKART</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8f5ef; color: #151515; font-family: system-ui, sans-serif; }
      main { width: min(420px, calc(100% - 40px)); padding: 32px; border: 1px solid #ddd8cf; border-radius: 24px; background: white; text-align: center; box-shadow: 0 18px 50px rgba(0,0,0,.08); }
      a { display: inline-block; margin-top: 20px; padding: 12px 18px; border-radius: 12px; background: #111; color: white; text-decoration: none; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${message}</p>
      <a id="open-app" href="${callbackUri}">Buka aplikasi POSKART</a>
    </main>
    <script>window.location.replace(${encodedUri});</script>
  </body>
</html>`,
    {
      status: success ? 200 : 400,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function completeKioskGoogleCallback(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const providerError =
    request.nextUrl.searchParams.get("error_description") ??
    request.nextUrl.searchParams.get("error");
  const hardwareId = request.nextUrl.searchParams.get("hardwareId")?.trim() ?? "";
  const oauth = createKioskOAuthClient(request);

  try {
    if (providerError) throw new Error(providerError);
    if (!code) throw new Error("Google tidak mengembalikan authorization code.");

    const { data, error } = await oauth.client.auth.exchangeCodeForSession(code);
    if (error || !data.session) {
      throw new Error(error?.message ?? "Sesi Google tidak dapat dibuat.");
    }

    const context = await resolveKioskContext(data.session.access_token);
    const bootstrap = await buildKioskBootstrap(
      context,
      null,                                   // no explicit deviceId
      hardwareId || null,                     // use hardwareId for UPSERT
      context.user.email ?? "unknown",        // device name fallback
    );
    const ticket = await issueKioskOAuthTicket({
      userId: context.user.id,
      deviceId: bootstrap.registeredDeviceId ?? hardwareId,
      sessionPayload: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at
          ? new Date(data.session.expires_at * 1000).toISOString()
          : null,
        ...bootstrap,
      },
    });
    const response = kioskCallbackPage(
      kioskCallbackUri({ code: ticket }),
      true,
    );
    return oauth.applyCookies(response, true);
  } catch (error) {
    const response = kioskCallbackPage(
      kioskCallbackUri({
        error:
          error instanceof Error ? error.message : "Google login gagal.",
      }),
      false,
    );
    return oauth.applyCookies(response, true);
  }
}
