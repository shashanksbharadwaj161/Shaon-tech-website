import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineSegments,
  Matrix4,
  Points,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
  Vector4,
  type IUniform,
} from 'three';
import type { Vec2 } from '../brand/markGeometry';
import { samplePreviewOutline, seeded } from '../lib/previewLayout';
import { RIBBON_PARS } from './ribbonShader';
import type { RibbonGeometryResult } from './ribbonGeometry';

const LANES = 11;

export interface ParticleUniforms {
  [key: string]: IUniform;
  uSignal: IUniform<Matrix4>;
  uMarkScale: IUniform<number>;
  uDissolve: IUniform<number>;
  uStructure: IUniform<number>;
  uProduct: IUniform<number>;
  uFlow: IUniform<number>;
  uField: IUniform<Vector4>;
  uFieldDir: IUniform<Vector2>;
  uPreview: IUniform<Vector4>;
  uPixelRatio: IUniform<number>;
  uSize: IUniform<number>;
  uSparkle: IUniform<number>;
  uTime: IUniform<number>;
  uStreak: IUniform<number>;
  uSilver: IUniform<Color>;
  uCobalt: IUniform<Color>;
  uIce: IUniform<Color>;
}

const PARTICLE_PARS = /* glsl */ `
${RIBBON_PARS}
uniform mat4 uSignal;
uniform float uMarkScale;
uniform float uDissolve;
uniform float uStructure;
uniform float uProduct;
uniform float uFlow;
uniform vec4 uField;     // centre xy, half length, half width (world)
uniform vec2 uFieldDir;
uniform vec4 uPreview;   // world left, top, width, height
uniform float uPixelRatio;
uniform float uSize;
uniform float uSparkle;
uniform float uTime;
uniform float uStreak;
uniform vec3 uSilver;
uniform vec3 uCobalt;
uniform vec3 uIce;

attribute vec3 aDev;
attribute float aRibbon;
attribute vec3 aField;
attribute vec2 aWire;
attribute vec4 aRand;

varying float vAlpha;
varying vec3 vColor;

float easeIO(float t) { return t * t * (3.0 - 2.0 * t); }

// Returns the world position and fills alpha / field weight / lane direction.
vec3 particleWorld(out float alpha, out float fieldW, out vec2 laneDir) {
  vec3 local = ribbonPoint(aDev) * uMarkScale;
  if (aRibbon > 0.5) local.xy = -local.xy;
  vec3 surface = (uSignal * vec4(local, 1.0)).xyz;

  float field = dissolveField(aDev.xy);
  float lr = smoothstep(field, field + 0.24, uDissolve);

  vec2 dir = uFieldDir;
  vec2 perp = vec2(-dir.y, dir.x);
  float along = aField.x + uFlow * (0.35 + aRand.x * 0.65);
  along = fract(along * 0.5 + 0.5) * 2.0 - 1.0;
  float edgeFade = 1.0 - smoothstep(0.82, 1.0, abs(along));
  vec3 fieldPos = vec3(uField.xy + dir * along * uField.z + perp * aField.y * uField.w, aField.z);

  float e = easeIO(lr);
  vec3 p = mix(surface, fieldPos, e);
  float arc = sin(lr * 3.14159);
  p += vec3(perp * arc * (aRand.y - 0.5) * 1.1, arc * (aRand.z - 0.35) * 1.6);

  float ls = smoothstep(aRand.z * 0.42, aRand.z * 0.42 + 0.58, uStructure);
  vec3 wire = vec3(uPreview.x + aWire.x * uPreview.z, uPreview.y - aWire.y * uPreview.w, 0.0);
  p = mix(p, wire, easeIO(ls));

  float sparkle = uSparkle * step(aRand.w, 0.07) * (aDev.z > 0.0 ? 1.0 : 0.0)
    * pow(0.5 + 0.5 * sin(uTime * (1.2 + aRand.x * 2.0) + aRand.y * 40.0), 12.0);
  alpha = max(lr * mix(edgeFade, 1.0, ls), sparkle) * (1.0 - uProduct * 0.92);
  fieldW = lr * (1.0 - ls);
  laneDir = dir;
  vColor = mix(mix(uSilver, mix(uCobalt, uIce, aRand.x * 0.8), clamp(lr * 1.4, 0.0, 1.0)), uIce, ls * 0.8);
  return p;
}
`;

const POINTS_VERTEX = /* glsl */ `
${PARTICLE_PARS}
void main() {
  float alpha; float fieldW; vec2 laneDir;
  vec3 p = particleWorld(alpha, fieldW, laneDir);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = uSize * (0.55 + aRand.w * 0.9) * (1.0 + fieldW * 0.6);
  gl_PointSize = size * uPixelRatio * (10.0 / -mv.z);
  vAlpha = alpha;
}
`;

const POINTS_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a = a * a + smoothstep(0.12, 0.0, d) * 0.8;
  if (a * vAlpha < 0.003) discard;
  gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
}
`;

const STREAK_VERTEX = /* glsl */ `
${PARTICLE_PARS}
attribute float aEnd;
void main() {
  float alpha; float fieldW; vec2 laneDir;
  vec3 p = particleWorld(alpha, fieldW, laneDir);
  p.xy -= laneDir * uStreak * fieldW * (0.35 + aRand.y) * aEnd;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  vAlpha = alpha * fieldW * (1.0 - aEnd) * 0.9;
}
`;

const STREAK_FRAGMENT = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
void main() {
  if (vAlpha < 0.003) discard;
  gl_FragColor = vec4(vColor * vAlpha, 1.0);
}
`;

function pointInConvex(poly: readonly Vec2[], x: number, y: number): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false;
  }
  return true;
}

export interface SignalParticles {
  points: Points;
  streaks: LineSegments;
  uniforms: ParticleUniforms;
  setCount: (fraction: number) => void;
  dispose: () => void;
}

/**
 * Particles are born on the ribbon faces (in developed coordinates), released
 * into eleven diagonal lanes at the mark's own 21.6° angle, then pinned onto the
 * interface wireframe. Positions are computed entirely on the GPU from shared
 * uniforms, so the CPU never touches per-particle data after creation.
 */
export function createSignalParticles(
  ribbon: RibbonGeometryResult,
  shared: Record<string, IUniform>,
  count: number,
  streakCount: number,
  markScale: number,
): SignalParticles {
  const rand = seeded(1337);
  const poly = ribbon.faceOutline;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const dev = new Float32Array(count * 3);
  const ribbonId = new Float32Array(count);
  const field = new Float32Array(count * 3);
  const randA = new Float32Array(count * 4);
  const wire = samplePreviewOutline(count, 21);
  const ht = ribbon.thickness / 2;

  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 64; tries++) {
      x = minX + rand() * (maxX - minX);
      y = minY + rand() * (maxY - minY);
      if (pointInConvex(poly, x, y)) break;
    }
    dev[i * 3] = x;
    dev[i * 3 + 1] = y;
    dev[i * 3 + 2] = rand() < 0.72 ? ht : -ht;
    ribbonId[i] = i % 2;
    const lane = Math.floor(rand() * LANES);
    field[i * 3] = rand() * 2 - 1;
    field[i * 3 + 1] = (lane / (LANES - 1)) * 2 - 1 + (rand() - 0.5) * 0.035;
    field[i * 3 + 2] = (rand() - 0.5) * 2.4;
    randA[i * 4] = rand();
    randA[i * 4 + 1] = rand();
    randA[i * 4 + 2] = rand();
    randA[i * 4 + 3] = rand();
  }

  const uniforms: ParticleUniforms = {
    ...shared,
    uSignal: { value: new Matrix4() },
    uMarkScale: { value: markScale },
    uDissolve: { value: 0 },
    uStructure: { value: 0 },
    uProduct: { value: 0 },
    uFlow: { value: 0 },
    uField: { value: new Vector4(0, 0, 6, 2) },
    uFieldDir: { value: new Vector2(Math.cos(0.377), Math.sin(0.377)) },
    uPreview: { value: new Vector4(-2, 1, 4, 2.5) },
    uPixelRatio: { value: 1 },
    uSize: { value: 3.2 },
    uSparkle: { value: 0 },
    uTime: { value: 0 },
    uStreak: { value: 0.9 },
    uSilver: { value: new Color('#E9EEF6') },
    uCobalt: { value: new Color('#326CFF') },
    uIce: { value: new Color('#8ACBFF') },
  } as ParticleUniforms;

  const bounds = new Sphere(new Vector3(), 1e4);

  const pointsGeometry = new BufferGeometry();
  // `position` is required by three for draw-range bookkeeping; real positions come from the shader.
  pointsGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3));
  pointsGeometry.setAttribute('aDev', new Float32BufferAttribute(dev, 3));
  pointsGeometry.setAttribute('aRibbon', new Float32BufferAttribute(ribbonId, 1));
  pointsGeometry.setAttribute('aField', new Float32BufferAttribute(field, 3));
  pointsGeometry.setAttribute('aWire', new Float32BufferAttribute(wire, 2));
  pointsGeometry.setAttribute('aRand', new Float32BufferAttribute(randA, 4));
  pointsGeometry.boundingSphere = bounds;

  const pointsMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: POINTS_VERTEX,
    fragmentShader: POINTS_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(pointsGeometry, pointsMaterial);
  points.frustumCulled = false;
  points.renderOrder = 2;

  // Streaks: two vertices per particle (head, tail) for the first `streakCount` particles.
  const s = Math.min(streakCount, count);
  const dup = (src: Float32Array, size: number) => {
    const out = new Float32Array(s * 2 * size);
    for (let i = 0; i < s; i++) {
      for (let k = 0; k < size; k++) {
        out[i * 2 * size + k] = src[i * size + k]!;
        out[i * 2 * size + size + k] = src[i * size + k]!;
      }
    }
    return out;
  };
  const end = new Float32Array(s * 2);
  for (let i = 0; i < s; i++) end[i * 2 + 1] = 1;
  const streakGeometry = new BufferGeometry();
  streakGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(s * 2 * 3), 3));
  streakGeometry.setAttribute('aDev', new Float32BufferAttribute(dup(dev, 3), 3));
  streakGeometry.setAttribute('aRibbon', new Float32BufferAttribute(dup(ribbonId, 1), 1));
  streakGeometry.setAttribute('aField', new Float32BufferAttribute(dup(field, 3), 3));
  streakGeometry.setAttribute('aWire', new Float32BufferAttribute(dup(wire, 2), 2));
  streakGeometry.setAttribute('aRand', new Float32BufferAttribute(dup(randA, 4), 4));
  streakGeometry.setAttribute('aEnd', new Float32BufferAttribute(end, 1));
  streakGeometry.boundingSphere = bounds;
  const streakMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: STREAK_VERTEX,
    fragmentShader: STREAK_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const streaks = new LineSegments(streakGeometry, streakMaterial);
  streaks.frustumCulled = false;
  streaks.renderOrder = 1;

  return {
    points,
    streaks,
    uniforms,
    setCount: (fraction) => {
      pointsGeometry.setDrawRange(0, Math.floor(count * fraction));
      streakGeometry.setDrawRange(0, Math.floor(s * fraction) * 2);
    },
    dispose: () => {
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      streakGeometry.dispose();
      streakMaterial.dispose();
    },
  };
}
