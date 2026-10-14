"use client";

import { PageHeader } from "@/features/admin/_components/page-header";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { GalleryExperience } from "./gallery-experience";

export function ExperiencePage() {
  const { t } = useI18n();

  return (
    <>
      <PageHeader title={t("nav.experience")} description={t("experience.description")} />
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <GalleryExperience />
      </div>
    </>
  );
}
