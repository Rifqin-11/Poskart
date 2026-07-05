"use server";

import { createPublicQueueEntry } from "@/server/queue/public-queue-service";

export async function registerQueueVisitor(input: {
  eventToken: string;
  name: string;
  email: string;
  phone: string;
}): Promise<{ success: boolean; error?: string; ticketToken?: string }> {
  const eventToken = input.eventToken.trim();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  if (!eventToken) return { success: false, error: "Invalid queue link" };
  if (name.length < 2 || name.length > 80) {
    return { success: false, error: "Name must be 2-80 characters" };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address" };
  }
  if (phone.replace(/[^0-9+]/g, "").length < 8) {
    return { success: false, error: "Enter a valid phone number" };
  }

  try {
    const entry = await createPublicQueueEntry({
      eventToken,
      name,
      email,
      phone,
    });
    return { success: true, ticketToken: entry.publicToken };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to register queue visitor",
    };
  }
}
