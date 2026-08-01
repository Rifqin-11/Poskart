import "server-only";

type DeliveryInput = {
  eventName: string;
  shareUrl: string;
  previewUrl?: string;
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

function buildGalleryEmailHtml(
  shareUrl: string,
  sentAt: string,
  previewUrl?: string,
) {
  const safeShareUrl = escapeHtml(shareUrl);
  const safeSentAt = escapeHtml(sentAt);
  const safePreviewUrl = previewUrl ? escapeHtml(previewUrl) : "";
  const previewMarkup = safePreviewUrl
    ? `
      <tr>
        <td class="content-pad" style="padding:0 34px 30px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;background:#f4f7fb;border:1px solid #dce5ef;border-radius:18px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:10px;background:#f4f7fb;">
                <a href="${safeShareUrl}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;">
                  <img src="${safePreviewUrl}" width="550" alt="Preview of your POSKART photobooth result" style="display:block;width:100%;max-width:550px;height:auto;max-height:356px;object-fit:contain;border:0;border-radius:12px;background:#ffffff;" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 17px 16px;background:#ffffff;border-top:1px solid #e1e8f0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="color:#596579;font-size:12px;line-height:1.5;">A preview from your session</td>
                    <td align="right"><a href="${safeShareUrl}" target="_blank" rel="noopener noreferrer" style="color:#00357b;text-decoration:none;font-size:12px;line-height:1.5;font-weight:800;">Open full gallery&nbsp; →</a></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your memories have arrived | POSKART</title>
        <style>
          @media screen and (max-width:640px) {
            .email-shell { padding:16px 10px !important; }
            .content-pad { padding-left:22px !important; padding-right:22px !important; }
            .hero-title { font-size:34px !important; }
            .brand-meta { display:none !important; width:0 !important; }
            .email-card { width:100% !important; max-width:100% !important; }
            .step-cell { display:block !important; width:100% !important; padding:0 0 14px !important; }
            .step-cell-last { padding-bottom:0 !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#eef3f9;font-family:Arial,Helvetica,sans-serif;color:#101828;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-shell" style="box-sizing:border-box;background:#eef3f9;padding:36px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-card" style="width:100%;max-width:640px;table-layout:fixed;background:#ffffff;border:1px solid #dbe4ef;border-radius:24px;overflow:hidden;box-shadow:0 16px 44px rgba(0,53,123,0.09);">
                <tr><td style="height:5px;background:#d82732;font-size:0;">&nbsp;</td></tr>
                <tr>
                  <td class="content-pad" style="padding:22px 34px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width:42px;height:42px;background:#f4f7fb;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                                <img src="https://www.poskart.my.id/app-logo.png" width="42" height="42" alt="POSKART" style="display:block;width:42px;height:42px;border:0;" />
                              </td>
                              <td style="padding-left:12px;">
                                <p style="margin:0;color:#101828;font-size:15px;line-height:1.2;letter-spacing:0.2px;font-weight:800;">POSKART</p>
                                <p style="margin:4px 0 0;color:#667085;font-size:10px;line-height:1.2;letter-spacing:1.6px;font-weight:700;">PHOTOBOOTH OS</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align="right" valign="middle" class="brand-meta" style="color:#00357b;font-size:11px;line-height:1.4;letter-spacing:1.2px;font-weight:800;">MEMORY DELIVERY</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="content-pad" style="padding:34px 34px 30px;border-top:1px solid #edf1f6;word-wrap:break-word;overflow-wrap:break-word;">
                    <p style="margin:0 0 14px;color:#d82732;font-size:11px;line-height:1.4;letter-spacing:1.8px;text-transform:uppercase;font-weight:800;">Receipt Photobooth</p>
                    <h1 class="hero-title" style="margin:0;max-width:520px;color:#101828;font-size:42px;line-height:1.08;letter-spacing:-1.4px;font-weight:800;">Your memories<br />have arrived.</h1>
                    <p style="margin:20px 0 0;max-width:510px;color:#596579;font-size:15px;line-height:1.7;">Hi there! Your POSKART softfiles are ready. Open your private gallery to view, download, and keep every moment from your session.</p>
                  </td>
                </tr>
                <tr>
                  <td class="content-pad" style="padding:0 34px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;background:#00357b;border-radius:18px;overflow:hidden;">
                      <tr>
                        <td style="padding:25px 24px 26px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td valign="middle">
                                <p style="margin:0 0 7px;color:#ffffff;font-size:11px;line-height:1.4;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;"><span style="color:#ff6b72;">●</span>&nbsp; Gallery ready</p>
                                <p style="margin:0;color:#dce9fb;font-size:14px;line-height:1.55;">Your photos are one tap away.</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-top:20px;">
                                <table role="presentation" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="background:#ffffff;border-radius:11px;">
                                      <a href="${safeShareUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 21px;color:#00357b;text-decoration:none;font-size:14px;line-height:1.2;font-weight:800;">View &amp; download photos&nbsp;&nbsp;→</a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${previewMarkup}
                <tr>
                  <td class="content-pad" style="padding:0 34px 32px;">
                    <p style="margin:0 0 18px;color:#596579;font-size:14px;line-height:1.7;">Thank you for stopping by our booth. We hope the photos bring you back to the fun every time you see them.</p>
                    <p style="margin:0 0 22px;color:#101828;font-size:14px;line-height:1.6;">With love,<br /><strong>The POSKART team</strong></p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f9fc;border:1px solid #e3eaf2;border-radius:12px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0 0 5px;color:#7a8699;font-size:11px;line-height:1.5;">If the button does not work, copy this link:</p>
                          <p style="margin:0;color:#00357b;font-size:11px;line-height:1.5;word-break:break-all;">${safeShareUrl}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:14px 0 0;color:#98a2b3;font-size:11px;line-height:1.5;">Delivered ${safeSentAt}. Please save your files while the gallery is available.</p>
                  </td>
                </tr>
                <tr>
                  <td class="content-pad" style="padding:22px 34px 25px;background:#f8fafc;border-top:1px solid #e5ebf2;">
                    <p style="margin:0 0 10px;color:#596579;font-size:12px;line-height:1.55;text-align:center;">Need help? <a href="https://wa.me/6285846626622" target="_blank" rel="noopener noreferrer" style="color:#00357b;text-decoration:none;font-weight:800;">Contact POSKART Support</a></p>
                    <p style="margin:0 0 8px;color:#596579;font-size:12px;line-height:1.55;text-align:center;">Follow <a href="https://www.instagram.com/poskart.id" target="_blank" rel="noopener noreferrer" style="color:#00357b;text-decoration:none;font-weight:800;">@poskart.id</a></p>
                    <p style="margin:0;color:#98a2b3;font-size:10px;line-height:1.5;text-align:center;">Sent automatically by POSKART Photobooth OS.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
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
      html: buildGalleryEmailHtml(input.shareUrl, sentAt, input.previewUrl),
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
