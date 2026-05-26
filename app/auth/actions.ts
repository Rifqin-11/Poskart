"use server";

import { encodedRedirect } from "@/lib/auth/redirect";
import { getSiteUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeNextPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboarding";
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
  const password = readField(formData, "password");
  const next = safeNextPath(readField(formData, "next"));
  const loginPath = next === "/onboarding" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

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
    return encodedRedirect("error", loginPath, error.message);
  }

  return encodedRedirect("success", next, "Signed in successfully.");
}

export async function signUpAction(formData: FormData) {
  const email = readField(formData, "email");
  const password = readField(formData, "password");
  const fullName = readField(formData, "fullName");

  if (!email || !password || !fullName) {
    return encodedRedirect(
      "error",
      "/register",
      "Name, email, and password are required.",
    );
  }

  if (password.length < 8) {
    return encodedRedirect(
      "error",
      "/register",
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
      emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return encodedRedirect("error", "/register", getSignUpErrorMessage(error.message));
  }

  return encodedRedirect(
    "success",
    "/login",
    "Registration submitted. Check your email to confirm your account before signing in.",
  );
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return encodedRedirect("success", "/login", "Signed out successfully.");
}

export async function signInWithGoogleAction(formData: FormData) {
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const next = safeNextPath(readField(formData, "next"));
  const loginPath = next === "/onboarding" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
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
