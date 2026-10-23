// Run: node --test scripts/test-receipt-seo.mjs (no database required).
// Optional server HTML checks: SEO_BASE_URL=http://localhost:3210 node --test scripts/test-receipt-seo.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
function load(path, mocks = {}) {
  const compiled = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const result = { exports: {} };
  new Function("exports", "require", "module", compiled)(result.exports, id => mocks[id] ?? require(id), result);
  return result.exports;
}

const seo = load("lib/seo.ts");
const schema = load("lib/seo-structured-data.ts", { "@/lib/seo": seo });
const { receiptPhotoboothContent: content } = load("features/root/receipt-photobooth/content.ts", { "@/lib/seo": seo });
const { commonQuestions } = load("features/root/home/landing-faq-content.ts");

test("language equivalents have self canonicals and reciprocal hreflang, OG, and Twitter", () => {
  for (const [language, copy] of Object.entries(content)) {
    const metadata = seo.publicPageMetadata({ ...copy, language, languages: seo.receiptPageLanguages });
    assert.equal(metadata.alternates.canonical, copy.path);
    assert.deepEqual(metadata.alternates.languages, seo.receiptPageLanguages);
    assert.equal(metadata.openGraph.url, copy.path);
    assert.equal(metadata.openGraph.locale, language === "en" ? "en_US" : "id_ID");
    assert.equal(metadata.openGraph.title, copy.title);
    assert.equal(metadata.twitter.description, copy.description);
    assert.equal(copy.languageHref, content[copy.otherLanguage].path);
  }
});

test("schema uses visible FAQs, accurate trial restrictions, and no fabricated ratings", () => {
  const pages = [{ path: "/", title: seo.HOME_TITLE, description: seo.HOME_DESCRIPTION, language: "id", faqs: commonQuestions },
    ...Object.entries(content).map(([language, copy]) => ({ ...copy, language }))];
  for (const page of pages) {
    const data = schema.productPageStructuredData(page);
    const graph = data["@graph"];
    const app = graph.find(item => item["@type"] === "SoftwareApplication");
    assert.equal(app.operatingSystem, "Android");
    assert.equal(app.offers.price, "0");
    assert.equal(app.offers.eligibleDuration.value, 14);
    assert.equal(app.offers.eligibleDuration.unitCode, "DAY");
    assert.match(app.offers.description, /1 device/);
    assert.equal(app.offers.priceCurrency, "IDR");
    assert.ok(!("aggregateRating" in app));
    assert.ok(!("review" in app));
    const faq = graph.find(item => item["@type"] === "FAQPage");
    assert.deepEqual(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text]), page.faqs.map(q => [q.question, q.answer]));
    const web = graph.find(item => item["@type"] === "WebPage");
    assert.equal(web.url, new URL(page.path, seo.SITE_URL).href);
    assert.equal(web.inLanguage, page.language);
    const breadcrumbs = graph.find(item => item["@type"] === "BreadcrumbList");
    assert.equal(Boolean(breadcrumbs), page.path !== "/");
    assert.deepEqual(JSON.parse(schema.serializeJsonLd(data)), data);
  }
});

test("JSON-LD serialization cannot close the script element", () => {
  const input = { text: '</script><script>alert("x")</script>' };
  const serialized = schema.serializeJsonLd(input);
  assert.ok(!serialized.includes("<"));
  assert.deepEqual(JSON.parse(serialized), input);
});

test("sitemap includes both public pages, matching alternates, and excludes private routes", () => {
  const sitemap = load("app/sitemap.ts", { "@/lib/seo": seo }).default();
  for (const path of Object.values(seo.receiptPageLanguages)) {
    const entry = sitemap.find(item => item.url === `${seo.SITE_URL}${path}`);
    assert.ok(entry);
    assert.deepEqual(entry.alternates.languages, Object.fromEntries(
      Object.entries(seo.receiptPageLanguages).map(([language, route]) => [language, `${seo.SITE_URL}${route}`]),
    ));
    assert.ok(!("lastModified" in entry));
  }
  for (const entry of sitemap) assert.doesNotMatch(entry.url, /\/(dashboard|register|login|checkout|trial|g|q)(\/|$)/);
});

test("apex redirect is permanent, path-preserving, and limited to the exact host", async () => {
  const config = load("next.config.ts").default;
  const [rule] = await config.redirects();
  assert.equal(rule.permanent, true);
  assert.equal(rule.source, "/:path*");
  assert.equal(rule.destination, `${seo.SITE_URL}/:path*`);
  const host = new RegExp(`^(?:${rule.has[0].value})$`);
  assert.ok(host.test("poskart.my.id"));
  for (const name of ["www.poskart.my.id", "localhost", "preview.vercel.app", "poskartXmyYid", "evil.poskart.my.id"]) {
    assert.ok(!host.test(name));
  }
});

test("SEO pages and crawl endpoints bypass session lookups, not protected routes or server actions", async () => {
  let lookups = 0;
  const { updateSession } = load("lib/supabase/middleware.ts", {
    "@supabase/ssr": { createServerClient: () => ({ auth: { getClaims: async () => { lookups++; return { data: null }; } } }) },
    "next/server": { NextResponse: { next: () => ({ status: 200 }), redirect: url => ({ status: 307, url }) } },
    "@/lib/auth/admin": {}, "@/lib/organization-features": {},
  });
  const request = (path, action = false) => {
    const url = new URL(path, "https://www.poskart.my.id");
    url.clone = () => new URL(url);
    return { nextUrl: url, headers: new Headers(action ? { "next-action": "test" } : {}), cookies: { getAll: () => [] } };
  };
  for (const path of ["/", "/robots.txt", "/sitemap.xml", ...Object.values(seo.receiptPageLanguages)]) {
    assert.equal((await updateSession(request(path))).status, 200);
  }
  assert.equal(lookups, 0);
  assert.equal((await updateSession(request("/dashboard"))).status, 307);
  assert.equal(lookups, 1);
  await updateSession(request("/receipt-photobooth-app", true));
  assert.equal(lookups, 2);
});

test("home keeps a visible keyword H1 and footer links make both pages discoverable", () => {
  assert.match(source("features/root/home/hero-section.tsx"), /<h1[^>]*>Receipt Photobooth/);
  assert.match(source("features/root/home/hero-section.tsx"), /Momen kecil\. Kenangan yang bisa dipegang\./);
  for (const path of Object.values(seo.receiptPageLanguages)) {
    assert.ok(source("features/root/shell/public-site-shell.tsx").includes(`href="${path}"`));
  }
  assert.match(source("features/root/home/landing-sections.tsx"), /import \{ commonQuestions \}/);
  assert.match(source("app/structured-data.tsx"), /faqs: commonQuestions/);
});

test("cached promotions match the no-promo server snapshot until a pricing boundary hydrates", () => {
  const now = Date.now();
  const promo = { starts_at: new Date(now - 60_000).toISOString(), ends_at: new Date(now + 60_000).toISOString() };
  let hydrated = false;
  let error = false;
  let cachedPromos = [promo];
  const { usePublicPromotions } = load("features/billing/pricing/use-public-promotions.ts", {
    react: {
      useState: init => [init(), () => {}], useEffect: () => {},
      useSyncExternalStore: (_subscribe, client, server) => hydrated ? client() : server(),
    },
    "@tanstack/react-query": { useQuery: () => ({ data: cachedPromos, isError: error }) },
    "@/server/subscription/public-promotion-actions": {},
  });
  assert.deepEqual(usePublicPromotions(), []);
  hydrated = true;
  assert.deepEqual(usePublicPromotions(), [promo]);
  error = true;
  assert.deepEqual(usePublicPromotions(), []);
  error = false;
  cachedPromos = [{ ...promo, ends_at: new Date(now - 60_000).toISOString() }];
  assert.deepEqual(usePublicPromotions(), []);
});

test("live HTTP: metadata, complete content and schema are present without JavaScript", { skip: !process.env.SEO_BASE_URL }, async () => {
  const base = process.env.SEO_BASE_URL;
  for (const [language, copy] of Object.entries(content)) {
    const response = await fetch(new URL(copy.path, base));
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`<title>${copy.title.replaceAll("&", "&amp;")}</title>`));
    assert.ok(html.includes(`href="${seo.SITE_URL}${copy.path}"`));
    assert.ok(html.includes(`hrefLang="${copy.otherLanguage}"`) || html.includes(`hreflang="${copy.otherLanguage}"`));
    assert.match(html, new RegExp(`<main[^>]*lang="${language}"`));
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1);
    assert.ok(html.includes(copy.overview));
    assert.ok(html.includes(copy.faqs[0].answer));
    assert.ok(!/<meta[^>]+name="robots"[^>]+noindex/.test(html));
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length > 0);
    const graph = scripts.map(([, json]) => JSON.parse(json)).flatMap(data => data["@graph"] ?? []);
    assert.equal(graph.find(item => item["@type"] === "FAQPage").mainEntity.length, copy.faqs.length);
  }
  const sitemap = await (await fetch(new URL("/sitemap.xml", base))).text();
  assert.ok(sitemap.includes("xhtml:link"));
  for (const path of Object.values(seo.receiptPageLanguages)) assert.ok(sitemap.includes(`${seo.SITE_URL}${path}`));
});
