/**
 * Lazy-loaded entry for everything three.js. Nothing in this module is imported
 * by the initial bundle, so the page is readable before WebGL code arrives.
 */
import { Canvas } from '@react-three/fiber';
import type { QualityTier } from '../lib/env';
import { CAM_Z, Experience, FOV } from './Experience';

export interface StageCanvasProps {
  animate: boolean;
  interactive: boolean;
  /** False when the stage is off-screen or the tab is hidden: the loop stops entirely. */
  visible: boolean;
  quality: QualityTier;
  onReady: () => void;
  onFail: (reason: string) => void;
}

export default function StageCanvas({ animate, interactive, visible, quality, onReady, onFail }: StageCanvasProps) {
  const frameloop = !visible ? 'never' : animate ? 'always' : 'demand';
  return (
    <Canvas
      className="stage__canvas"
      frameloop={frameloop}
      dpr={[1, quality.maxDpr]}
      camera={{ fov: FOV, position: [0, 0, CAM_Z], near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMappingExposure = 1.05;
        gl.debug.onShaderError = (ctx, program, vs, fs) => {
          console.error(
            '[ShaOn] WebGL shader failed to compile — switching to the SVG fallback.',
            ctx.getProgramInfoLog(program),
            ctx.getShaderInfoLog(vs),
            ctx.getShaderInfoLog(fs),
          );
          onFail('shader-error');
        };
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
            onFail('context-lost');
          },
          { once: true },
        );
      }}
    >
      <Experience animate={animate} interactive={interactive} quality={quality} onFirstFrame={onReady} />
    </Canvas>
  );
}
