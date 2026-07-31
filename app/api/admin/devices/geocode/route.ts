import { businessProfile } from "@/lib/constants/business";
import { getAdminMembership } from "@/server/admin/context";

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

const NON_GEOGRAPHIC_LOCATION_WORDS = new Set([
  "booth",
  "cfd",
  "event",
  "location",
  "lokasi",
  "venue",
]);

function normalizeGeocodeQuery(query: string) {
  const meaningfulWords = query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word && !NON_GEOGRAPHIC_LOCATION_WORDS.has(word.toLocaleLowerCase()),
    );
  return meaningfulWords.length ? meaningfulWords.join(" ") : query;
}

export async function GET(request: Request) {
  const membership = await getAdminMembership();
  if (!membership) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 160) {
    return Response.json({ error: "Invalid location query" }, { status: 400 });
  }

  const searchParams = new URLSearchParams({
    q: /indonesia/i.test(query)
      ? normalizeGeocodeQuery(query)
      : `${normalizeGeocodeQuery(query)}, Indonesia`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "id",
    email: businessProfile.email,
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "id,en;q=0.8",
          "User-Agent": `POSKART-Admin/1.0 (${businessProfile.email})`,
        },
        next: { revalidate: 60 * 60 * 24 * 30 },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      return Response.json(
        { error: "Location service is temporarily unavailable" },
        { status: 502 },
      );
    }

    const results = (await response.json()) as NominatimResult[];
    const result = results[0];
    const latitude = result?.lat ? Number(result.lat) : Number.NaN;
    const longitude = result?.lon ? Number(result.lon) : Number.NaN;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json({ error: "Location not found" }, { status: 404 });
    }

    return Response.json({
      latitude,
      longitude,
      displayName: result.display_name || query,
    });
  } catch {
    return Response.json(
      { error: "Location service is temporarily unavailable" },
      { status: 502 },
    );
  }
}
