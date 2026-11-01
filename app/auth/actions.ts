"use server";

import { encodedRedirect } from "@/lib/auth/redirect";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readPassword(formData: FormData) {
  const value = formData.get("password");
  return typeof value === "string" ? value : "";
}

function safeNextPath(value: string, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}

function getSignUpErrorMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("rate limit") || lowerMessage.includes("email rate")) {
    return "Supabase email confirmation sedang rate limited. Tunggu beberapa menit sebelum register lagi, atau gunakan Google sign in / akun testing yang sudah tersedia.";
  }

  return message;
}

export async function signInAction(formData: FormData) {
  const email = readField(formData, "email");
  const password = readPassword(formData);
  const next = safeNextPath(readField(formData, "next"));
  const loginPath = next === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  if (!email || !password) {
    return encodedRedirect(
      "error",
      loginPath,
      "Email and password are required.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      loginPath,
      error.message.toLowerCase().includes("rate limit")
        ? "Too many sign-in attempts. Please wait a few minutes and try again."
        : "Email or password is incorrect.",
    );
  }

  return encodedRedirect("success", next, "Signed in successfully.");
}

export async function signUpAction(formData: FormData) {
  const email = readField(formData, "email");
  const password = readPassword(formData);
  const fullName = readField(formData, "fullName");
  const next = safeNextPath(readField(formData, "next"), "/onboarding");
  const registerPath = next === "/onboarding"
    ? "/register"
    : `/register?next=${encodeURIComponent(next)}`;

  if (!email || !password || !fullName) {
    return encodedRedirect(
      "error",
      registerPath,
      "Name, email, and password are required.",
    );
  }

  if (password.length < 8) {
    return encodedRedirect(
      "error",
      registerPath,
      "Password must be at least 8 characters.",
    );
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return encodedRedirect("error", registerPath, getSignUpErrorMessage(error.message));
  }

  return encodedRedirect(
    "success",
    next === "/onboarding"
      ? "/login"
      : `/login?next=${encodeURIComponent(next)}`,
    "Registration submitted. Check your email to confirm your account before signing in.",
  );
}

export async function signOutAction(formData?: FormData) {
  const supabase = await createClient();
  const next = safeNextPath(readField(formData ?? new FormData(), "next"));
  await supabase.auth.signOut();
  const loginPath = next === "/dashboard"
    ? "/login"
    : `/login?next=${encodeURIComponent(next)}`;
  return encodedRedirect("success", loginPath, "Signed out successfully.");
}

export async function signInWithGoogleAction(formData: FormData) {
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const next = safeNextPath(readField(formData, "next"));
  const loginPath = next === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return encodedRedirect("error", loginPath, error.message);
  }

  if (data.url) {
    return redirect(data.url);
  }

  return encodedRedirect(
    "error",
    loginPath,
    "Google sign in could not be started.",
  );
}
