"use client";

import { Grid2X2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ColorField,
  PanelSection,
} from "@/features/builder/components/visual-properties-primitives";
import { readNumber, readString } from "@/features/builder/utils";
import type { BuilderNode } from "@/types/builder";

export function VisualQrProperties({
  selectedNode,
  updateNodeProps,
  section,
}: {
  selectedNode: BuilderNode;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  section?: "content" | "style" | "advanced";
}) {
  const isQrLink = selectedNode.type === "qr-link";

  // content: toggles that control what the QR node shows
  if (section === "content") {
    return (
      <PanelSection
        title={isQrLink ? "QR Link" : "QR Code"}
        icon={<Grid2X2 className="size-3.5 text-zinc-500" />}
      >
        <div className="space-y-3">
          {!isQrLink && (
            <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
              <div>
                <span className="block text-xs font-medium text-zinc-700">
                  Transparent background
                </span>
                <span className="block text-[10px] text-zinc-400">
                  Use no background behind the download QR container.
                </span>
              </div>
              <Switch
                checked={selectedNode.props.qrTransparentBackground === true}
                onCheckedChange={(value) =>
                  updateNodeProps(selectedNode.id, {
                    qrTransparentBackground: value,
                  })
                }
              />
            </label>
          )}
          {!isQrLink && (
            <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
              <div>
                <span className="block text-xs font-medium text-zinc-700">
                  Show Link Below QR
                </span>
                <span className="block text-[10px] text-zinc-400">
                  Display the text link below the QR code.
                </span>
              </div>
              <Switch
                checked={selectedNode.props.showQrLink !== false}
                onCheckedChange={(value) =>
                  updateNodeProps(selectedNode.id, { showQrLink: value })
                }
              />
            </label>
          )}
          {selectedNode.type === "qr" && (
            <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
              <div>
                <span className="block text-xs font-medium text-zinc-700">
                  Show Share Button
                </span>
                <span className="block text-[10px] text-zinc-400">
                  Display a small share icon on the QR corner.
                </span>
              </div>
              <Switch
                checked={selectedNode.props.showShareButton === true}
                onCheckedChange={(value) =>
                  updateNodeProps(selectedNode.id, { showShareButton: value })
                }
              />
            </label>
          )}
        </div>
      </PanelSection>
    );
  }

  // style: colors and size
  if (section === "style") {
    return (
      <PanelSection
        title={isQrLink ? "QR Link" : "QR Code"}
        icon={<Grid2X2 className="size-3.5 text-zinc-500" />}
      >
        <div className="space-y-3">
          {!isQrLink && (
            <ColorField
              label="QR Color"
              value={readString(selectedNode.props.qrColor, "#000000")}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, { qrColor: value })
              }
            />
          )}
          <ColorField
            label="QR Background"
            value={readString(selectedNode.props.qrBgColor, "#ffffff")}
            onChange={(value) =>
              updateNodeProps(selectedNode.id, { qrBgColor: value })
            }
          />
          {(isQrLink || selectedNode.props.showQrLink !== false) && (
            <ColorField
              label="QR Link Text Color"
              value={readString(
                selectedNode.props.qrTextColor ?? selectedNode.props.color,
                isQrLink ? "#3b82f6" : "#27272a",
              )}
              onChange={(value) =>
                updateNodeProps(selectedNode.id, {
                  qrTextColor: value,
                  color: value,
                })
              }
            />
          )}
          <label className="block text-xs font-medium text-zinc-500">
            QR Size (px)
            <Input
              className="mt-1"
              type="number"
              min={60}
              max={400}
              value={readNumber(selectedNode.props.qrSize, 160)}
              onChange={(event) =>
                updateNodeProps(selectedNode.id, {
                  qrSize: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      </PanelSection>
    );
  }

  // advanced: nothing QR-specific
  return null;
}
