import React from "react";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Background Paper Shaders
 * https://21st.dev/@reuno-ui/components/background-paper-shaders
 * Mesh only — no DotOrbit (no floating balls)
 */
export default function PaperShader() {
  return (
    <MeshGradient
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      colors={["#000000", "#1a1a1a", "#333333", "#ffffff"]}
      speed={0.9}
      distortion={0.75}
      swirl={0.12}
      grainMixer={0.5}
      grainOverlay={0.65}
    />
  );
}
