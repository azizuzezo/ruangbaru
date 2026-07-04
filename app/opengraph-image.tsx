import { ImageResponse } from "next/og";
import { person } from "@/lib/content/profile";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#05060a",
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(139,124,246,0.35), transparent 50%), radial-gradient(circle at 80% 80%, rgba(79,216,224,0.3), transparent 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 120,
            height: 120,
            borderRadius: "50%",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #8b7cf6, #4fd8e0)",
            color: "#05060a",
            fontSize: 48,
            fontWeight: 700,
            marginBottom: 32,
          }}
        >
          {person.initials}
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "white" }}>
          {person.name}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#8b90a8", marginTop: 16 }}>
          {person.headline}
        </div>
      </div>
    ),
    { ...size }
  );
}
