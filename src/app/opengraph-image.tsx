import { ImageResponse } from "next/og";

// Picked up automatically by Next 15 — sets the default og:image for every
// route. Generated at build time using @vercel/og, no external service.

export const runtime = "edge";
export const alt =
  "Femi Medical — Be the doctor. Solve the case. Clinical education for students.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Clinical palette — mirrors src/app/globals.css. @vercel/og doesn't read
// CSS variables, so the HSL values from `--c-*` are flattened to hex here.
const BG = "#FFFFFF";
const FG = "#1A2433"; // hsl(215 30% 15%)
const FG_MUTE = "#65707D"; // hsl(215 16% 47%)
const FG_FADE = "#99A1AD";
const PRIMARY = "#0F76E6"; // hsl(211 90% 48%)
const PRIMARY_GLOW = "#3FB3F8"; // hsl(200 95% 60%)
const PRIMARY_SOFT = "#EBF4FF"; // hsl(211 100% 96%)
const BORDER = "#E2E8F0"; // hsl(214 32% 91%)

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "Helvetica, Arial, sans-serif",
          position: "relative",
        }}
      >
        {/* Soft corner gradient — decorative, mirrors the landing hero. */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -180,
            width: 540,
            height: 540,
            borderRadius: "50%",
            background: PRIMARY_GLOW,
            opacity: 0.18,
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            right: 80,
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: PRIMARY,
            opacity: 0.12,
            filter: "blur(70px)",
          }}
        />

        {/* Top — brand mark + label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              color: FG,
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: PRIMARY,
                color: BG,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: 0,
              }}
            >
              F
            </div>
            Femi
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: PRIMARY,
              background: PRIMARY_SOFT,
              padding: "10px 16px",
              borderRadius: 999,
            }}
          >
            Clinical education
          </div>
        </div>

        {/* Main — serif headline + subtitle */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 960,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 100,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: FG,
              fontWeight: 500,
              fontFamily: "Georgia, 'Times New Roman', serif",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Be the doctor.</span>
            <span>Solve the case.</span>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 28,
              color: FG_MUTE,
              lineHeight: 1.45,
              maxWidth: 820,
            }}
          >
            Real patients. Real symptoms. Real decisions — minus the lecture.
          </div>
        </div>

        {/* Bottom — meta row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 22,
            fontSize: 16,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: FG_FADE,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: PRIMARY,
              }}
            />
            Case-based learning
          </div>
          <div>Femi Medical</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
