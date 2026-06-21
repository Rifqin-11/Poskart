import "server-only";

type DeliveryInput = {
  eventName: string;
  shareUrl: string;
  email?: string;
  phone?: string;
};

type ChannelResult = {
  sent: boolean;
  error?: string;
};

type DeliveryResult = {
  email?: ChannelResult;
  whatsapp?: ChannelResult;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

async function sendEmail(input: DeliveryInput): Promise<ChannelResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.GALLERY_EMAIL_FROM ?? "POSKART <noreply@poskart.my.id>";
  const to = input.email?.trim().toLowerCase() ?? "";

  if (!to) return { sent: false, error: "Email kosong." };
  if (!apiKey) {
    return {
      sent: false,
      error: "RESEND_API_KEY belum dikonfigurasi di backend.",
    };
  }

  const eventName = input.eventName.trim() || "POSKART";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Softfile foto ${eventName}`,
      text: `Terima kasih sudah berfoto di ${eventName}.\n\nDownload softfile Anda di:\n${input.shareUrl}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#18181b">
          <h2>Softfile foto ${escapeHtml(eventName)}</h2>
          <p>Terima kasih sudah berfoto bersama POSKART.</p>
          <p>
            <a href="${escapeHtml(input.shareUrl)}"
               style="display:inline-block;background:#18181b;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">
              Download softfile
            </a>
          </p>
          <p style="font-size:13px;color:#71717a">${escapeHtml(input.shareUrl)}</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      sent: false,
      error: detail || "Email provider menolak pengiriman.",
    };
  }

  return { sent: true };
}

async function sendWhatsApp(input: DeliveryInput): Promise<ChannelResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = normalizeWhatsAppPhone(input.phone ?? "");

  if (!to) return { sent: false, error: "Nomor WhatsApp kosong." };
  if (!token || !phoneNumberId) {
    return {
      sent: false,
      error:
        "WHATSAPP_CLOUD_TOKEN atau WHATSAPP_PHONE_NUMBER_ID belum dikonfigurasi.",
    };
  }

  const eventName = input.eventName.trim() || "POSKART";
  const templateName = process.env.WHATSAPP_GALLERY_TEMPLATE_NAME?.trim();
  const templateLanguage =
    process.env.WHATSAPP_GALLERY_TEMPLATE_LANGUAGE?.trim() || "id";
  const body = templateName
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: eventName },
                { type: "text", text: input.shareUrl },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: true,
          body: `Terima kasih sudah berfoto di ${eventName}.\n\nDownload softfile Anda di:\n${input.shareUrl}`,
        },
      };

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return {
      sent: false,
      error: detail || "WhatsApp provider menolak pengiriman.",
    };
  }

  return { sent: true };
}

export async function deliverGalleryLink(
  input: DeliveryInput,
): Promise<DeliveryResult> {
  const [email, whatsapp] = await Promise.all([
    input.email ? sendEmail(input) : Promise.resolve(undefined),
    input.phone ? sendWhatsApp(input) : Promise.resolve(undefined),
  ]);

  return {
    ...(email ? { email } : {}),
    ...(whatsapp ? { whatsapp } : {}),
  };
}
