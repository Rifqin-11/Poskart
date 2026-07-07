const GITHUB_RELEASE_URL =
  "https://api.github.com/repos/Rifqin-11/poskart-releases/releases/latest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(GITHUB_RELEASE_URL, {
      headers,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return Response.json(
        {
          error:
            payload?.message ??
            `GitHub release request failed with status ${response.status}`,
        },
        {
          status: response.status === 403 ? 502 : response.status,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    return Response.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown update error" },
      { status: 500 },
    );
  }
}
