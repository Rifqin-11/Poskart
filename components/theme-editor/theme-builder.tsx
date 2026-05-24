"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useThemes } from "@/hooks/use-admin-data";
import { adminService } from "@/lib/services/admin-service";
import { useThemeStore } from "@/stores/theme-store";

export function ThemeBuilder() {
  const { data: presets = [] } = useThemes();
  const { schema, published, setSchema, setColor, setRadius, setAnimationPreset, publish } = useThemeStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Theme & Branding Builder</h1>
          <p className="mt-1 text-sm text-zinc-500">Draft, preview, and publish kiosk branding systems.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={published ? "success" : "warning"}>{published ? "Published" : "Draft mode"}</Badge>
          <Button
            onClick={async () => {
              try {
                await adminService.publishThemeSchema(schema);
                publish();
                toast.success("Theme schema published to Supabase");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to publish theme schema");
              }
            }}
          >
            Save & publish
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme presets</CardTitle>
              <CardDescription>Start from a POSKART brand direction.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {presets.map((preset) => (
                <div key={preset.id} className="rounded-lg border border-zinc-100 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{preset.name}</div>
                    <Badge variant={preset.status === "published" ? "success" : "secondary"}>{preset.status}</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {Object.values(preset.schema.colors).slice(0, 4).map((color) => (
                      <span key={color} className="size-5 rounded-full border" style={{ background: color }} />
                    ))}
                  </div>
                  <Button className="mt-3 w-full" variant="outline" size="sm" onClick={() => setSchema(preset.schema)}>
                    Use preset
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand controls</CardTitle>
              <CardDescription>Colors, radius, animation, logo, and texture slots.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(schema.colors).map(([key, value]) => (
                <label key={key} className="grid grid-cols-[100px_1fr_42px] items-center gap-2 text-xs font-medium text-zinc-500">
                  {key}
                  <Input value={value} onChange={(event) => setColor(key, event.target.value)} />
                  <span className="size-8 rounded-md border" style={{ background: value }} />
                </label>
              ))}
              {Object.entries(schema.radius).map(([key, value]) => (
                <label key={key} className="block text-xs font-medium text-zinc-500">
                  {key} radius: {value}px
                  <Slider min={0} max={24} value={value} onChange={(event) => setRadius(key, Number(event.target.value))} />
                </label>
              ))}
              <label className="block text-xs font-medium text-zinc-500">
                Animation preset
                <Select
                  className="mt-1"
                  value={schema.animationPreset}
                  onChange={(event) => setAnimationPreset(event.target.value as typeof schema.animationPreset)}
                >
                  <option value="none">None</option>
                  <option value="subtle">Subtle</option>
                  <option value="playful">Playful</option>
                  <option value="premium">Premium</option>
                </Select>
              </label>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle>Live preview</CardTitle>
            <CardDescription>Tablet kiosk and receipt output simulation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 p-8 lg:grid-cols-[1fr_320px]">
            <div
              className="flex min-h-[560px] flex-col justify-between rounded-[28px] border-[10px] border-zinc-950 p-8 shadow-2xl"
              style={{ background: schema.colors.background, color: schema.colors.foreground }}
            >
              <div>
                <div className="text-sm font-medium opacity-60">POSKART PHOTOBOOTH</div>
                <div className="mt-6 max-w-sm text-5xl font-semibold tracking-tight">Make it look like a memory.</div>
              </div>
              <button
                className="h-12 w-44 text-sm font-semibold shadow-sm"
                style={{
                  background: schema.colors.accent,
                  color: "#ffffff",
                  borderRadius: schema.radius.button,
                }}
              >
                Start session
              </button>
            </div>
            <div className="rounded-sm bg-white p-6 font-mono text-zinc-950 shadow-xl" style={{ borderRadius: schema.radius.receipt }}>
              <div className="text-center text-lg font-bold">POSKART</div>
              <div className="mt-2 text-center text-xs">PHOTO RECEIPT</div>
              <div className="my-5 h-44 rounded bg-zinc-100" />
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span>PACKAGE</span><span>DOUBLE</span></div>
                <div className="flex justify-between"><span>PRICE</span><span>10K</span></div>
                <div className="flex justify-between"><span>DOWNLOAD</span><span>QRIS</span></div>
              </div>
              <div className="mt-5 border-t border-dashed pt-4 text-center text-[10px]">THANK YOU - PK0524</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
