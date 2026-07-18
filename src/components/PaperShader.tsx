import { MeshGradient, DotOrbit } from "@paper-design/shaders-react";

/**
 * Background Paper Shaders
 * Source: https://21st.dev/@reuno-ui/components/background-paper-shaders
 * MeshGradient + DotOrbit (paper grey shader look)
 */
export default function PaperShader() {
  return (
    <div className="hero-shader-inner">
      {/* Main organic mesh (exact colors from 21st demo) */}
      <MeshGradient
        className="paper-mesh"
        colors={["#000000", "#1a1a1a", "#333333", "#ffffff"]}
        speed={0.9}
        distortion={0.75}
        swirl={0.12}
        grainMixer={0.5}
        grainOverlay={0.65}
      />
      {/* Dot orbit layer for paper grain / stipple feel */}
      <div className="paper-dots">
        <DotOrbit
          className="paper-dots-canvas"
          colorBack="#00000000"
          colors={["#2a2a2a", "#444444", "#1a1a1a"]}
          size={0.35}
          sizeRange={0.4}
          spreading={0.55}
          speed={0.8}
        />
      </div>
    </div>
  );
}
