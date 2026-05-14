import { ImageResponse } from "next/og";

// Picked up automatically by Next 15 — sets the default og:image for every
// route. Generated at build time using @vercel/og, no external service.

export const runtime = "edge";
export const alt = "Femi Medical — Clinical education for the next generation of physicians";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Design tokens inlined — @vercel/og doesn't read CSS variables.
const PAPER = "#FAF7F2";
const INK = "#1B2236";
const INK_MUTE = "#5B6075";
const INK_FADE = "#8A8E9F";
const ACCENT = "#1A6B5C";
const RULE = "rgba(27, 34, 54, 0.08)";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Top — Femi mark + label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              color: INK,
              fontSize: "36px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: ACCENT,
              }}
            />
            Femi
          </div>
          <div
            style={{
              fontSize: "16px",
              fontFamily: "Menlo, monospace",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: INK_FADE,
            }}
          >
            Clinical education
          </div>
        </div>

        {/* Main — serif headline */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: "920px",
          }}
        >
          <div
            style={{
              fontSize: "80px",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: INK,
              fontWeight: 400,
              fontFamily: "Georgia, serif",
            }}
          >
            Clinical education for the next generation of physicians.
          </div>
          <div
            style={{
              marginTop: "32px",
              fontSize: "28px",
              fontStyle: "italic",
              color: INK_MUTE,
              lineHeight: 1.4,
              maxWidth: "780px",
            }}
          >
            Patient cases. Stage by stage. Decisions that build clinical
            judgement.
          </div>
        </div>

        {/* Bottom — meta row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderTop: `1px solid ${RULE}`,
            paddingTop: "24px",
            fontSize: "16px",
            fontFamily: "Menlo, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: INK_FADE,
          }}
        >
          <div>Case-based learning</div>
          <div>Femi Medical</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
