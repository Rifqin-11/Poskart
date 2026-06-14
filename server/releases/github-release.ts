import "server-only";

const RELEASES_API_URL =
  "https://api.github.com/repos/Rifqin-11/poskart-releases/releases/latest";
export const RELEASES_PAGE_URL =
  "https://github.com/Rifqin-11/poskart-releases/releases/latest";

type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
  content_type: string;
  size: number;
};

type GitHubReleaseResponse = {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string;
  assets: GitHubReleaseAsset[];
};

export type LatestAppRelease = {
  version: string;
  name: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  publishedAt: string;
};

function selectAppAsset(assets: GitHubReleaseAsset[]) {
  return (
    assets.find(
      (asset) =>
        asset.name.toLowerCase().endsWith(".apk") &&
        !asset.name.toLowerCase().endsWith(".apk.sha256"),
    ) ?? null
  );
}

export async function getLatestAppRelease(): Promise<LatestAppRelease | null> {
  try {
    const response = await fetch(RELEASES_API_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;

    const release = (await response.json()) as GitHubReleaseResponse;
    const asset = selectAppAsset(release.assets ?? []);
    if (!asset) return null;

    return {
      version: release.tag_name,
      name: release.name || release.tag_name,
      downloadUrl: asset.browser_download_url,
      fileName: asset.name,
      fileSize: asset.size,
      publishedAt: release.published_at,
    };
  } catch {
    return null;
  }
}
