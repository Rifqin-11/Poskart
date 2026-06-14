import { NextResponse } from "next/server";

import {
  getLatestAppRelease,
  RELEASES_PAGE_URL,
} from "@/server/releases/github-release";

export async function GET() {
  const release = await getLatestAppRelease();
  return NextResponse.redirect(release?.downloadUrl ?? RELEASES_PAGE_URL);
}
