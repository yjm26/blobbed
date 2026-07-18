import { MeshGradient, DotOrbit } from "@paper-design/shaders-react";

/**
 * Background Paper Shaders — from 21st.dev/@reuno-ui/components/background-paper-shaders
 * MeshGradient + DotOrbit combined (paper grain look).
 */
export default function PaperShader() {
  return (
    <div className="hero-shader-inner">
      <MeshGradient
        className="paper-mesh"
        colors={["#000000", "#1a1a1a", "#333333", "#ffffff"]}
        speed={0.85}
        distortion={0.8}
        swirl={0.1}
        grainMixer={0.45}
        grainOverlay={0.7}
      />
      <div className="paper-dots">
        <DotOrbit
          className="paper-dots-canvas"
          dotColor="#333333"
          orbitColor="#1a1a1a"
          speed={1.2}
          intensity={1.2}
        />
      </div>
    </div>
  );
}
