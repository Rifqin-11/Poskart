import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationSubscriptionAccess } from "@/server/admin/page-access";

export default async function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login?next=/themes/builder/new");
  }
  await requireOrganizationSubscriptionAccess("/themes/builder/new");

  return <>{children}</>;
}
