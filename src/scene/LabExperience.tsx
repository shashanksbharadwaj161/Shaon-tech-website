import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, MeshBasicMaterial, PointLight } from 'three';
import { MARK } from '../brand/markGeometry';
import type { QualityTier } from '../lib/env';
import { labLive, labUniforms, subscribeLab } from '../lib/labParams';
import { damp, lerp } from '../lib/math';
import { createGlow } from './glow';
import { createRibbonGeometry } from './ribbonGeometry';
import { createChromeMaterial } from './ribbonShader';
import { createSignalParticles } from './signalParticles';
import { createStudioEnvironment } from './studioEnvironment';

export const LAB_CAM_Z = 10;
export const LAB_FOV = 30;
const HALF_TAN = Math.tan(((LAB_FOV / 2) * Math.PI) / 180);

interface LabExperienceProps {
  animate: boolean;
  quality: QualityTier;
  onFirstFrame: () => void;
}

/**
 * The Lab: the hero's folded S — same geometry, material and particles — under
 * the visitor's control. Sliders write to `labLive` and invalidate; nothing
 * here causes React renders per frame.
 */
export function LabExperience({ animate, quality, onFirstFrame }: LabExperienceProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const setDpr = useThree((s) => s.setDpr);

  useEffect(() => {
    const env = createStudioEnvironment(gl);
    scene.environment = env.texture;
    invalidate();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, invalidate]);

  const assets = useMemo(() => {
    const ribbon = createRibbonGeometry();
    const chrome = createChromeMaterial(ribbon.spec);
    const { uBend, uRib, uRibLen, uTwist } = chrome.uniforms;
    const particles = createSignalParticles(
      ribbon,
      { uBend, uRib, uRibLen, uTwist },
      Math.round(quality.particles * 0.6),
      Math.round(quality.streaks * 0.6),
      MARK.scale,
    );
    const glow = createGlow();
    return { ribbon, chrome, particles, glow };
  }, [quality.particles, quality.streaks]);

  useEffect(
    () => () => {
      assets.ribbon.geometry.dispose();
      assets.chrome.material.dispose();
      assets.particles.dispose();
      assets.glow.dispose();
    },
    [assets],
  );

  useEffect(() => subscribeLab(() => invalidate()), [invalidate]);

  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const st = useRef({ time: 0, flow: 0, ix: 0, iy: 0, first: true, perfFrames: 0, perfTime: 0, fraction: 1 });

  useFrame((frame, delta) => {
    const s = st.current;
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 20);
    const p = labLive.params;
    const u = labUniforms(p);
    const input = labLive.input;
    if (animate) {
      s.time += dt;
      s.flow += dt * u.flowRate;
    }
    const t = s.time;
    const tx = input.active ? input.x : 0;
    const ty = input.active ? input.y : 0;
    s.ix = animate ? damp(s.ix, tx, 2, dt) : tx;
    s.iy = animate ? damp(s.iy, ty, 2, dt) : ty;
    const energy = animate ? Math.exp(-Math.max(0, performance.now() - input.pressAt) / 380) : 0;

    const { width, height } = frame.size;
    const halfH = LAB_CAM_Z * HALF_TAN;
    const halfW = halfH * (width / height);
    const foldShare = p.fold / 100;
    // Unfolded ribbons are long — keep them in frame.
    const markH = Math.min(2 * halfH * 0.62, 2 * halfW * 0.7) * lerp(0.58, 1, foldShare);

    g.position.set(0, Math.sin(t * 0.6) * 0.03 * markH, 0);
    g.scale.setScalar(markH);
    g.rotation.set(
      0.06 * Math.sin(t * 0.25) - s.iy * 0.28,
      (-0.36 + 0.22 * Math.sin(t * 0.3)) * lerp(0.35, 1, foldShare) + s.ix * 0.55,
      -0.03 * foldShare,
    );
    g.updateMatrixWorld();

    const cu = assets.chrome.uniforms;
    cu.uBend.value = u.bend - (animate ? 0.05 * (1 + Math.sin(t * 0.75)) * foldShare : 0);
    cu.uTwist.value = u.twist;
    cu.uRim.value = u.rim + energy * 0.6;
    cu.uEdgeGlow.value = u.edgeGlow;
    cu.uDissolve.value = 0;
    scene.environmentIntensity = u.environment;
    scene.environmentRotation.set(s.iy * 0.2, u.envRotation + s.ix * 0.7, 0);

    const pu = assets.particles.uniforms;
    pu.uSignal.value.copy(g.matrixWorld);
    pu.uDissolve.value = u.release;
    pu.uStructure.value = 0;
    pu.uProduct.value = 0;
    pu.uFlow.value = s.flow;
    pu.uTime.value = t;
    pu.uSparkle.value = animate ? 0.5 : 0;
    pu.uPixelRatio.value = frame.viewport.dpr;
    pu.uSize.value = Math.max(2, Math.min(3.4, height / 220));
    pu.uField.value.set(0, 0, halfW * 1.25, halfH * 0.75);

    const glow = assets.glow.mesh;
    glow.position.set(s.ix * 0.3, -markH * 0.04, -1.6);
    glow.scale.setScalar(markH * 2.7);
    (glow.material as MeshBasicMaterial).opacity = (0.35 + 0.25 * u.rim + energy * 0.2) * (0.6 + 0.4 * u.environment);

    if (light.current) {
      light.current.position.set(s.ix * halfW * 0.8, s.iy * halfH * 0.8, 2.6);
      light.current.intensity = 18 * u.environment + energy * 50;
    }

    if (animate) {
      s.perfFrames++;
      s.perfTime += delta;
      if (s.perfFrames >= 90) {
        if (s.perfTime / s.perfFrames > 1 / 42) {
          const dpr = frame.viewport.dpr;
          if (dpr > 1.01) setDpr(Math.max(1, dpr - 0.25));
          else if (s.fraction > 0.4) {
            s.fraction -= 0.2;
            assets.particles.setCount(s.fraction);
          }
        }
        s.perfFrames = 0;
        s.perfTime = 0;
      }
    }
    if (s.first) {
      s.first = false;
      requestAnimationFrame(onFirstFrame);
    }
    if (!animate && (Math.abs(s.ix - tx) > 1e-3 || Math.abs(s.iy - ty) > 1e-3)) invalidate();
  });

  return (
    <>
      <primitive object={assets.glow.mesh} />
      <group ref={group}>
        <mesh geometry={assets.ribbon.geometry} material={assets.chrome.material} scale={MARK.scale} frustumCulled={false} />
        <mesh geometry={assets.ribbon.geometry} material={assets.chrome.material} scale={MARK.scale} rotation-z={Math.PI} frustumCulled={false} />
      </group>
      <primitive object={assets.particles.streaks} />
      <primitive object={assets.particles.points} />
      <directionalLight position={[-4, 6, 6]} intensity={1.6} color="#F4F7FB" />
      <pointLight ref={light} color="#326CFF" distance={0} decay={2} intensity={18} />
    </>
  );
}
