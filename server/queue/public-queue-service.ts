import "server-only";

import { getServiceRoleClient } from "@/lib/supabase/server";
import {
  mapGuestQueueEntry,
  mapPublicQueueEvent,
  mapPublicTemplate,
  mapPublicTicket,
  type GuestQueueEntryRow,
  type PublicTemplateRow,
  type QueueDeviceRow,
  type QueueEventRow,
} from "@/server/queue/queue-mappers";
import type {
  GuestQueueEntry,
  PublicQueueEvent,
  PublicQueueTemplate,
  PublicQueueTicket,
} from "@/types/queue";

type OrganizationRow = {
  id: string;
  name: string;
};

type TicketRow = GuestQueueEntryRow & {
  queue_events?:
    | {
        id: string;
        organization_id: string;
        device_id: string | null;
        name: string;
        organizations?: { name: string } | { name: string }[] | null;
      }
    | Array<{
        id: string;
        organization_id: string;
        device_id: string | null;
        name: string;
        organizations?: { name: string } | { name: string }[] | null;
      }>
    | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function getPublicTemplatesForEvent(
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
  event: Pick<QueueEventRow, "organization_id" | "device_id">,
) {
  const [{ data: deviceRow }, { data: templateRows }] = await Promise.all([
    event.device_id
      ? supabase
          .from("devices")
          .select("id,name,location,frame_templates,template")
          .eq("id", event.device_id)
          .eq("organization_id", event.organization_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("templates")
      .select("id,name,tagline,photo_count,frame_image_url,accent_color")
      .eq("organization_id", event.organization_id)
      .eq("status", "published")
      .order("display_order", { ascending: true })
      .limit(100),
  ]);
  const device = deviceRow as QueueDeviceRow | null;
  const assignedTemplates = new Set(
    [
      ...(Array.isArray(device?.frame_templates) ? device.frame_templates : []),
      device?.template ?? null,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  return ((templateRows ?? []) as PublicTemplateRow[])
    .filter(
      (template) =>
        assignedTemplates.size === 0 ||
        assignedTemplates.has(template.id) ||
        assignedTemplates.has(template.name),
    )
    .map(mapPublicTemplate);
}

export async function getPublicQueueEvent(
  eventToken: string,
): Promise<{
  event: PublicQueueEvent | null;
  templates: PublicQueueTemplate[];
}> {
  const token = eventToken.trim();
  if (!token) return { event: null, templates: [] };

  const supabase = await getServiceRoleClient();
  const { data: eventRow, error } = await supabase
    .from("queue_events")
    .select(
      "id,organization_id,device_id,name,description,public_token,status,starts_at,ends_at,last_queue_number,created_at,updated_at",
    )
    .eq("public_token", token)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !eventRow) {
    return { event: null, templates: [] };
  }

  const event = eventRow as QueueEventRow;
  const now = Date.now();
  if (event.starts_at && new Date(event.starts_at).getTime() > now) {
    return { event: null, templates: [] };
  }
  if (event.ends_at && new Date(event.ends_at).getTime() < now) {
    return { event: null, templates: [] };
  }

  const [{ data: organization }, templates] = await Promise.all([
    supabase
      .from("organizations")
      .select("id,name")
      .eq("id", event.organization_id)
      .maybeSingle(),
    getPublicTemplatesForEvent(supabase, event),
  ]);

  return {
    event: mapPublicQueueEvent(
      event,
      ((organization as OrganizationRow | null)?.name ?? "POSKART Booth"),
    ),
    templates,
  };
}

export async function createPublicQueueEntry(input: {
  eventToken: string;
  name: string;
  email: string;
  phone: string;
}): Promise<GuestQueueEntry> {
  const supabase = await getServiceRoleClient();
  const { data, error } = await supabase.rpc("create_guest_queue_entry", {
    p_event_token: input.eventToken,
    p_visitor_name: input.name,
    p_visitor_email: input.email,
    p_visitor_phone: input.phone,
  });

  if (error) {
    throw new Error(error.message || "Unable to create queue entry");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("Queue entry was not created");
  }

  return mapGuestQueueEntry({
    ...(row as GuestQueueEntryRow),
    status: "waiting",
    called_at: null,
    in_session_at: null,
    completed_at: null,
    notified_at: null,
    email_sent_at: null,
    notes: null,
    updated_at: row.created_at,
  });
}

export async function getPublicQueueTicket(
  ticketToken: string,
): Promise<PublicQueueTicket | null> {
  const token = ticketToken.trim();
  if (!token) return null;

  const supabase = await getServiceRoleClient();
  const { data, error } = await supabase
    .from("guest_queue_entries")
    .select(
      "id,organization_id,queue_event_id,queue_number,public_token,visitor_name,visitor_email,visitor_phone,status,called_at,in_session_at,completed_at,notified_at,email_sent_at,notes,created_at,updated_at,queue_events(id,organization_id,device_id,name,organizations(name))",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as TicketRow;
  const event = firstRelation(row.queue_events);
  const organization = firstRelation(event?.organizations);
  return mapPublicTicket(
    row,
    event?.name ?? "Queue Event",
    organization?.name ?? "POSKART Booth",
  );
}

export async function getPublicQueueTicketWithFrames(
  ticketToken: string,
): Promise<{
  ticket: PublicQueueTicket | null;
  templates: PublicQueueTemplate[];
}> {
  const token = ticketToken.trim();
  if (!token) return { ticket: null, templates: [] };

  const supabase = await getServiceRoleClient();
  const { data, error } = await supabase
    .from("guest_queue_entries")
    .select(
      "id,organization_id,queue_event_id,queue_number,public_token,visitor_name,visitor_email,visitor_phone,status,called_at,in_session_at,completed_at,notified_at,email_sent_at,notes,created_at,updated_at,queue_events(id,organization_id,device_id,name,organizations(name))",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (error || !data) return { ticket: null, templates: [] };

  const row = data as unknown as TicketRow;
  const event = firstRelation(row.queue_events);
  const organization = firstRelation(event?.organizations);
  const ticket = mapPublicTicket(
    row,
    event?.name ?? "Queue Event",
    organization?.name ?? "POSKART Booth",
  );

  if (!event) return { ticket, templates: [] };

  const templates = await getPublicTemplatesForEvent(supabase, {
    organization_id: event.organization_id,
    device_id: event.device_id,
  });

  return { ticket, templates };
}
