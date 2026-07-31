import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateShowcasePage } from "@/features/public/showcase/template-showcase-page";
import { getPublicTemplateShowcase } from "@/server/public/template-showcase-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const showcase = await getPublicTemplateShowcase(token);

  if (!showcase) {
    return { title: "Frame Showcase | POSKART" };
  }

  return {
    title: `${showcase.name} | POSKART`,
    description:
      showcase.description ||
      "Lihat pilihan frame dan theme photobooth POSKART untuk kolaborasi cafe, acara, dan kampanye brand.",
    robots: { index: false, follow: false },
  };
}

export default async function PublicTemplateShowcasePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const showcase = await getPublicTemplateShowcase(token);
  if (!showcase) notFound();

  return <TemplateShowcasePage showcase={showcase} />;
}
