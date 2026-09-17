import { getLatestAppRelease } from "@/server/releases/github-release";

/**
 * Small version label inside the hero preview chrome.
 *
 * It is rendered through a Suspense boundary so a slow GitHub response can
 * never delay the hero or its LCP screenshot.
 */
export async function HomeReleaseLabel() {
  const release = await getLatestAppRelease();
  // GitHub tag names already include the leading "v" (e.g. "v2.7.3").
  const version = release?.version
    ? `v${release.version.replace(/^v/i, "")}`
    : null;

  return (
    <span className="ml-auto hidden text-[10px] font-medium text-zinc-400 sm:block">
      {version ?? "POSKART"}
    </span>
  );
}
