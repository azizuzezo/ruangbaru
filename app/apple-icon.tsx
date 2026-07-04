import { ImageResponse } from "next/og";
import { person } from "@/lib/content/profile";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #05060a, #10121b)",
          color: "transparent",
          backgroundClip: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #8b7cf6, #4fd8e0)",
            color: "#05060a",
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          {person.initials}
        </div>
      </div>
    ),
    { ...size }
  );
}
