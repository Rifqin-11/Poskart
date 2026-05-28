import { redirect } from "next/navigation";
import { AuthForm } from "@/features/root/auth/auth-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; next?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  return <AuthForm mode="login" error={params.error} success={params.success} next={params.next} />;
}
