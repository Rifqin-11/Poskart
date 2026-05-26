import { redirect } from "next/navigation";

export function encodedRedirect(type: "error" | "success", path: string, message: string) {
  const params = new URLSearchParams({ [type]: message });
  return redirect(`${path}${path.includes("?") ? "&" : "?"}${params.toString()}`);
}
