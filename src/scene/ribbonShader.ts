/**
 * GLSL shared by the chrome ribbon and the particles, so a particle sampled on
 * the surface sits exactly where that point of the ribbon is — at any bend —
 * and leaves the surface exactly when that spot dissolves.
 *
 * `ribbonFrame` mirrors `foldPoint` in brand/markGeometry.ts.
 */
import { Color, MeshPhysicalMaterial, Vector4, type IUniform } from 'three';
import type { RibbonSpec } from '../brand/markGeometry';

export const RIBBON_PARS = /* glsl */ `
uniform float uBend;
uniform vec4 uRib;      // x: start x, y: back length, z: wrap length, w: fold radius
uniform float uRibLen;  // total developed length
uniform float uTwist;

void ribbonFrame(float xi, out vec3 centre, out vec3 heading, out vec3 outward) {
  float L1 = uRib.y;
  float Lz = uRib.z;
  vec2 c = vec2(uRib.x - min(xi, L1), -uRib.w);
  float a = 0.0;
  if (xi > L1) {
    float s = min(xi - L1, Lz);
    float k = uBend / Lz;
    if (abs(k) < 1e-4) {
      c.x -= s;
    } else {
      float r = 1.0 / k;
      a = k * s;
      c += vec2(-r * sin(a), r * (1.0 - cos(a)));
    }
    float rest = xi - L1 - Lz;
    if (rest > 0.0) c += rest * vec2(-cos(uBend), sin(uBend));
  }
  heading = vec3(-cos(a), 0.0, sin(a));
  outward = vec3(-sin(a), 0.0, -cos(a));
  centre = vec3(c.x, 0.0, c.y);
}

vec3 ribbonTwist(vec3 p, float ang) {
  float c = cos(ang);
  float s = sin(ang);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 ribbonPoint(vec3 dev) {
  vec3 c; vec3 h; vec3 o;
  ribbonFrame(dev.x, c, h, o);
  return ribbonTwist(c + vec3(0.0, dev.y, 0.0) + dev.z * o, uTwist * dev.y);
}

float rbHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float rbNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(rbHash(i), rbHash(i + vec2(1.0, 0.0)), u.x),
             mix(rbHash(i + vec2(0.0, 1.0)), rbHash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// 0..1. Low values dissolve first: the release starts at the central slit
// (the front bands' free ends) and travels out through the folds.
float dissolveField(vec2 dev) {
  float sweep = 1.0 - clamp(dev.x / uRibLen, 0.0, 1.0);
  float n = rbNoise(dev * vec2(1.6, 2.6)) * 0.62 + rbNoise(dev * 5.3 + 11.0) * 0.38;
  return clamp(mix(n, sweep, 0.58), 0.0, 1.0);
}
`;

export interface ChromeUniforms {
  [key: string]: IUniform;
  uBend: IUniform<number>;
  uRib: IUniform<Vector4>;
  uRibLen: IUniform<number>;
  uTwist: IUniform<number>;
  uDissolve: IUniform<number>;
  uRim: IUniform<number>;
  uRimColor: IUniform<Color>;
  uEdgeGlow: IUniform<number>;
  uEdgeColor: IUniform<Color>;
  uBurnColor: IUniform<Color>;
  /** A studio light travels along the developed ribbon, following its fold. */
  uLightPhase: IUniform<number>;
  uLightEnergy: IUniform<number>;
}

export function ribbonUniforms(spec: RibbonSpec) {
  return {
    uBend: { value: Math.PI },
    uRib: { value: new Vector4(spec.params.outerReach, spec.backLength, spec.wrapLength, spec.params.foldRadius) },
    uRibLen: { value: spec.length },
    uTwist: { value: 0 },
  };
}

/**
 * Polished silver with electric-blue edges: a physical metal whose geometry is
 * bent in the vertex shader, plus a fresnel rim, chamfer glow and a burning
 * dissolve front, all injected into three's standard PBR pipeline.
 */
export function createChromeMaterial(spec: RibbonSpec): { material: MeshPhysicalMaterial; uniforms: ChromeUniforms } {
  const uniforms: ChromeUniforms = {
    ...ribbonUniforms(spec),
    uDissolve: { value: 0 },
    uRim: { value: 0.55 },
    uRimColor: { value: new Color('#326CFF') },
    uEdgeGlow: { value: 0.35 },
    uEdgeColor: { value: new Color('#5E8DFF') },
    uBurnColor: { value: new Color('#8ACBFF') },
    uLightPhase: { value: 0 },
    uLightEnergy: { value: 0 },
  };

  const material = new MeshPhysicalMaterial({
    color: new Color('#E9EEF6'),
    metalness: 1,
    roughness: 0.14,
    clearcoat: 0.6,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 aDev;
attribute vec3 aDevNormal;
attribute float aEdge;
varying vec2 vDev;
varying float vEdge;
${RIBBON_PARS}`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `vec3 rbCentre; vec3 rbHeading; vec3 rbOutward;
ribbonFrame(aDev.x, rbCentre, rbHeading, rbOutward);
vec3 objectNormal = normalize(aDevNormal.x * rbHeading + vec3(0.0, aDevNormal.y, 0.0) + aDevNormal.z * rbOutward);
objectNormal = ribbonTwist(objectNormal, uTwist * aDev.y);
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = ribbonTwist(rbCentre + vec3(0.0, aDev.y, 0.0) + aDev.z * rbOutward, uTwist * aDev.y);
vDev = aDev.xy;
vEdge = aEdge;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec2 vDev;
varying float vEdge;
uniform float uDissolve;
uniform float uRim;
uniform vec3 uRimColor;
uniform float uEdgeGlow;
uniform vec3 uEdgeColor;
uniform vec3 uBurnColor;
uniform float uLightPhase;
uniform float uLightEnergy;
${RIBBON_PARS}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
float rbField = dissolveField(vDev);
if (uDissolve > 0.0 && rbField < uDissolve) discard;
float rbBurn = uDissolve > 0.0 ? 1.0 - smoothstep(0.0, 0.085, rbField - uDissolve) : 0.0;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
float rbFres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.4);
totalEmissiveRadiance += uRimColor * rbFres * uRim;
totalEmissiveRadiance += uEdgeColor * vEdge * uEdgeGlow * (0.35 + 0.65 * rbFres);
// Light runs along the actual ribbon coordinates, so it follows the crease
// through the native-scroll unfold rather than drifting over the silhouette.
float rbTravel = fract(vDev.x / uRibLen - uLightPhase);
float rbDistance = min(rbTravel, 1.0 - rbTravel);
float rbLight = 1.0 - smoothstep(0.008, 0.06, rbDistance);
float rbLightHalo = 1.0 - smoothstep(0.03, 0.19, rbDistance);
totalEmissiveRadiance += uRimColor * rbLightHalo * uLightEnergy * (0.12 + 0.25 * rbFres);
totalEmissiveRadiance += uBurnColor * rbLight * uLightEnergy * (0.06 + 0.7 * vEdge + 0.3 * rbFres);
totalEmissiveRadiance += uBurnColor * rbBurn * 3.2;`,
      );
  };
  material.customProgramCacheKey = () => 'shaon-chrome-ribbon-2';

  return { material, uniforms };
}
