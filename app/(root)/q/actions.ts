"use server";

import { createPublicQueueEntry } from "@/server/queue/public-queue-service";

function normalizeIndonesianPhone(value: string) {
  const phone = value.trim();
  if (!/^\d+$/.test(phone)) {
    return {
      error: "Phone number must use digits only, without spaces or dashes.",
    };
  }
  if (phone.startsWith("0")) {
    return { error: "Phone number must start with 62, not 0." };
  }

  const normalized = phone.startsWith("62") ? phone : `62${phone}`;
  if (!/^62[1-9]\d{7,12}$/.test(normalized)) {
    return { error: "Enter a valid Indonesian phone number." };
  }

  return { phone: normalized };
}

export async function registerQueueVisitor(input: {
  eventToken: string;
  name: string;
  email: string;
  phone: string;
}): Promise<{ success: boolean; error?: string; ticketToken?: string }> {
  const eventToken = input.eventToken.trim();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phoneResult = normalizeIndonesianPhone(input.phone);

  if (!eventToken) return { success: false, error: "Invalid queue link" };
  if (name.length < 2 || name.length > 80) {
    return { success: false, error: "Name must be 2-80 characters" };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address" };
  }
  if (phoneResult.error || !phoneResult.phone) {
    return { success: false, error: phoneResult.error };
  }

  try {
    const entry = await createPublicQueueEntry({
      eventToken,
      name,
      email,
      phone: phoneResult.phone,
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
