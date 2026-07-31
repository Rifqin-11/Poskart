import {
  ArrowDown,
  ArrowUpRight,
  Camera,
  Frame,
  ImageIcon,
  Images,
  MonitorPlay,
  Palette,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeThumbnail } from "@/features/admin/themes/theme-thumbnail";
import { PublicFooter, PublicHeader } from "@/features/root/shell/public-site-shell";
import { FrameShowcasePreview } from "@/features/public/showcase/frame-showcase-preview";
import { businessProfile } from "@/lib/constants/business";
import type {
  PublicShowcaseCustomItem,
  PublicShowcaseTemplate,
  PublicTemplateShowcase,
} from "@/server/public/template-showcase-service";

function groupTemplates(templates: PublicShowcaseTemplate[]) {
  const groups = new Map<string, PublicShowcaseTemplate[]>();
  for (const template of templates) {
    const category = template.categoryName || "Pilihan frame";
    groups.set(category, [...(groups.get(category) ?? []), template]);
  }
  return [...groups.entries()];
}

function groupCustomItems(items: PublicShowcaseCustomItem[]) {
  const groups = new Map<string, PublicShowcaseCustomItem[]>();
  for (const item of items) {
    groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  }
  return [...groups.entries()];
}

export function TemplateShowcasePage({
  showcase,
}: {
  showcase: PublicTemplateShowcase;
}) {
  const featuredTemplate = showcase.templates[0] ?? null;
  const featuredTheme = showcase.themes[0] ?? null;
  const featuredCustomItem = showcase.customItems[0] ?? null;
  const templateGroups = groupTemplates(showcase.templates);
  const customGroups = groupCustomItems(showcase.customItems);
  const primaryAnchor = featuredTemplate
    ? "#frames"
    : featuredTheme
      ? "#themes"
      : "#custom";

  return (
    <main className="min-h-[100dvh] overflow-clip bg-[#f7f9ff] text-zinc-950">
      <PublicHeader variant="landing" />

      <section className="hero-gradient-poskart border-b border-blue-100 px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32 lg:px-12">
        <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-[90rem] items-center gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00357B]">
              Showcase by {showcase.organizationName}
            </p>
            <h1 className="mt-5 text-wrap-balance text-4xl font-black uppercase leading-[0.9] tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              {showcase.name}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">
              {showcase.description ||
                "Lihat pilihan frame, tampilan photobooth, dan referensi visual yang dapat disesuaikan untuk cafe, acara, atau kampanye Anda."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {featuredTemplate || featuredTheme || featuredCustomItem ? (
                <a
                  href={primaryAnchor}
                  className={buttonVariants({
                    size: "lg",
                    className:
                      "h-12 rounded-full bg-[#00357B] px-6 text-white hover:bg-[#014EB4]",
                  })}
                >
                  Lihat koleksi
                  <ArrowDown className="size-4" />
                </a>
              ) : null}
            </div>
            <div className="mt-10 flex flex-wrap gap-6 border-t border-blue-100 pt-6 text-sm text-zinc-500">
              <span className="flex items-center gap-2">
                <Frame className="size-4 text-[#00357B]" />
                {showcase.templates.length} pilihan frame
              </span>
              <span className="flex items-center gap-2">
                <Palette className="size-4 text-[#00357B]" />
                {showcase.themes.length} pilihan theme
              </span>
              <span className="flex items-center gap-2">
                <ImageIcon className="size-4 text-[#00357B]" />
                {customGroups.length} kategori custom
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[36px] border border-blue-100 bg-white/35 sm:-inset-6"
            />
            <div className="relative overflow-hidden rounded-[32px] border border-blue-100 bg-white p-4 shadow-[0_30px_80px_rgba(0,53,123,0.14)] sm:p-6">
              <div className="relative grid h-[430px] place-items-center overflow-hidden rounded-[24px] bg-[#eef3ff] p-7 sm:h-[500px] sm:p-10 lg:h-[540px]">
                {featuredTemplate ? (
                  <FrameShowcasePreview
                    name={featuredTemplate.name}
                    accentColor={featuredTemplate.accentColor}
                    frameImageUrl={featuredTemplate.frameImageUrl}
                    frameLayout={featuredTemplate.frameLayout}
                  />
                ) : featuredTheme ? (
                  <ThemeThumbnail
                    schema={featuredTheme.schema}
                    className="max-w-2xl shadow-[0_24px_55px_rgba(15,23,42,0.16)]"
                  />
                ) : featuredCustomItem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featuredCustomItem.imageUrl}
                    alt={featuredCustomItem.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="max-w-sm text-center">
                    <Images className="mx-auto size-10 text-blue-200" />
                    <p className="mt-4 text-sm font-semibold text-zinc-700">
                      Showcase sedang disiapkan
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Koleksi visual akan segera tersedia pada halaman ini.
                    </p>
                  </div>
                )}
              </div>
              {featuredTemplate || featuredTheme || featuredCustomItem ? (
                <div className="flex items-center justify-between gap-4 px-1 pb-1 pt-5">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">
                      {featuredTemplate?.name ??
                        featuredTheme?.name ??
                        featuredCustomItem?.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {featuredTemplate?.tagline ||
                        (featuredTemplate
                          ? "Frame pilihan POSKART"
                          : featuredTheme
                            ? "Theme photobooth POSKART"
                            : featuredCustomItem?.description ||
                              "Referensi visual kolaborasi")}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#00357B]">
                    {featuredTemplate
                      ? `${featuredTemplate.photoCount} foto`
                      : featuredTheme
                        ? "Theme"
                        : featuredCustomItem?.category}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {templateGroups.length ? (
        <section id="frames" className="scroll-mt-20 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-[90rem]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#00357B]">Frame collection</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Pilih suasana yang paling cocok.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Setiap frame dapat dikembangkan kembali untuk warna brand, logo,
                pesan kampanye, dan kebutuhan acara cafe.
              </p>
            </div>

            <div className="mt-14 space-y-16">
              {templateGroups.map(([category, templates]) => (
                <section key={category}>
                  <div className="mb-6 flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <span className="text-sm text-zinc-400">{templates.length} frame</span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {templates.map((template) => (
                      <article
                        key={template.id}
                        className="group overflow-hidden rounded-[24px] border border-zinc-200 bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.09)]"
                      >
                        <div
                          className="grid h-[360px] place-items-center border-b border-zinc-100 p-7 sm:h-[400px]"
                          style={{ backgroundColor: `${template.accentColor}10` }}
                        >
                          <FrameShowcasePreview
                            name={template.name}
                            accentColor={template.accentColor}
                            frameImageUrl={template.frameImageUrl}
                            frameLayout={template.frameLayout}
                          />
                        </div>
                        <div className="p-5">
                          <h4 className="truncate font-semibold text-zinc-950">
                            {template.name}
                          </h4>
                          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-500">
                            {template.tagline ||
                              "Frame photobooth yang siap disesuaikan untuk kolaborasi."}
                          </p>
                          <div className="mt-5 flex items-center gap-2 text-xs font-medium text-zinc-500">
                            <Camera className="size-3.5" />
                            {template.photoCount} slot foto
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {showcase.themes.length ? (
        <section id="themes" className="scroll-mt-20 border-y border-blue-100 bg-[#f7f9ff] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-[90rem]">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
              <div className="max-w-lg lg:sticky lg:top-28 lg:self-start">
                <p className="text-sm font-semibold text-[#00357B]">Theme collection</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Bukan hanya frame, seluruh pengalaman dapat disesuaikan.
                </h2>
                <p className="mt-4 text-sm leading-7 text-zinc-600 sm:text-base">
                  Theme mengatur tampilan layar photobooth dari halaman pembuka
                  sampai hasil foto, sehingga pengalaman pengunjung tetap selaras
                  dengan identitas brand.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {showcase.themes.map((theme, index) => (
                  <article
                    key={theme.id}
                    className={index === 0 ? "sm:col-span-2" : undefined}
                  >
                    <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-white p-4 shadow-[0_18px_45px_rgba(0,53,123,0.08)] sm:p-5">
                      <ThemeThumbnail
                        schema={theme.schema}
                        className="rounded-[18px] shadow-sm"
                      />
                      <div className="flex items-center gap-3 px-1 pb-1 pt-4">
                        <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#00357B]">
                          <MonitorPlay className="size-4" />
                        </span>
                        <div>
                          <h3 className="font-semibold">{theme.name}</h3>
                          <p className="mt-0.5 text-xs text-zinc-500">Kiosk visual theme</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {customGroups.length ? (
        <section
          id="custom"
          className="scroll-mt-20 border-t border-blue-100 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="mx-auto max-w-[90rem]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#00357B]">
                Custom collection
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Detail lain yang dapat disiapkan untuk kolaborasi.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Referensi berikut membantu cafe melihat pilihan setup, branding,
                hasil cetak, dan kebutuhan khusus di luar frame serta theme.
              </p>
            </div>

            <div className="mt-14 space-y-16">
              {customGroups.map(([category, items]) => (
                <section key={category}>
                  <div className="mb-6 flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <span className="text-sm text-zinc-400">
                      {items.length} referensi
                    </span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        className="group overflow-hidden rounded-[24px] border border-zinc-200 bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.09)]"
                      >
                        <div className="aspect-[4/3] overflow-hidden border-b border-zinc-100 bg-zinc-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                          />
                        </div>
                        <div className="p-5">
                          <h4 className="font-semibold text-zinc-950">
                            {item.title}
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-zinc-500">
                            {item.description ||
                              "Referensi visual yang dapat disesuaikan dengan kebutuhan partner."}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {!showcase.templates.length &&
      !showcase.themes.length &&
      !showcase.customItems.length ? (
        <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto grid min-h-72 max-w-[90rem] place-items-center rounded-[28px] border border-dashed border-blue-100 bg-[#f7f9ff] px-6 text-center">
            <div className="max-w-md">
              <Images className="mx-auto size-10 text-blue-200" />
              <h2 className="mt-4 font-semibold">Koleksi sedang disiapkan</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Tim POSKART sedang menyiapkan pilihan visual untuk showcase ini.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="cta-gradient-poskart px-5 py-16 text-white sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Punya konsep khusus untuk cafe Anda?
            </h2>
            <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">
              Kirim identitas brand atau tema acara. Tim POSKART akan membantu
              menyiapkan arah visual yang sesuai.
            </p>
          </div>
          <a
            href={`${businessProfile.whatsappUrl}?text=${encodeURIComponent(
              `Halo POSKART, saya ingin mendiskusikan kolaborasi photobooth dengan referensi showcase ${showcase.name} dari ${showcase.organizationName}.`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({
              size: "lg",
              className:
                "h-12 rounded-full bg-white px-6 text-[#00357B] hover:bg-blue-50",
            })}
          >
            Diskusikan kolaborasi
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </section>

      <PublicFooter className="border-t border-blue-100" />
    </main>
  );
}
