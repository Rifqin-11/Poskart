import "server-only";

type OrganizationInvitationEmailInput = {
  email: string;
  organizationName: string;
  invitedBy: string;
  inviteUrl: string;
  expiresAt: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function invitationEmailFrom() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "POSKART";
  return fromEmail ? `${fromName} <${fromEmail}>` : "POSKART <noreply@poskart.my.id>";
}

export async function sendOrganizationInvitationEmail(
  input: OrganizationInvitationEmailInput,
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const organizationName = escapeHtml(input.organizationName);
  const invitedBy = escapeHtml(input.invitedBy);
  const inviteUrl = escapeHtml(input.inviteUrl);
  const expiresAt = escapeHtml(
    new Date(input.expiresAt).toLocaleDateString("en-US", {
      dateStyle: "medium",
    }),
  );

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: invitationEmailFrom(),
      to: [input.email],
      subject: `You have been invited to ${input.organizationName} on POSKART`,
      text:
        `You have been invited to join ${input.organizationName} on POSKART.\n\n` +
        `${input.invitedBy} invited you to collaborate in this photobooth workspace.\n` +
        `Accept the invitation: ${input.inviteUrl}\n\n` +
        `This invitation expires on ${new Date(input.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" })}.`,
      html: `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>POSKART workspace invitation</title>
          </head>
          <body style="margin:0;padding:28px 14px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr><td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border:1px solid #e4e4e7;border-radius:24px;overflow:hidden;background:#ffffff;">
                  <tr><td style="padding:30px 28px 22px;">
                    <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#014eb4;font-weight:800;">POSKART workspace</div>
                    <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">You’re invited to join ${organizationName}</h1>
                    <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#52525b;">${invitedBy} invited you to collaborate on devices, photos, designs, and daily operations.</p>
                  </td></tr>
                  <tr><td style="padding:0 28px 28px;">
                    <a href="${inviteUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#00357b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;">Review invitation</a>
                    <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#71717a;">This secure invitation link expires on ${expiresAt}. You’ll need to sign in with this email address to accept it.</p>
                  </td></tr>
                  <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.6;color:#71717a;">If you were not expecting this invitation, you can safely ignore this email.</td></tr>
                </table>
              </td></tr>
            </table>
          </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Invitation email could not be sent: ${details}`);
  }
}
