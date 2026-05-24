import { TemplateBuilderWorkspace } from "@/components/templates/template-builder-workspace";

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return <TemplateBuilderWorkspace templateId={templateId} />;
}
