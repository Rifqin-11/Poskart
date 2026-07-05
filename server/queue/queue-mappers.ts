import type {
  GuestQueueEntry,
  PublicQueueEvent,
  PublicQueueTemplate,
  PublicQueueTicket,
  QueueDevice,
  QueueEvent,
} from "@/types/queue";

export type QueueEventRow = {
  id: string;
  organization_id: string;
  device_id: string | null;
  name: string;
  description: string | null;
  public_token: string;
  status: QueueEvent["status"];
  starts_at: string | null;
  ends_at: string | null;
  last_queue_number: number;
  created_at: string;
  updated_at: string;
};

export type GuestQueueEntryRow = {
  id: string;
  organization_id: string;
  queue_event_id: string;
  queue_number: number;
  public_token: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  status: GuestQueueEntry["status"];
  called_at: string | null;
  in_session_at: string | null;
  completed_at: string | null;
  notified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicTemplateRow = {
  id: string;
  name: string;
  tagline: string | null;
  photo_count: number | null;
  frame_image_url: string | null;
  accent_color: string | null;
};

export type QueueDeviceRow = {
  id: string;
  name: string;
  location: string;
  frame_templates: string[] | null;
  template?: string | null;
};

export function mapQueueEvent(row: QueueEventRow): QueueEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    deviceId: row.device_id,
    name: row.name,
    description: row.description,
    publicToken: row.public_token,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    lastQueueNumber: row.last_queue_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQueueDevice(row: QueueDeviceRow): QueueDevice {
  const assigned = Array.isArray(row.frame_templates)
    ? row.frame_templates.filter(Boolean)
    : [];
  if (assigned.length === 0 && row.template?.trim()) {
    assigned.push(row.template.trim());
  }

  return {
    id: row.id,
    name: row.name,
    location: row.location,
    frameTemplates: assigned,
  };
}

export function mapGuestQueueEntry(row: GuestQueueEntryRow): GuestQueueEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    queueEventId: row.queue_event_id,
    queueNumber: row.queue_number,
    publicToken: row.public_token,
    visitorName: row.visitor_name,
    visitorEmail: row.visitor_email,
    visitorPhone: row.visitor_phone,
    status: row.status,
    calledAt: row.called_at,
    inSessionAt: row.in_session_at,
    completedAt: row.completed_at,
    notifiedAt: row.notified_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPublicQueueEvent(
  row: QueueEventRow,
  organizationName: string,
): PublicQueueEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    deviceId: row.device_id,
    organizationName,
    name: row.name,
    description: row.description,
    publicToken: row.public_token,
    status: row.status,
  };
}

export function mapPublicTemplate(row: PublicTemplateRow): PublicQueueTemplate {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    photoCount: row.photo_count ?? 1,
    frameImageUrl: row.frame_image_url,
    accentColor: row.accent_color ?? "#18181b",
  };
}

export function mapPublicTicket(
  row: GuestQueueEntryRow,
  eventName: string,
  organizationName: string,
): PublicQueueTicket {
  return {
    id: row.id,
    eventName,
    organizationName,
    queueNumber: row.queue_number,
    publicToken: row.public_token,
    visitorName: row.visitor_name,
    visitorEmail: row.visitor_email,
    visitorPhone: row.visitor_phone,
    status: row.status,
    createdAt: row.created_at,
  };
}
