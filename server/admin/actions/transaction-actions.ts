"use server";

import { createClient } from "@/lib/supabase/server";
import {
  assertSupabaseResult,
  mapTransaction,
  TRANSACTION_COLUMNS,
  type Transaction,
  type TransactionRow,
  type TransactionPatch,
  type RetryPrintTransactionRow,
} from "../_shared/admin-types";

async function verifyAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function getTransactions(): Promise<Transaction[]> {
  const { supabase } = await verifyAuth();
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .order("created_at", { ascending: false });

  return assertSupabaseResult(
    data as TransactionRow[] | null,
    error,
    "Unable to load transactions",
  ).map(mapTransaction);
}

export async function getFailedPrintsByBooth(
  boothName: string,
): Promise<Transaction[]> {
  const { supabase } = await verifyAuth();
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("booth", boothName)
    .in("print_status", ["failed", "pending"])
    .order("created_at", { ascending: false })
    .limit(50);

  return assertSupabaseResult(
    data as TransactionRow[] | null,
    error,
    "Unable to load failed prints",
  ).map(mapTransaction);
}

export async function retryPrint(transactionId: string): Promise<void> {
  const { supabase, user } = await verifyAuth();

  const { data: current, error: readError } = await supabase
    .from("transactions")
    .select("id,organization_id,booth,print_attempts,print_count")
    .eq("id", transactionId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Unable to load transaction: ${readError.message}`);
  }
  const transaction = current as RetryPrintTransactionRow | null;
  if (!transaction) {
    throw new Error("Unable to queue reprint: transaction not found");
  }

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id")
    .eq("organization_id", transaction.organization_id)
    .eq("name", transaction.booth)
    .maybeSingle();

  if (deviceError) {
    throw new Error(`Unable to load device: ${deviceError.message}`);
  }
  if (!device?.id) {
    throw new Error("Unable to queue reprint: source device not found");
  }

  const { data: framed, error: framedError } = await supabase
    .from("gallery_photos")
    .select("secure_url")
    .eq("session_id", transaction.id)
    .eq("organization_id", transaction.organization_id)
    .eq("kind", "framed")
    .order("photo_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (framedError) {
    throw new Error(`Unable to load framed photo: ${framedError.message}`);
  }
  if (!framed?.secure_url) {
    throw new Error(
      "Unable to queue reprint: framed photo is not available for this transaction",
    );
  }

  const copies = Math.max(
    1,
    Math.min(20, Math.round(transaction.print_count ?? 1)),
  );
  const { error: jobError } = await supabase.from("device_print_jobs").insert({
    organization_id: transaction.organization_id,
    device_id: device.id,
    gallery_session_id: transaction.id,
    source_url: framed.secure_url,
    copies,
    requested_by: user.id,
  });

  if (jobError) {
    throw new Error(`Unable to create print job: ${jobError.message}`);
  }

  const attempts = (transaction.print_attempts ?? 0) + 1;

  const { error } = await supabase
    .from("transactions")
    .update({
      print_status: "reprinting",
      print_attempts: attempts,
      print_last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);

  if (error) throw new Error(`Unable to queue reprint: ${error.message}`);
}

export async function updateTransaction(
  id: string,
  patch: TransactionPatch,
): Promise<void> {
  const { supabase } = await verifyAuth();
  const { error } = await supabase
    .from("transactions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Unable to update transaction: ${error.message}`);
}

export async function deleteTransaction(id: string): Promise<void> {
  const { supabase } = await verifyAuth();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(`Unable to delete transaction: ${error.message}`);
}

export async function deleteTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { supabase } = await verifyAuth();
  const { error } = await supabase.from("transactions").delete().in("id", ids);
  if (error) throw new Error(`Unable to delete transactions: ${error.message}`);
}
