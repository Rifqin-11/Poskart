"use server";

import { revalidatePath } from "next/cache";
import { getSiteUrl } from "@/lib/auth/site-url";
import { getAdminContext } from "@/server/admin/context";
import { sendQueueCallEmail } from "@/server/queue/queue-email";
import {
  mapGuestQueueEntry,
  mapQueueDevice,
  mapQueueEvent,
  type GuestQueueEntryRow,
  type QueueDeviceRow,
  type QueueEventRow,
} from "@/server/queue/queue-mappers";
import type {
  GuestQueueEntry,
  GuestQueueStatus,
  QueueDashboardData,
  QueueEvent,
} from "@/types/queue";

type MembershipRole = "owner" | "admin" | "designer" | "akuntan" | "partner";

const QUEUE_EVENT_COLUMNS =
  "id,organization_id,device_id,name,description,public_token,status,starts_at,ends_at,last_queue_number,created_at,updated_at";
const QUEUE_ENTRY_COLUMNS =
  "id,organization_id,queue_event_id,queue_number,public_token,visitor_name,visitor_email,visitor_phone,status,called_at,in_session_at,completed_at,notified_at,email_sent_at,notes,created_at,updated_at";

type QueueEmailRow = GuestQueueEntryRow & {
  queue_events?:
    | {
        name: string;
        organizations?: { name: string } | { name: string }[] | null;
      }
    | Array<{
        name: string;
        organizations?: { name: string } | { name: string }[] | null;
      }>
    | null;
};

async function getQueueMembership() {
  const { supabase, user } = await getAdminContext();
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !member?.organization_id) {
    throw new Error("Unable to load organization membership");
  }

  return {
    supabase,
    user,
    organizationId: member.organization_id as string,
    role: member.role as MembershipRole,
  };
}

function canManageQueue(role: string) {
  return role === "owner" || role === "admin" || role === "partner";
}

function assertCanManageQueue(role: string) {
  if (!canManageQueue(role)) {
    throw new Error("Only owner, admin, or partner can manage queue events");
  }
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function computeMetrics(entries: GuestQueueEntry[]) {
  const activeEntries = entries.filter(
    (entry) => !["done", "cancelled", "no_show"].includes(entry.status),
  );
  const inSession = activeEntries.find((entry) => entry.status === "in_session");
  const called = activeEntries.find((entry) => entry.status === "called");
  const waitingEntries = entries.filter((entry) => entry.status === "waiting");

  return {
    current: inSession ?? called ?? null,
    next: waitingEntries[0] ?? null,
    waiting: waitingEntries.length,
    total: entries.length,
    done: entries.filter((entry) => entry.status === "done").length,
  };
}

async function sendQueueCallEmailIfNeeded({
  supabase,
  organizationId,
  entryId,
  notifiedAt,
}: {
  supabase: Awaited<ReturnType<typeof getQueueMembership>>["supabase"];
  organizationId: string;
  entryId: string;
  notifiedAt: string;
}) {
  const { data, error } = await supabase
    .from("guest_queue_entries")
    .select(`${QUEUE_ENTRY_COLUMNS},queue_events(name,organizations(name))`)
    .eq("id", entryId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Queue entry not found");

  const row = data as unknown as QueueEmailRow;
  if (row.email_sent_at) return;

  const event = firstRelation(row.queue_events);
  const organization = firstRelation(event?.organizations);
  const siteUrl = await getSiteUrl();

  await sendQueueCallEmail({
    eventName: event?.name ?? "POSKART Queue",
    organizationName: organization?.name ?? "POSKART Booth",
    visitorName: row.visitor_name,
    visitorEmail: row.visitor_email,
    queueNumber: row.queue_number,
    ticketUrl: `${siteUrl}/q/ticket/${row.public_token}`,
  });

  const { error: updateError } = await supabase
    .from("guest_queue_entries")
    .update({
      email_sent_at: notifiedAt,
      notified_at: notifiedAt,
      updated_at: notifiedAt,
    })
    .eq("id", entryId)
    .eq("organization_id", organizationId)
    .is("email_sent_at", null);

  if (updateError) throw updateError;
}

export async function getQueueDashboard(
  selectedEventId?: string | null,
): Promise<QueueDashboardData> {
  const { supabase, organizationId } = await getQueueMembership();

  const [
    { data: organization },
    { data: deviceRows, error: devicesError },
    { data: eventRows, error: eventsError },
  ] = await Promise.all([
      supabase
        .from("organizations")
        .select("id,name")
        .eq("id", organizationId)
        .maybeSingle(),
      supabase
        .from("devices")
        .select("id,name,location,frame_templates,template")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true }),
      supabase
        .from("queue_events")
        .select(QUEUE_EVENT_COLUMNS)
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

  if (devicesError) {
    throw new Error(`Unable to load queue devices: ${devicesError.message}`);
  }

  if (eventsError) {
    if (eventsError.code === "42P01" || eventsError.code === "42703") {
      return {
        organizationId,
        organizationName: (organization?.name as string | undefined) ?? "POSKART",
        devices: [],
        events: [],
        selectedEvent: null,
        entries: [],
        metrics: {
          current: null,
          next: null,
          waiting: 0,
          total: 0,
          done: 0,
        },
      };
    }
    throw new Error(`Unable to load queue events: ${eventsError.message}`);
  }

  const devices = ((deviceRows ?? []) as QueueDeviceRow[]).map(mapQueueDevice);
  const events = ((eventRows ?? []) as QueueEventRow[]).map(mapQueueEvent);
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ??
    events.find((event) => event.status === "active") ??
    events[0] ??
    null;

  let entries: GuestQueueEntry[] = [];
  if (selectedEvent) {
    const { data, error } = await supabase
      .from("guest_queue_entries")
      .select(QUEUE_ENTRY_COLUMNS)
      .eq("organization_id", organizationId)
      .eq("queue_event_id", selectedEvent.id)
      .order("queue_number", { ascending: true });

    if (error) {
      throw new Error(`Unable to load queue entries: ${error.message}`);
    }
    entries = ((data ?? []) as GuestQueueEntryRow[]).map(mapGuestQueueEntry);
  }

  return {
    organizationId,
    organizationName: (organization?.name as string | undefined) ?? "POSKART",
    devices,
    events,
    selectedEvent,
    entries,
    metrics: computeMetrics(entries),
  };
}

export async function createQueueEvent(input: {
  name: string;
  description?: string;
  deviceId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<{ success: boolean; error?: string; eventId?: string }> {
  try {
    const { supabase, user, organizationId, role } = await getQueueMembership();
    assertCanManageQueue(role);

    const name = input.name.trim();
    const description = input.description?.trim() || null;
    if (name.length < 2 || name.length > 80) {
      return { success: false, error: "Event name must be 2-80 characters" };
    }
    if (description && description.length > 280) {
      return { success: false, error: "Description max is 280 characters" };
    }

    const deviceId = input.deviceId?.trim() || null;
    if (deviceId) {
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("id")
        .eq("id", deviceId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (deviceError) throw deviceError;
      if (!device) return { success: false, error: "Selected device not found" };
    }

    const { data, error } = await supabase
      .from("queue_events")
      .insert({
        organization_id: organizationId,
        device_id: deviceId,
        name,
        description,
        starts_at: input.startsAt || null,
        ends_at: input.endsAt || null,
        created_by: user.id,
      })
      .select("id")
      .maybeSingle();

    if (error) throw error;
    revalidatePath("/queue");
    return { success: true, eventId: data?.id as string | undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to create event",
    };
  }
}

export async function updateQueueEventStatus(
  eventId: string,
  status: Exclude<QueueEvent["status"], "deleted">,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, organizationId, role } = await getQueueMembership();
    assertCanManageQueue(role);

    if (!["active", "paused", "closed"].includes(status)) {
      return { success: false, error: "Invalid event status" };
    }

    const { data, error } = await supabase
      .from("queue_events")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, error: "Queue event not found" };

    revalidatePath("/queue");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to update event",
    };
  }
}

export async function deleteQueueEvent(
  eventId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, organizationId, role } = await getQueueMembership();
    assertCanManageQueue(role);

    const { data, error } = await supabase
      .from("queue_events")
      .update({
        status: "deleted",
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, error: "Queue event not found" };

    revalidatePath("/queue");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete QR event",
    };
  }
}

export async function updateGuestQueueStatus(
  entryId: string,
  status: GuestQueueStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, organizationId, role } = await getQueueMembership();
    assertCanManageQueue(role);

    if (
      !["waiting", "called", "in_session", "done", "cancelled", "no_show"].includes(
        status,
      )
    ) {
      return { success: false, error: "Invalid queue status" };
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status, updated_at: now };
    if (status === "called") patch.called_at = now;
    if (status === "in_session") patch.in_session_at = now;
    if (status === "done") patch.completed_at = now;
    if (status === "waiting") {
      patch.called_at = null;
      patch.in_session_at = null;
      patch.completed_at = null;
    }

    const { data, error } = await supabase
      .from("guest_queue_entries")
      .update(patch)
      .eq("id", entryId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, error: "Queue entry not found" };

    if (status === "called" || status === "in_session") {
      await sendQueueCallEmailIfNeeded({
        supabase,
        organizationId,
        entryId,
        notifiedAt: now,
      });
    }

    revalidatePath("/queue");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to update queue entry",
    };
  }
}

export async function markGuestQueueNotified(
  entryId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, organizationId, role } = await getQueueMembership();
    assertCanManageQueue(role);

    const { error } = await supabase
      .from("guest_queue_entries")
      .update({
        notified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .eq("organization_id", organizationId);

    if (error) throw error;
    revalidatePath("/queue");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to mark as notified",
    };
  }
}
