/** Lazy-loaded WebGL entry for the Lab (shares three.js chunks with the stage). */
import { Canvas } from '@react-three/fiber';
import type { QualityTier } from '../lib/env';
import { LAB_CAM_Z, LAB_FOV, LabExperience } from './LabExperience';

export interface LabCanvasProps {
  animate: boolean;
  visible: boolean;
  quality: QualityTier;
  onReady: () => void;
  onFail: (reason: string) => void;
}

export default function LabCanvas({ animate, visible, quality, onReady, onFail }: LabCanvasProps) {
  return (
    <Canvas
      className="lab-canvas"
      frameloop={!visible ? 'never' : animate ? 'always' : 'demand'}
      dpr={[1, Math.min(quality.maxDpr, 1.75)]}
      camera={{ fov: LAB_FOV, position: [0, 0, LAB_CAM_Z], near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMappingExposure = 1.05;
        gl.debug.onShaderError = (ctx, program, vs, fs) => {
          console.error('[ShaOn] Lab shader failed — using the still fallback.', ctx.getProgramInfoLog(program), ctx.getShaderInfoLog(vs), ctx.getShaderInfoLog(fs));
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
      <LabExperience animate={animate} quality={quality} onFirstFrame={onReady} />
    </Canvas>
  );
}
