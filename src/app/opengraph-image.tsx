import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "96px",
        background: "linear-gradient(135deg, #0b1220 0%, #142244 100%)",
        color: "#f8fafc",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: 96,
          height: 8,
          borderRadius: 999,
          background: "linear-gradient(90deg, #38bdf8 0%, #1d4ed8 100%)",
        }}
      />
      <div
        style={{
          marginTop: 40,
          fontSize: 116,
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        IM One
      </div>
      <div style={{ marginTop: 16, fontSize: 44, color: "#94a3b8" }}>{SITE_TAGLINE}</div>
      <div
        style={{
          marginTop: 56,
          fontSize: 26,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#60a5fa",
        }}
      >
        Daily Operation · ITSM · Analytics
      </div>
    </div>,
    size
  );
}
