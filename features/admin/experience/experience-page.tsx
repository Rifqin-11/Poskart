"use client";

import { PageHeader } from "@/features/admin/_components/page-header";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { GalleryExperience } from "./gallery-experience";

export function ExperiencePage() {
  const { t } = useI18n();

  return (
    <>
      <PageHeader title={t("nav.experience")} description={t("experience.description")} />
      <div className="w-full">
        <GalleryExperience />
      </div>
    </>
  );
}
