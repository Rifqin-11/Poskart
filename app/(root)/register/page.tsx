import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/root/auth/auth-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Daftar | POSKART",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  return <AuthForm mode="register" error={params.error} success={params.success} />;
}
