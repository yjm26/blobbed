import * as THREE from 'three';

const container = document.getElementById('topo-canvas')!;

const scene = new THREE.Scene();

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.display = 'block';
container.appendChild(renderer.domElement);

// ========== MeshGradient shader (ported from @paper-design/shaders) ==========

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;

  uniform float u_time;
  uniform vec4 u_colors[10];
  uniform float u_colorsCount;
  uniform float u_distortion;
  uniform float u_swirl;
  uniform float u_grainMixer;
  uniform float u_grainOverlay;

  varying vec2 vUv;

  #define TWO_PI 6.28318530718
  #define PI 3.14159265358979323846

  vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    float x1 = mix(a, b, u.x);
    float x2 = mix(c, d, u.x);
    return mix(x1, x2, u.y);
  }

  float noise(vec2 n, vec2 seedOffset) {
    return valueNoise(n + seedOffset);
  }

  vec2 getPosition(int i, float t) {
    float a = float(i) * .37;
    float b = .6 + fract(float(i) / 3.) * .9;
    float c = .8 + fract(float(i + 1) / 4.);

    float x = sin(t * b + a);
    float y = cos(t * c + a * 1.5);

    return .5 + .5 * vec2(x, y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 grainUV = uv * 1000.;

    float grain = noise(grainUV, vec2(0.));
    float mixerGrain = .4 * u_grainMixer * (grain - .5);

    float firstFrameOffset = 41.5;
    float t = .5 * (u_time + firstFrameOffset);

    float radius = smoothstep(0., 1., length(uv - .5));
    float center = 1. - radius;
    for (float i = 1.; i <= 2.; i++) {
      uv.x += u_distortion * center / i * sin(t + i * .4 * smoothstep(.0, 1., uv.y)) * cos(.2 * t + i * 2.4 * smoothstep(.0, 1., uv.y));
      uv.y += u_distortion * center / i * cos(t + i * 2. * smoothstep(.0, 1., uv.x));
    }

    vec2 uvRotated = uv;
    uvRotated -= vec2(.5);
    float angle = 3. * u_swirl * radius;
    uvRotated = rotate(uvRotated, -angle);
    uvRotated += vec2(.5);

    vec3 color = vec3(0.);
    float opacity = 0.;
    float totalWeight = 0.;

    for (int i = 0; i < 10; i++) {
      if (float(i) >= u_colorsCount) break;

      vec2 pos = getPosition(i, t) + mixerGrain;
      vec3 colorFraction = u_colors[i].rgb * u_colors[i].a;
      float opacityFraction = u_colors[i].a;

      float dist = length(uvRotated - pos);

      dist = pow(dist, 3.5);
      float weight = 1. / (dist + 1e-3);
      color += colorFraction * weight;
      opacity += opacityFraction * weight;
      totalWeight += weight;
    }

    color /= max(1e-4, totalWeight);
    opacity /= max(1e-4, totalWeight);

    float grainOverlay = valueNoise(rotate(grainUV, 1.) + vec2(3.));
    grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
    grainOverlay = pow(grainOverlay, 1.3);

    float grainOverlayV = grainOverlay * 2. - 1.;
    vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
    float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
    grainOverlayStrength = pow(grainOverlayStrength, .8);
    color = mix(color, grainOverlayColor, .35 * grainOverlayStrength);

    opacity += .5 * grainOverlayStrength;
    opacity = clamp(opacity, 0., 1.);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const colors = [
  new THREE.Vector4(0.0, 0.0, 0.0, 1.0),         // #000000
  new THREE.Vector4(0.102, 0.102, 0.102, 1.0),   // #1a1a1a
  new THREE.Vector4(0.2, 0.2, 0.2, 1.0),         // #333333
  new THREE.Vector4(1.0, 1.0, 1.0, 1.0),         // #ffffff
];

const uniforms = {
  u_time: { value: 0 },
  u_colors: { value: colors },
  u_colorsCount: { value: 4.0 },
  u_distortion: { value: 0.5 },
  u_swirl: { value: 0.3 },
  u_grainMixer: { value: 0.3 },
  u_grainOverlay: { value: 0.3 },
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
});

const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

function animate() {
  requestAnimationFrame(animate);
  uniforms.u_time.value += 0.016;
  renderer.render(scene, camera);
}

animate();

function onResize() {
  if (!container) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
