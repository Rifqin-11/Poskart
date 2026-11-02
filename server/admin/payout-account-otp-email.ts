import "server-only";

type PayoutAccountOtpEmailInput = {
  email: string;
  organizationName: string;
  code: string;
  bankName: string;
  accountHolderName: string;
  accountNumberLastFour: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailFrom() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "POSKART";
  return fromEmail ? `${fromName} <${fromEmail}>` : "POSKART <noreply@poskart.my.id>";
}

export async function sendPayoutAccountOtpEmail(
  input: PayoutAccountOtpEmailInput,
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const organizationName = escapeHtml(input.organizationName);
  const code = escapeHtml(input.code);
  const bankName = escapeHtml(input.bankName);
  const accountHolderName = escapeHtml(input.accountHolderName);
  const accountNumberLastFour = escapeHtml(input.accountNumberLastFour);
  const accountSummary = `${input.bankName}, ${input.accountHolderName}, ending in ${input.accountNumberLastFour}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: [input.email],
      subject: "Confirm your POSKART payout account change",
      text:
        `A payout account change was requested for ${input.organizationName}.\n\n` +
        `Bank: ${input.bankName}\nAccount holder: ${input.accountHolderName}\n` +
        `Account number ending in: ${input.accountNumberLastFour}\n\n` +
        `Your verification code is ${input.code}. It expires in 5 minutes and can only be used once.\n\n` +
        "If you did not request this change, do not share the code and contact POSKART support.",
      html: `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Confirm payout account change</title>
          </head>
          <body style="margin:0;padding:28px 14px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr><td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border:1px solid #e4e4e7;border-radius:24px;overflow:hidden;background:#ffffff;">
                  <tr><td style="padding:30px 28px 22px;">
                    <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#014eb4;font-weight:800;">POSKART security</div>
                    <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;">Confirm payout account change</h1>
                    <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#52525b;">A payout account change was requested for <strong>${organizationName}</strong>.</p>
                  </td></tr>
                  <tr><td style="padding:0 28px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:14px;background:#f4f4f5;padding:14px 16px;font-size:13px;line-height:1.7;color:#3f3f46;">
                      <tr><td><strong>Bank:</strong> ${bankName}</td></tr>
                      <tr><td><strong>Account holder:</strong> ${accountHolderName}</td></tr>
                      <tr><td><strong>Account number:</strong> ending in ${accountNumberLastFour}</td></tr>
                    </table>
                    <p style="margin:22px 0 8px;font-size:13px;color:#71717a;">Enter this verification code to approve the change:</p>
                    <div style="display:inline-block;padding:13px 18px;border:1px solid #d4d4d8;border-radius:12px;background:#fafafa;font-size:30px;letter-spacing:8px;font-weight:800;color:#00357b;">${code}</div>
                    <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#71717a;">This code expires in 5 minutes and can only be used once. POSKART will never ask you to share it.</p>
                  </td></tr>
                  <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.6;color:#71717a;">If you did not request this change (${escapeHtml(accountSummary)}), do not share the code and contact POSKART support.</td></tr>
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
    throw new Error(`Payout verification email could not be sent: ${details}`);
  }
}
