"use server";

import { encodedRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signInAction(formData: FormData) {
  const email = readField(formData, "email");
  const password = readField(formData, "password");

  if (!email || !password) {
    return encodedRedirect("error", "/login", "Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/login", error.message);
  }

  return encodedRedirect("success", "/dashboard", "Signed in successfully.");
}

export async function signUpAction(formData: FormData) {
  const email = readField(formData, "email");
  const password = readField(formData, "password");
  const fullName = readField(formData, "fullName");

  if (!email || !password || !fullName) {
    return encodedRedirect("error", "/register", "Name, email, and password are required.");
  }

  if (password.length < 8) {
    return encodedRedirect("error", "/register", "Password must be at least 8 characters.");
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return encodedRedirect("error", "/register", error.message);
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

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return encodedRedirect("error", "/login", error.message);
  }

  if (data.url) {
    return redirect(data.url);
  }

  return encodedRedirect("error", "/login", "Google sign in could not be started.");
}
