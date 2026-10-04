import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, type MeshBasicMaterial, type PerspectiveCamera, type PointLight } from 'three';
import { MARK } from '../brand/markGeometry';
import type { QualityTier } from '../lib/env';
import { live, pressEnergy, scrollVelocity, subscribeLive } from '../lib/liveState';
import { clamp, damp, easeInOutCubic, lerp } from '../lib/math';
import { heroPose, mixPose, storyPose, type ScreenPose } from '../lib/stagePose';
import { createRibbonGeometry } from './ribbonGeometry';
import { createChromeMaterial } from './ribbonShader';
import { createSignalParticles } from './signalParticles';
import { createGlow } from './glow';
import { createStudioEnvironment } from './studioEnvironment';

export const CAM_Z = 10;
export const FOV = 30;
const HALF_TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

export interface ExperienceProps {
  /** Autonomous motion (idle drift, flow). False when paused or reduced. */
  animate: boolean;
  /** Pointer-driven light / tilt. */
  interactive: boolean;
  quality: QualityTier;
  onFirstFrame: () => void;
}

export function Experience({ animate, interactive, quality, onFirstFrame }: ExperienceProps) {
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
      quality.particles,
      quality.streaks,
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

  // Re-render on scroll / pointer / layout when the loop is not running continuously.
  useEffect(() => subscribeLive(() => invalidate()), [invalidate]);

  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const state = useRef({
    time: 0,
    px: 0,
    py: 0,
    first: true,
    perfFrames: 0,
    perfTime: 0,
    particleFraction: 1,
  });

  useFrame((frameState, delta) => {
    const s = state.current;
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 20);
    if (animate) s.time += dt;
    const t = s.time;
    const f = live.frame;
    const { width, height } = frameState.size;
    const camera = frameState.camera as PerspectiveCamera;
    const halfH = CAM_Z * HALF_TAN;
    const halfW = halfH * (width / height);
    const toWorld = (p: ScreenPose) => ({ x: (p.x * 2 - 1) * halfW, y: -(p.y * 2 - 1) * halfH, h: p.h * 2 * halfH });

    // Pointer, damped. Snaps when motion is not animated so a single demand frame is final.
    const tx = interactive && live.pointer.active ? live.pointer.x : 0;
    const ty = interactive && live.pointer.active ? live.pointer.y : 0;
    // Touch gets a slightly softer follow, so a finger lifting off settles with inertia.
    const follow = live.pointer.kind === 'touch' ? 1.7 : 2.6;
    s.px = animate ? damp(s.px, tx, follow, dt) : tx;
    s.py = animate ? damp(s.py, ty, follow, dt) : ty;
    // A tap or press pulses the light; native scroll speed adds a restrained twist.
    const energy = interactive ? pressEnergy() : 0;
    const sv = interactive ? clamp(scrollVelocity() / 2400, -1, 1) : 0;

    const u = f.unfold;
    const ue = easeInOutCubic(u);
    const r = f.release;
    const idle = 1 - u;

    // --- Object: hero pose → story pose, folded → unfolded ---------------
    const storyScreen = storyPose(width, height, live.preview);
    const pose = toWorld(mixPose(heroPose(width, height, window.innerWidth, window.innerHeight), storyScreen, easeInOutCubic(f.hero)));
    const bob = Math.sin(t * 0.6) * 0.03 * pose.h * idle;
    // While unfolded the beams are long: shrink a little and lean away from the copy column.
    g.position.set(pose.x + ue * (1 - r) * pose.h * 0.12, pose.y + bob, 0);
    g.scale.setScalar(pose.h * lerp(1, 0.62, ue));
    g.rotation.set(
      (0.07 * Math.sin(t * 0.27) - s.py * 0.18) * idle,
      (-0.42 + 0.27 * Math.sin(t * 0.31) + s.px * 0.32 + sv * 0.16) * (1 - 0.9 * ue) + 0.12 * Math.sin(Math.PI * u),
      (-0.035 + 0.025 * Math.sin(t * 0.21)) * idle,
    );
    g.updateMatrixWorld();

    // --- Material ---------------------------------------------------------
    const cu = assets.chrome.uniforms;
    cu.uBend.value = Math.PI * (1 - ue) - 0.07 * (1 + Math.sin(t * 0.75)) * idle;
    cu.uTwist.value = (0.045 * Math.sin(t * 0.5) + sv * 0.07) * idle + 0.2 * Math.sin(Math.PI * u);
    cu.uDissolve.value = r * 1.14;
    cu.uRim.value = 0.45 + 0.45 * u + 0.9 * r + energy * 0.75 * (1 - r);
    cu.uEdgeGlow.value = 0.28 + 0.75 * u;
    cu.uLightPhase.value = t * 0.13 + f.hero * 0.3 + s.px * 0.12;
    cu.uLightEnergy.value = (0.8 + energy * 0.75) * (1 - r);
    scene.environmentRotation.set(s.py * 0.18, 0.3 * Math.sin(t * 0.11) + s.px * 0.55 + f.q * 1.5 + f.hero * 0.6, 0);

    // --- Particles --------------------------------------------------------
    const pu = assets.particles.uniforms;
    pu.uSignal.value.copy(g.matrixWorld);
    pu.uDissolve.value = cu.uDissolve.value;
    pu.uStructure.value = f.structure;
    pu.uProduct.value = f.product;
    pu.uFlow.value = t * 0.03 + f.q * 0.55;
    pu.uTime.value = t;
    pu.uSparkle.value = animate ? 0.85 * idle : 0;
    pu.uPixelRatio.value = frameState.viewport.dpr;
    pu.uSize.value = Math.max(2.2, Math.min(3.6, height / 260));
    const story = toWorld(storyScreen);
    pu.uField.value.set(story.x * 0.4, story.y * 0.6, halfW * 1.35, halfH * 0.7);
    const pv = live.preview;
    if (pv && pv.width > 0) {
      pu.uPreview.value.set(
        (pv.x / width) * 2 * halfW - halfW,
        halfH - (pv.y / height) * 2 * halfH,
        (pv.width / width) * 2 * halfW,
        (pv.height / height) * 2 * halfH,
      );
    }

    // --- Glow behind the object --------------------------------------------
    const glow = assets.glow.mesh;
    glow.position.set(pose.x + s.px * 0.25, pose.y - pose.h * 0.05 + s.py * 0.2, -1.6);
    glow.scale.setScalar(pose.h * (2.6 + 0.8 * u));
    (glow.material as MeshBasicMaterial).opacity = (0.42 + 0.25 * u + energy * 0.22) * (1 - r * 0.85);

    // --- Camera: orbit in while unfolding, drift back for the field, rest for the product.
    const c1 = u * (1 - r);
    const c2 = r * (1 - f.structure);
    const focus = Math.min(1, c1 + c2) * 0.55;
    const yaw = 0.2 * c1 - 0.1 * c2;
    const dist = CAM_Z - 1.3 * c1 + 0.5 * c2;
    const fx = pose.x * focus;
    const fy = pose.y * focus;
    camera.position.set(fx + Math.sin(yaw) * dist, fy + 0.3 * c2, Math.cos(yaw) * dist);
    camera.lookAt(fx, fy, 0);
    camera.rotateZ(-0.05 * c2);

    // --- Pointer light: a cobalt bounce that follows the visitor ------------
    if (light.current) {
      light.current.position.set(s.px * halfW * 0.85, s.py * halfH * 0.85, 2.6);
      light.current.intensity = ((interactive ? 26 : 12) + energy * 46) * (1 - r);
    }

    // --- Adaptive quality ----------------------------------------------------
    if (animate) {
      s.perfFrames++;
      s.perfTime += delta;
      if (s.perfFrames >= 90) {
        const avg = s.perfTime / s.perfFrames;
        if (avg > 1 / 42) {
          const dpr = frameState.viewport.dpr;
          if (dpr > 1.01) setDpr(Math.max(1, dpr - 0.25));
          else if (s.particleFraction > 0.4) {
            s.particleFraction -= 0.2;
            assets.particles.setCount(s.particleFraction);
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

    // In demand mode, keep rendering until the damped values settle.
    if (!animate && (Math.abs(s.px - tx) > 1e-3 || Math.abs(s.py - ty) > 1e-3)) invalidate();
  });

  return (
    <>
      <primitive object={assets.glow.mesh} />
      <group ref={group}>
        <mesh geometry={assets.ribbon.geometry} material={assets.chrome.material} scale={MARK.scale} frustumCulled={false} />
        <mesh
          geometry={assets.ribbon.geometry}
          material={assets.chrome.material}
          scale={MARK.scale}
          rotation-z={Math.PI}
          frustumCulled={false}
        />
      </group>
      <primitive object={assets.particles.streaks} />
      <primitive object={assets.particles.points} />
      <directionalLight position={[-4, 6, 6]} intensity={1.6} color="#F4F7FB" />
      <pointLight ref={light} color="#326CFF" distance={0} decay={2} intensity={20} />
    </>
  );
}
