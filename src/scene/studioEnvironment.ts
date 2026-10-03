import {
  BackSide,
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';

interface Panel {
  size: [number, number];
  position: [number, number, number];
  color: string;
  intensity: number;
}

/**
 * A dark photographic studio built from emissive panels: overhead softbox,
 * tall white strips for crisp chrome highlights, and cobalt / ice panels that
 * put the electric-blue bounce on the edges. Rendered once into a PMREM
 * environment map — no external HDR files.
 */
const PANELS: Panel[] = [
  // Large frontal softbox behind the camera: what the faces mostly reflect → polished silver.
  // Split by a dark horizon band so flat faces read as chrome, not paint.
  { size: [15, 3.2], position: [-1.5, 3.9, 9.5], color: '#F4F7FB', intensity: 2.4 },
  { size: [15, 0.9], position: [-1.5, 1.05, 9.5], color: '#AAB5C7', intensity: 1.4 },
  { size: [9, 1.4], position: [2.5, -2.4, 9.6], color: '#FFFFFF', intensity: 1.6 },
  { size: [0.5, 7], position: [-5.2, 0.8, 9.4], color: '#FFFFFF', intensity: 4.5 },
  // Overhead strip and tall side strips for crisp highlights along the folds.
  { size: [9, 2.4], position: [0, 6.5, 1], color: '#FFFFFF', intensity: 3.6 },
  { size: [0.8, 9], position: [-7.5, 1, 2.5], color: '#F4F7FB', intensity: 5.5 },
  { size: [0.35, 8], position: [-6.2, 0.5, -4.5], color: '#F4F7FB', intensity: 3 },
  // Cobalt / ice: the electric-blue edges and floor bounce.
  { size: [0.5, 9], position: [7.6, 0.5, 1.5], color: '#8ACBFF', intensity: 4.4 },
  { size: [11, 2.6], position: [1, -1.6, -8.5], color: '#326CFF', intensity: 7 },
  { size: [12, 1.6], position: [0, -5.5, 4], color: '#326CFF', intensity: 4.5 },
  { size: [1.6, 1.1], position: [4.2, 3.6, 7.2], color: '#FFFFFF', intensity: 9 },
  { size: [3.5, 0.25], position: [2, 2.2, -8.2], color: '#8ACBFF', intensity: 6 },
];

export function createStudioEnvironment(renderer: WebGLRenderer): { texture: Texture; dispose: () => void } {
  const scene = new Scene();
  const disposables: { dispose: () => void }[] = [];

  const roomGeometry = new BoxGeometry(22, 14, 22);
  const roomMaterial = new MeshBasicMaterial({ color: new Color('#0B0F18'), side: BackSide });
  scene.add(new Mesh(roomGeometry, roomMaterial));
  disposables.push(roomGeometry, roomMaterial);

  const plane = new PlaneGeometry(1, 1);
  disposables.push(plane);
  for (const p of PANELS) {
    const material = new MeshBasicMaterial({ color: new Color(p.color).multiplyScalar(p.intensity), toneMapped: false });
    const mesh = new Mesh(plane, material);
    mesh.scale.set(p.size[0], p.size[1], 1);
    mesh.position.set(...p.position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    disposables.push(material);
  }

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());

  return {
    texture: target.texture,
    dispose: () => target.dispose(),
  };
}
