// Plain HTML email templates. Inline styles only — email clients ignore
// stylesheets. We don't pull from CSS variables here; values are pasted in
// from the design tokens (any change to tokens should be mirrored here).
//
// Kept lo-fi on purpose. Editorial restraint applies to email too.

const COLORS = {
  paper: "#FAF7F2",
  paperLight: "#F2EEE5",
  ink: "#1B2236",
  inkMute: "#5B6075",
  inkFade: "#8A8E9F",
  accent: "#1A6B5C",
  rule: "rgba(27, 34, 54, 0.15)",
};

function shell(opts: {
  title: string;
  intro: string;
  cta?: { label: string; url: string };
  footer?: string;
}): string {
  return `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${COLORS.paper};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.paper};">
    <tr><td style="padding: 48px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="max-width:520px;width:100%;font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${COLORS.ink};">
        <tr><td style="padding-bottom: 32px;">
          <span style="font-family:'Fraunces','Georgia',serif;font-size:22px;font-weight:500;letter-spacing:-0.01em;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLORS.accent};vertical-align:middle;margin-right:8px;"></span>
            Femi
          </span>
        </td></tr>
        <tr><td style="padding-bottom: 16px;">
          <h1 style="margin:0;font-family:'Fraunces','Georgia',serif;font-size:28px;font-weight:400;line-height:1.15;letter-spacing:-0.01em;">
            ${opts.title}
          </h1>
        </td></tr>
        <tr><td style="padding-bottom: 28px;">
          <p style="margin:0;font-size:16px;line-height:1.65;color:${COLORS.inkMute};">
            ${opts.intro}
          </p>
        </td></tr>
        ${
          opts.cta
            ? `<tr><td style="padding-bottom: 32px;">
                <a href="${opts.cta.url}" style="display:inline-block;background:${COLORS.ink};color:${COLORS.paper};padding:13px 24px;text-decoration:none;font-size:14px;border-radius:2px;letter-spacing:0.01em;">
                  ${opts.cta.label}
                </a>
              </td></tr>
              <tr><td style="padding-bottom: 32px;">
                <p style="margin:0;font-family:'JetBrains Mono',monospace;font-size:11px;color:${COLORS.inkFade};word-break:break-all;">
                  Or paste this URL into your browser:<br/>
                  ${opts.cta.url}
                </p>
              </td></tr>`
            : ""
        }
        ${
          opts.footer
            ? `<tr><td style="border-top:1px solid ${COLORS.rule};padding-top: 24px;">
                <p style="margin:0;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.05em;color:${COLORS.inkFade};">
                  ${opts.footer}
                </p>
              </td></tr>`
            : ""
        }
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
