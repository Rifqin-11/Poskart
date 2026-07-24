import type { GlobalSearchResponse } from "@/features/admin/search/types";

export async function searchWorkspace(
  query: string,
  signal?: AbortSignal,
): Promise<GlobalSearchResponse> {
  const response = await fetch(
    `/api/admin/search?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      signal,
      headers: { Accept: "application/json" },
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | GlobalSearchResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : "Unable to search this workspace.",
    );
  }

  return payload as GlobalSearchResponse;
}
