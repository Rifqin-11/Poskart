"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  useReviewTransactionActionRequest,
  useTransactionActionRequests,
} from "@/features/admin/transactions/use-transactions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type {
  TransactionActionRequest,
  TransactionActionType,
} from "@/types/transaction";

function actionLabel(action: TransactionActionType) {
  if (action === "verify") return "Verify";
  if (action === "refund") return "Refund";
  return "Archive";
}

function actionVariant(action: TransactionActionType) {
  if (action === "verify") return "success" as const;
  if (action === "refund") return "destructive" as const;
  return "secondary" as const;
}

function statusVariant(status: TransactionActionRequest["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "rejected" || status === "canceled") return "secondary" as const;
  return "warning" as const;
}

export function TransactionActionRequestManagement() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading } = useTransactionActionRequests(page, pageSize);
  const review = useReviewTransactionActionRequest();
  const requests = data?.items ?? [];

  async function submitReview(
    request: TransactionActionRequest,
    decision: "approved" | "rejected",
  ) {
    try {
      await review.mutateAsync({
        requestId: request.id,
        decision,
        notes:
          decision === "approved"
            ? `${actionLabel(request.action)} approved`
            : `${actionLabel(request.action)} rejected`,
      });
      toast.success(
        decision === "approved" ? "Request approved" : "Request rejected",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Requests</CardTitle>
        <CardDescription>
          Review Verify, Refund, and Archive requests before transaction data is changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="hidden overflow-x-auto xl:block">
          <Table className="min-w-[1040px]">
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead className="text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Badge variant={actionVariant(request.action)}>
                      {actionLabel(request.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs text-zinc-950">
                      {request.transactionId}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {request.transaction?.booth ?? "-"} ·{" "}
                      {request.transaction?.packageName ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell>{request.organizationName ?? request.organizationId}</TableCell>
                  <TableCell>
                    {formatCurrency(request.transaction?.amount ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(request.requestedAt)}</TableCell>
                  <TableCell>{request.requestedByEmail ?? "-"}</TableCell>
                  <TableCell>
                    <ReviewButtons
                      request={request}
                      disabled={review.isPending}
                      onReview={submitReview}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-zinc-400"
                  >
                    {isLoading
                      ? "Loading transaction requests..."
                      : "No transaction requests yet."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 xl:hidden">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={actionVariant(request.action)}>
                      {actionLabel(request.action)}
                    </Badge>
                    <Badge variant={statusVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  <div className="mt-3 break-all font-mono text-xs text-zinc-950">
                    {request.transactionId}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {request.organizationName ?? request.organizationId}
                  </div>
                </div>
                <div className="text-right text-sm font-semibold text-zinc-950">
                  {formatCurrency(request.transaction?.amount ?? 0)}
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Booth">{request.transaction?.booth ?? "-"}</Info>
                <Info label="Package">
                  {request.transaction?.packageName ?? "-"}
                </Info>
                <Info label="Requested">
                  {formatDateTime(request.requestedAt)}
                </Info>
                <Info label="Requester">{request.requestedByEmail ?? "-"}</Info>
              </div>
              <div className="mt-4 border-t border-zinc-100 pt-3">
                <ReviewButtons
                  request={request}
                  disabled={review.isPending}
                  onReview={submitReview}
                />
              </div>
            </div>
          ))}
          {requests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
              {isLoading
                ? "Loading transaction requests..."
                : "No transaction requests yet."}
            </div>
          ) : null}
        </div>
        <TablePagination
          page={data?.page ?? page}
          pageSize={data?.pageSize ?? pageSize}
          totalItems={data?.totalItems ?? 0}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  );
}

function ReviewButtons({
  request,
  disabled,
  onReview,
}: {
  request: TransactionActionRequest;
  disabled: boolean;
  onReview: (
    request: TransactionActionRequest,
    decision: "approved" | "rejected",
  ) => Promise<void>;
}) {
  if (request.status !== "requested") {
    return (
      <div className="text-right text-xs text-zinc-500">
        {request.reviewedAt ? formatDateTime(request.reviewedAt) : "Reviewed"}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => void onReview(request, "rejected")}
      >
        <XCircle className="size-4" />
        Reject
      </Button>
      <Button
        size="sm"
        disabled={disabled}
        onClick={() => void onReview(request, "approved")}
      >
        <CheckCircle2 className="size-4" />
        Approve
      </Button>
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 break-words text-zinc-900">{children}</div>
    </div>
  );
}
