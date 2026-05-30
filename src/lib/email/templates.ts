// Plain HTML email templates. Inline styles only — email clients ignore
// stylesheets. We don't pull from CSS variables here; values are pasted in
// from the clinical design tokens (any change to tokens should be mirrored
// here).
//
// Clinical aesthetic — white card on a light-blue canvas, Inter body, a serif
// headline, and a blue rounded CTA — to match the student/teacher app.

const COLORS = {
  page: "#EEF4FB", // light clinical blue-gray canvas
  card: "#FFFFFF",
  fg: "#1B2432", // headings / strong text (c-fg)
  muted: "#5C6B7E", // body text (c-muted-fg)
  fade: "#8A93A1", // hints / footer
  primary: "#0C77E9", // CTA blue (c-primary)
  primaryGlow: "#36B4F5", // CTA gradient end (c-primary-glow)
  border: "#DCE3EC", // c-border
};

const FONT_SANS =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const FONT_SERIF = "'Fraunces','Georgia',serif";

function shell(opts: {
  title: string;
  intro: string;
  cta?: { label: string; url: string };
  footer?: string;
}): string {
  return `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${COLORS.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};">
    <tr><td style="padding: 40px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="max-width:520px;width:100%;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
        <tr><td style="padding: 40px 40px 36px 40px;font-family:${FONT_SANS};color:${COLORS.fg};">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding-bottom: 28px;">
              <span style="font-family:${FONT_SANS};font-size:18px;font-weight:600;letter-spacing:-0.01em;color:${COLORS.fg};">
                <span style="display:inline-block;width:26px;height:26px;border-radius:7px;background:${COLORS.primary};color:#ffffff;text-align:center;line-height:26px;font-size:14px;font-weight:700;vertical-align:middle;margin-right:9px;">F</span>
                Femi
              </span>
            </td></tr>
            <tr><td style="padding-bottom: 14px;">
              <h1 style="margin:0;font-family:${FONT_SERIF};font-size:28px;font-weight:500;line-height:1.12;letter-spacing:-0.02em;color:${COLORS.fg};">
                ${opts.title}
              </h1>
            </td></tr>
            <tr><td style="padding-bottom: 28px;">
              <p style="margin:0;font-size:16px;line-height:1.62;color:${COLORS.muted};">
                ${opts.intro}
              </p>
            </td></tr>
            ${
              opts.cta
                ? `<tr><td style="padding-bottom: 28px;">
                    <a href="${opts.cta.url}" style="display:inline-block;background:${COLORS.primary};background-image:linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow});color:#ffffff;padding:13px 26px;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;letter-spacing:0.01em;">
                      ${opts.cta.label}
                    </a>
                  </td></tr>
                  <tr><td style="padding-bottom: 28px;">
                    <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.6;color:${COLORS.fade};word-break:break-all;">
                      Or paste this URL into your browser:<br/>
                      ${opts.cta.url}
                    </p>
                  </td></tr>`
                : ""
            }
            ${
              opts.footer
                ? `<tr><td style="border-top:1px solid ${COLORS.border};padding-top: 22px;">
                    <p style="margin:0;font-size:12px;line-height:1.55;color:${COLORS.fade};">
                      ${opts.footer}
                    </p>
                  </td></tr>`
                : ""
            }
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
  `.trim();
}

export function teacherInviteEmail(args: {
  name: string;
  recoveryUrl: string;
}) {
  return {
    subject: "Set your Femi password",
    html: shell({
      title: `Welcome, ${args.name}.`,
      intro:
        "An admin created your Femi teacher account. Click below to set your password and sign in. This link expires in 24 hours.",
      cta: { label: "Set my password", url: args.recoveryUrl },
      footer:
        "If you didn't expect this, you can ignore the email — no account is active until the link is used.",
    }),
  };
}

export function signupConfirmationEmail(args: {
  name: string;
  confirmUrl: string;
}) {
  return {
    subject: "Confirm your Femi MD email",
    html: shell({
      title: `Confirm your email, ${args.name}.`,
      intro:
        "Click below to confirm your email and finish creating your Femi MD account. After confirmation, an admin will review and approve your access. The link expires in 24 hours.",
      cta: { label: "Confirm my email", url: args.confirmUrl },
      footer:
        "Didn't request this? You can safely ignore this email — your account stays inactive without the click.",
    }),
  };
}

export function signupApprovedEmail(args: { name: string; loginUrl: string }) {
  return {
    subject: "You're approved on Femi MD",
    html: shell({
      title: `You're in, ${args.name}.`,
      intro:
        "An admin just approved your Femi MD account. Sign in to start working through cases.",
      cta: { label: "Sign in", url: args.loginUrl },
      footer:
        "If you no longer want access, reply to this email and we'll remove your account.",
    }),
  };
}

export function passwordResetEmail(args: { recoveryUrl: string }) {
  return {
    subject: "Reset your Femi password",
    html: shell({
      title: "Reset your password.",
      intro:
        "Use the link below to set a new password. It expires in 24 hours.",
      cta: { label: "Set a new password", url: args.recoveryUrl },
      footer:
        "Didn't request this? You can safely ignore the email.",
    }),
  };
}
