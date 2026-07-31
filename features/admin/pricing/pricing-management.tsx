"use client";

import { useState } from "react";
import { CalendarDays, CircleHelp, Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { PageHeader } from "@/features/admin/_components/page-header";
import {
  useCreatePricing,
  useDeletePricing,
  usePricing,
  useUpdatePricing,
} from "@/features/admin/pricing/use-pricing";
import { formatCurrency } from "@/lib/utils";
import { usePermission } from "@/features/admin/hooks/use-permission";
import {
  FeatureGuidedTour,
  type FeatureTourStep,
} from "@/features/admin/tutorial/feature-guided-tour";
import { useFeatureTutorial } from "@/features/admin/tutorial/use-feature-tutorial";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { type DictionaryKey } from "@/lib/i18n/dictionaries";
import type { PricingProduct, PricingProductInput } from "@/types/pricing";

import { PricingFormDialog } from "./_components/pricing-form-dialog";
import { PaidInfoCard, EventInfoCard } from "./_components/access-info-cards";

const EMPTY_PRICING: PricingProductInput = {
  name: "",
  price: 0,
  promoPrice: undefined,
  printLimit: 1,
  qrisDownload: true,
  livePhotoEnabled: false,
  gifEnabled: false,
  active: true,
  accessMode: "paid",
  eventName: undefined,
  eventExpiresAt: undefined,
};

const EMPTY_EVENT: PricingProductInput = {
  ...EMPTY_PRICING,
  qrisDownload: false,
  accessMode: "event",
};

function getPricingTourSteps(t: (key: DictionaryKey) => string): FeatureTourStep[] {
  return [
    {
      selectors: ['[data-pricing-tour="packages"]'],
      title: t("pricing.tourPaidTitle"),
      description: t("pricing.tourPaidDesc"),
    },
    {
      selectors: ['[data-pricing-tour="package-info"]'],
      title: t("pricing.tourPackageInfoTitle"),
      description: t("pricing.tourPackageInfoDesc"),
    },
    {
      selectors: ['[data-pricing-tour="events"]'],
      title: t("pricing.tourEventsTitle"),
      description: t("pricing.tourEventsDesc"),
    },
    {
      selectors: ['[data-pricing-tour="event-info"]'],
      title: t("pricing.tourModeTitle"),
      description: t("pricing.tourModeDesc"),
    },
  ];
}

export function PricingManagement() {
  const { data = [] } = usePricing();
  const createPricing = useCreatePricing();
  const { isReadOnly } = usePermission();
  const { t } = useI18n();
  const updatePricing = useUpdatePricing();
  const deletePricing = useDeletePricing();
  const [editing, setEditing] = useState<PricingProduct | null>(null);
  const [creating, setCreating] = useState<PricingProductInput | null>(null);
  const confirmDelete = useConfirmDialog();
  const pricingTutorial = useFeatureTutorial("pricing");
  const PRICING_TOUR_STEPS = getPricingTourSteps(t);

  const handleToggle = (
    product: PricingProduct,
    field: "qrisDownload" | "livePhotoEnabled" | "gifEnabled" | "active",
    value: boolean,
  ) => {
    updatePricing.mutate(
      { id: product.id, patch: { [field]: value } },
      {
        onSuccess: () => toast.success(t("pricing.updated")),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("pricing.updateFailed")),
      },
    );
  };

  const handleDelete = (product: PricingProduct) => {
    confirmDelete.confirm({
      title: t("pricing.deleteTitle"),
      description: t("pricing.deleteDesc").replace("{name}", product.name),
      confirmLabel: t("pricing.deleteConfirm"),
      destructive: true,
      onConfirm: () => {
        deletePricing.mutate(product.id, {
          onSuccess: () => toast.success(t("pricing.deleteSuccess")),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : t("pricing.deleteFailed")),
        });
      },
    });
  };

  return (
    <div>
      {confirmDelete.dialog}
      <PageHeader
        title={t("pricing.pageTitle")}
        description={t("pricing.pageDesc")}
        action={
          <Button variant="outline" onClick={pricingTutorial.show}>
            <CircleHelp className="size-4" />
            {t("pricing.showTutorial")}
          </Button>
        }
      />

      <div className="space-y-5">
        <PricingTableCard
          title={t("pricing.packagesTitle")}
          description={t("pricing.packagesDesc")}
          products={data.filter((product) => product.accessMode === "paid")}
          eventMode={false}
          tourTarget="packages"
          infoTourTarget="package-info"
          readOnly={isReadOnly("pricing")}
          onAdd={() => setCreating({ ...EMPTY_PRICING })}
          onEdit={setEditing}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
        <PricingTableCard
          title={t("pricing.eventsTitle")}
          description={t("pricing.eventsDesc")}
          products={data.filter((product) => product.accessMode === "event")}
          eventMode
          tourTarget="events"
          infoTourTarget="event-info"
          readOnly={isReadOnly("pricing")}
          onAdd={() => setCreating({ ...EMPTY_EVENT })}
          onEdit={setEditing}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
      </div>

      {creating ? (
        <PricingFormDialog
          title={
            creating.accessMode === "event" ? "Add event access" : "Add package"
          }
          initial={creating}
          submitting={createPricing.isPending}
          onClose={() => setCreating(null)}
          onSubmit={(values) => {
            createPricing.mutate(values, {
              onSuccess: () => {
                toast.success(
                  values.accessMode === "event"
                    ? t("pricing.eventAccessCreated")
                    : t("pricing.packageCreated"),
                );
                setCreating(null);
              },
              onError: (err) =>
                toast.error(
                  err instanceof Error ? err.message : t("pricing.createFailed"),
                ),
            });
          }}
        />
      ) : null}
      {editing ? (
        <PricingFormDialog
          title={`Edit ${editing.name}`}
          initial={editing}
          submitting={updatePricing.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updatePricing.mutate(
              { id: editing.id, patch: values },
              {
                onSuccess: () => {
                  toast.success(t("pricing.accessUpdated"));
                  setEditing(null);
                },
                onError: (err) =>
                  toast.error(
                    err instanceof Error ? err.message : t("pricing.updateFailed"),
                  ),
              },
            );
          }}
        />
      ) : null}
      {pricingTutorial.open ? (
        <FeatureGuidedTour
          open
          title={t("pricing.guide")}
          steps={PRICING_TOUR_STEPS}
          onClose={pricingTutorial.complete}
          onComplete={pricingTutorial.complete}
        />
      ) : null}
    </div>
  );
}

type PricingTableCardProps = {
  title: string;
  description: string;
  products: PricingProduct[];
  eventMode: boolean;
  tourTarget: string;
  infoTourTarget: string;
  readOnly: boolean;
  onAdd: () => void;
  onEdit: (product: PricingProduct) => void;
  onDelete: (product: PricingProduct) => void;
  onToggle: (
    product: PricingProduct,
    field: "qrisDownload" | "livePhotoEnabled" | "gifEnabled" | "active",
    value: boolean,
  ) => void;
};

function PricingTableCard({
  title,
  description,
  products,
  eventMode,
  tourTarget,
  infoTourTarget,
  readOnly,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: PricingTableCardProps) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = products.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <Card data-pricing-tour={tourTarget}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button disabled={readOnly} onClick={onAdd}>
          {eventMode ? (
            <CalendarDays className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {eventMode ? t("pricing.addEvent") : t("pricing.addPackage")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div data-pricing-tour={infoTourTarget}>
          {eventMode ? <EventInfoCard /> : <PaidInfoCard />}
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>{eventMode ? t("pricing.colEvent") : t("pricing.colProduct")}</TableHead>
                {eventMode ? (
                  <TableHead>{t("pricing.colExpiry")}</TableHead>
                ) : (
                  <>
                    <TableHead>{t("pricing.colPrice")}</TableHead>
                    <TableHead>{t("pricing.colPromo")}</TableHead>
                  </>
                )}
                <TableHead>{t("pricing.colPrintLimit")}</TableHead>
                {!eventMode ? <TableHead>{t("pricing.colQrDownload")}</TableHead> : null}
                <TableHead>{t("pricing.colLivePhoto")}</TableHead>
                <TableHead>{t("pricing.colGif")}</TableHead>
                <TableHead>{t("pricing.colActive")}</TableHead>
                <TableHead className="text-right">{t("pricing.colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    {eventMode && product.eventName ? (
                      <div className="text-xs text-amber-700">
                        {product.eventName}
                      </div>
                    ) : null}
                  </TableCell>
                  {eventMode ? (
                    <TableCell className="text-sm text-zinc-500">
                      {formatExpiry(product.eventExpiresAt)}
                    </TableCell>
                  ) : (
                    <>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        {product.promoPrice
                          ? formatCurrency(product.promoPrice)
                          : "-"}
                      </TableCell>
                    </>
                  )}
                  <TableCell>{product.printLimit}</TableCell>
                  {!eventMode ? (
                    <TableCell>
                      <Switch
                        checked={product.qrisDownload}
                        disabled={readOnly}
                        onCheckedChange={(value) =>
                          onToggle(product, "qrisDownload", value)
                        }
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Switch
                      checked={product.livePhotoEnabled}
                      disabled={readOnly}
                      onCheckedChange={(value) =>
                        onToggle(product, "livePhotoEnabled", value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.gifEnabled}
                      disabled={readOnly}
                      onCheckedChange={(value) =>
                        onToggle(product, "gifEnabled", value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.active}
                      disabled={readOnly}
                      onCheckedChange={(value) =>
                        onToggle(product, "active", value)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${product.name}`}
                        disabled={readOnly}
                        onClick={() => onEdit(product)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${product.name}`}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={readOnly}
                        onClick={() => onDelete(product)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={eventMode ? 7 : 8}
                    className="py-8 text-center text-sm text-zinc-400"
                  >
                    {eventMode
                      ? "No event access yet. Add an event to enable complimentary sessions."
                      : "No pricing packages yet. Add a package to enable paid sessions."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={products.length}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  );
}

function formatExpiry(value?: string) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
