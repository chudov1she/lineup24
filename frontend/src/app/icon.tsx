import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

/** Tab favicon — rounded square + “24”, like collapsed sidebar mark. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#121212",
          borderRadius: 8,
          color: "#ffffff",
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: "-0.08em",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        24
      </div>
    ),
    { ...size },
  )
}
