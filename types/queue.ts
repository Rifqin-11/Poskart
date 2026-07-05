export type QueueEventStatus = "active" | "paused" | "closed" | "deleted";

export type GuestQueueStatus =
  | "waiting"
  | "called"
  | "in_session"
  | "done"
  | "cancelled"
  | "no_show";

export type QueueEvent = {
  id: string;
  organizationId: string;
  deviceId: string | null;
  name: string;
  description: string | null;
  publicToken: string;
  status: QueueEventStatus;
  startsAt: string | null;
  endsAt: string | null;
  lastQueueNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type GuestQueueEntry = {
  id: string;
  organizationId: string;
  queueEventId: string;
  queueNumber: number;
  publicToken: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  status: GuestQueueStatus;
  calledAt: string | null;
  inSessionAt: string | null;
  completedAt: string | null;
  notifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QueueDashboardData = {
  organizationId: string;
  organizationName: string;
  devices: QueueDevice[];
  events: QueueEvent[];
  selectedEvent: QueueEvent | null;
  entries: GuestQueueEntry[];
  metrics: {
    current: GuestQueueEntry | null;
    next: GuestQueueEntry | null;
    waiting: number;
    total: number;
    done: number;
  };
};

export type QueueDevice = {
  id: string;
  name: string;
  location: string;
  frameTemplates: string[];
};

export type PublicQueueEvent = {
  id: string;
  organizationId: string;
  deviceId: string | null;
  organizationName: string;
  name: string;
  description: string | null;
  publicToken: string;
  status: QueueEventStatus;
};

export type PublicQueueTemplate = {
  id: string;
  name: string;
  tagline: string | null;
  photoCount: number;
  frameImageUrl: string | null;
  accentColor: string;
};

export type PublicQueueTicket = {
  id: string;
  eventName: string;
  organizationName: string;
  queueNumber: number;
  publicToken: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  status: GuestQueueStatus;
  createdAt: string;
};
