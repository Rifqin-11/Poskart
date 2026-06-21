import "server-only";

type DeliveryInput = {
  eventName: string;
  shareUrl: string;
  email?: string;
  phone?: string;
  emailAttachment?: EmailAttachment;
};

type ChannelResult = {
  sent: boolean;
  error?: string;
  attachmentSent?: boolean;
};

type DeliveryResult = {
  email?: ChannelResult;
  whatsapp?: ChannelResult;
};

type EmailAttachment = {
  filename: string;
  contentBase64: string;
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

function formatSentAt() {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
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

  const sentAt = formatSentAt();
  const attachments = input.emailAttachment
    ? [
        {
          filename: input.emailAttachment.filename,
          content: input.emailAttachment.contentBase64,
        },
      ]
    : undefined;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Softfile foto ${sentAt}`,
      text:
        `Hi there!\n\n` +
        `Your Poskart softfiles are ready to download.\n\n` +
        `Download Softfiles:\n${input.shareUrl}\n\n` +
        `Thank you for stopping by our booth and creating memories with us. ` +
        `We hope you enjoyed the experience as much as we did.\n\n` +
        `See you at the next Poskart session!\n\n` +
        `Love,\nPoskart\n\n` +
        `${sentAt}\n\n` +
        `Contact Support: https://wa.me/6285846626622\n\n` +
        `Follow @poskart.id for more updates`,
      html: `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Your memories have arrived | POSKART</title>
          </head>
          <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:32px 16px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
                    <tr>
                      <td style="background:#18181b;padding:26px 28px;color:#ffffff;">
                        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f7c7bd;font-weight:700;">POSKART</div>
                        <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;font-weight:800;">Your memories have arrived 📮✨</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:30px 28px 10px;">
                        <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Hi there!</p>
                        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#52525b;">Your Poskart softfiles are ready to download.</p>
                        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0;">
                          <tr>
                            <td style="background:#c4121a;border-radius:999px;">
                              <a href="${escapeHtml(input.shareUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;">Download Softfiles</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#52525b;">Thank you for stopping by our booth and creating memories with us. We hope you enjoyed the experience as much as we did 💘</p>
                        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#52525b;">See you at the next Poskart session!</p>
                        <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#18181b;">Love,<br /><strong>Poskart</strong></p>
                        <p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#71717a;">${escapeHtml(sentAt)}</p>
                        <p style="margin:0 0 8px;font-size:13px;color:#71717a;">If the button does not work, please copy and open the link below:</p>
                        <p style="margin:0;padding:12px 14px;background:#ffffff;border-radius:10px;border:1px solid #e5e7eb;font-size:12px;line-height:1.5;word-break:break-all;color:#3f3f46;">${escapeHtml(input.shareUrl)}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:24px 28px 30px;">
                        <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">Please save this link while it is still available. If you have any trouble accessing your files, feel free to contact the Poskart team.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:18px 28px;background:#ffffff;border-top:1px solid #e5e7eb;">
                        <p style="margin:0 0 10px;font-size:12px;line-height:1.5;text-align:center;font-weight:700;"><a href="https://wa.me/6285846626622" target="_blank" rel="noopener noreferrer" style="color:#18181b;text-decoration:underline;">Contact Support via WhatsApp</a></p>
                        <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#18181b;text-align:center;font-weight:700;">Follow <a href="https://www.instagram.com/poskart.id" target="_blank" rel="noopener noreferrer" style="color:#18181b;text-decoration:none;font-weight:700;">@poskart.id</a> for more updates</p>
                        <p style="margin:0;font-size:11px;line-height:1.5;color:#71717a;text-align:center;">This email was sent automatically by POSKART.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      ...(attachments ? { attachments } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      sent: false,
      error: detail || "Email provider menolak pengiriman.",
    };
  }

  return { sent: true, attachmentSent: Boolean(input.emailAttachment) };
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
