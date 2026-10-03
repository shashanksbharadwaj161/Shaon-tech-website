import { AdditiveBlending, CanvasTexture, Color, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';

/** Soft cobalt light pool placed behind the chrome object. */
export function createGlow(): { mesh: Mesh; dispose: () => void } {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  const geometry = new PlaneGeometry(1, 1);
  const material = new MeshBasicMaterial({
    map: texture,
    color: new Color('#326CFF'),
    transparent: true,
    opacity: 0.5,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = -1;
  return {
    mesh,
    dispose: () => {
      texture.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}

