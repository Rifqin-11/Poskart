import "server-only";

type SendQueueCallEmailInput = {
  eventName: string;
  organizationName: string;
  visitorName: string;
  visitorEmail: string;
  queueNumber: number;
  ticketUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function queueNumber(value: number) {
  return value.toString().padStart(3, "0");
}

function queueEmailFrom() {
  const explicit = process.env.QUEUE_EMAIL_FROM?.trim();
  if (explicit) return explicit;

  const galleryFrom = process.env.GALLERY_EMAIL_FROM?.trim();
  if (galleryFrom) return galleryFrom;

  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "POSKART";
  if (fromEmail) return `${fromName} <${fromEmail}>`;

  return "POSKART <noreply@poskart.my.id>";
}

export async function sendQueueCallEmail(input: SendQueueCallEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = input.visitorEmail.trim().toLowerCase();

  if (!to) {
    throw new Error("Visitor email is empty");
  }
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const number = queueNumber(input.queueNumber);
  const visitorName = escapeHtml(input.visitorName);
  const eventName = escapeHtml(input.eventName);
  const organizationName = escapeHtml(input.organizationName);
  const ticketUrl = escapeHtml(input.ticketUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: queueEmailFrom(),
      to: [to],
      subject: `Your POSKART queue number ${number} is ready`,
      text:
        `Hi ${input.visitorName},\n\n` +
        `Your POSKART queue number ${number} is ready for ${input.eventName}.\n` +
        `Please come to the photobooth cashier.\n\n` +
        `Ticket: ${input.ticketUrl}\n\n` +
        `${input.organizationName}`,
      html: `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Your queue is ready</title>
          </head>
          <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 14px;background:#f4f4f5;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border-radius:24px;overflow:hidden;background:#ffffff;border:1px solid #e4e4e7;">
                    <tr>
                      <td style="padding:28px 28px 18px;">
                        <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#a1a1aa;font-weight:800;">POSKART Queue</div>
                        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">Your number is ready</h1>
                        <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#52525b;">Hi ${visitorName}, please come to the photobooth cashier.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 28px 22px;">
                        <div style="border-radius:24px;background:#09090b;color:#ffffff;text-align:center;padding:26px 18px;">
                          <div style="font-size:13px;color:#d4d4d8;">Queue number</div>
                          <div style="font-size:64px;line-height:1;font-weight:900;letter-spacing:-2px;margin-top:8px;">${number}</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 28px 28px;">
                        <p style="margin:0 0 6px;font-size:13px;color:#71717a;">Event</p>
                        <p style="margin:0 0 16px;font-size:16px;font-weight:700;">${eventName}</p>
                        <p style="margin:0 0 6px;font-size:13px;color:#71717a;">Booth</p>
                        <p style="margin:0 0 22px;font-size:16px;font-weight:700;">${organizationName}</p>
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="background:#18181b;border-radius:999px;">
                              <a href="${ticketUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;">Open queue ticket</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:18px 28px;background:#fafafa;border-top:1px solid #e4e4e7;">
                        <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">This email was sent automatically when the booth called your queue number.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Email provider rejected the queue email");
  }
}
