import { VisualBuilder } from "@/features/builder/visual-builder";

export default async function EditThemeBuilderPage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const { themeId } = await params;

  return (
    <main className="h-screen overflow-hidden bg-zinc-50">
      <VisualBuilder initialThemeId={themeId} />
    </main>
  );
}
