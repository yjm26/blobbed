import React from "react";
import { MeshGradient, DotOrbit } from "@paper-design/shaders-react";

/**
 * Background Paper Shaders
 * https://21st.dev/@reuno-ui/components/background-paper-shaders
 */
export default function PaperShader() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#000",
      }}
    >
      <MeshGradient
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        colors={["#000000", "#1a1a1a", "#333333", "#ffffff"]}
        speed={0.9}
        distortion={0.75}
        swirl={0.12}
        grainMixer={0.5}
        grainOverlay={0.65}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      >
        <DotOrbit
          style={{ width: "100%", height: "100%" }}
          colorBack="#00000000"
          colors={["#2a2a2a", "#3a3a3a", "#1a1a1a"]}
          size={0.35}
          sizeRange={0.4}
          spreading={0.55}
          speed={0.8}
        />
      </div>
    </div>
  );
}
