import { ArrowDown, ArrowUpRight, Camera, Images } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/features/root/shell/public-site-shell";
import { FrameShowcasePreview } from "@/features/public/showcase/frame-showcase-preview";
import { businessProfile } from "@/lib/constants/business";
import type {
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

export function TemplateShowcasePage({
  showcase,
}: {
  showcase: PublicTemplateShowcase;
}) {
  const featuredTemplate = showcase.templates[0] ?? null;
  const templateGroups = groupTemplates(showcase.templates);

  return (
    <main className="min-h-[100dvh] overflow-clip bg-[#f7f9ff] text-zinc-950">
      <PublicHeader variant="landing" />

      <section className="hero-gradient-poskart border-b border-blue-100 px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32 lg:px-12">
        <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-[90rem] items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00357B]">
              Frame showcase by {showcase.organizationName}
            </p>
            <h1 className="mt-5 text-4xl font-black uppercase leading-[0.9] tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              Contoh frame untuk kolaborasi photobooth.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">
              Lihat desain POSKART yang dapat disesuaikan dengan identitas cafe,
              acara, atau kampanye Anda.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#frames"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "h-12 rounded-full bg-[#00357B] px-6 text-white hover:bg-[#014EB4]",
                })}
              >
                Lihat pilihan frame
                <ArrowDown className="size-4" />
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[36px] border border-blue-100 bg-white/35 sm:-inset-6"
            />
            <div className="relative overflow-hidden rounded-[32px] border border-blue-100 bg-white p-4 shadow-[0_30px_80px_rgba(0,53,123,0.14)] sm:p-6">
              <div className="grid h-[430px] place-items-center rounded-[24px] bg-[#eef3ff] p-7 sm:h-[500px] sm:p-10 lg:h-[540px]">
                {featuredTemplate ? (
                  <FrameShowcasePreview
                    name={featuredTemplate.name}
                    accentColor={featuredTemplate.accentColor}
                    frameImageUrl={featuredTemplate.frameImageUrl}
                    frameLayout={featuredTemplate.frameLayout}
                  />
                ) : (
                  <div className="max-w-sm text-center">
                    <Images className="mx-auto size-10 text-blue-200" />
                    <p className="mt-4 text-sm font-semibold text-zinc-700">
                      Showcase sedang disiapkan
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Pilihan frame akan tampil setelah ditambahkan dari Template
                      Management.
                    </p>
                  </div>
                )}
              </div>
              {featuredTemplate ? (
                <div className="flex items-center justify-between gap-4 px-1 pb-1 pt-5">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">
                      {featuredTemplate.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {featuredTemplate.tagline || "Frame pilihan POSKART"}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#00357B]">
                    {featuredTemplate.photoCount} foto
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section id="frames" className="scroll-mt-20 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[90rem]">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Pilih suasana yang paling cocok.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
              Setiap frame dapat dikembangkan kembali untuk warna brand, logo,
              pesan kampanye, dan kebutuhan acara cafe.
            </p>
          </div>

          {templateGroups.length ? (
            <div className="mt-14 space-y-16">
              {templateGroups.map(([category, templates]) => (
                <section key={category}>
                  <div className="mb-6 flex items-end justify-between gap-4 border-b border-zinc-200 pb-4">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <span className="text-sm text-zinc-400">
                      {templates.length} frame
                    </span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {templates.map((template) => (
                      <article
                        key={template.id}
                        className="group overflow-hidden rounded-[24px] border border-zinc-200 bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.09)]"
                      >
                        <div
                          className="grid h-[360px] place-items-center border-b border-zinc-100 p-7 sm:h-[400px]"
                          style={{
                            backgroundColor: `${template.accentColor}10`,
                          }}
                        >
                          <FrameShowcasePreview
                            name={template.name}
                            accentColor={template.accentColor}
                            frameImageUrl={template.frameImageUrl}
                            frameLayout={template.frameLayout}
                          />
                        </div>
                        <div className="p-5">
                          <div className="min-w-0">
                            <h4 className="truncate font-semibold text-zinc-950">
                              {template.name}
                            </h4>
                            <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-500">
                              {template.tagline ||
                                "Frame photobooth yang siap disesuaikan untuk kolaborasi."}
                            </p>
                          </div>
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
          ) : (
            <div className="mt-12 grid min-h-72 place-items-center rounded-[28px] border border-dashed border-blue-100 bg-[#f7f9ff] px-6 text-center">
              <div className="max-w-md">
                <Images className="mx-auto size-10 text-blue-200" />
                <h3 className="mt-4 font-semibold">Belum ada frame publik</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Tim POSKART sedang menyiapkan pilihan frame yang dapat dilihat
                  pada halaman ini.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="cta-gradient-poskart px-5 py-16 text-white sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Punya konsep khusus untuk cafe Anda?
            </h2>
            <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">
              Kirim identitas brand atau tema acara. Tim POSKART akan membantu
              menyiapkan arah frame yang sesuai.
            </p>
          </div>
          <a
            href={`${businessProfile.whatsappUrl}?text=${encodeURIComponent(
              `Halo POSKART, saya ingin mendiskusikan kolaborasi photobooth dengan referensi frame dari showcase ${showcase.organizationName}.`,
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
