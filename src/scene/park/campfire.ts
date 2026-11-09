import * as T from 'three';

export const CAMPFIRE_SPOT = new T.Vector3(0, 0, 2);
export const CAMPFIRE_RADIUS = 1.25;

/** Shared textures and a few sprites keep the evening fire inexpensive on mobile. */
export function createCampfire(scene: T.Scene) {
  const group = new T.Group();
  group.name = 'central-campfire';
  group.position.copy(CAMPFIRE_SPOT);
  scene.add(group);
  const materials: T.Material[] = [];
  const material = (color: string) => {
    const result = new T.MeshStandardMaterial({ color, roughness: 0.95 });
    materials.push(result);
    return result;
  };
  const earth = material('#9a8868'),
    ash = material('#3e3028'),
    bark = material('#493329'),
    cut = material('#bf9563');
  const add = (geometry: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number) => {
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const clearing = add(new T.CircleGeometry(1.55, 48), earth, 0, 0.018, 0);
  clearing.rotation.x = -Math.PI / 2;
  const bed = add(new T.CircleGeometry(1.08, 32), ash, 0, 0.028, 0);
  bed.rotation.x = -Math.PI / 2;
  const stoneMaterials = ['#a6a28c', '#b8b19a', '#908e7c'].map(material);
  const rockGeometry = new T.IcosahedronGeometry(0.3, 1);
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const rock = add(
      rockGeometry,
      stoneMaterials[i % 3],
      Math.cos(angle) * 1.02,
      0.18,
      Math.sin(angle) * 1.02,
    );
    rock.scale.set(0.88 + (i % 3) * 0.09, 0.58 + (i % 2) * 0.15, 0.8);
    rock.rotation.set(0.1 * i, angle, 0.13 * (i % 3));
  }
  const logGeometry = new T.CylinderGeometry(0.17, 0.2, 1.65, 9);
  for (let i = 0; i < 4; i++) {
    const angle = i % 2 ? -0.7 : 0.7;
    const direction = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const center = new T.Vector3(0, 0.23 + Math.floor(i / 2) * 0.24, i % 2 ? -0.22 : 0.22);
    const log = add(logGeometry, bark, center.x, center.y, center.z);
    log.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
    for (const sign of [-1, 1]) {
      const end = center.clone().addScaledVector(direction, sign * 0.83);
      const disc = add(new T.CircleGeometry(0.155, 12), cut, end.x, end.y, end.z);
      disc.quaternion.setFromUnitVectors(
        new T.Vector3(0, 0, 1),
        direction.clone().multiplyScalar(sign),
      );
    }
  }
  // Crossed, softly blended volumes avoid the old repeated flat flame silhouette.
  const flameGeometry = new T.PlaneGeometry(1, 1, 8, 16);
  flameGeometry.translate(0, 0.5, 0);
  const flames = Array.from({ length: 5 }, (_, i) => {
    const mat = new T.ShaderMaterial({
      uniforms: { time: { value: 0 }, phase: { value: i * 2.17 } },
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      vertexShader: `
        varying vec2 flameUv;
        uniform float time; uniform float phase;
        void main() {
          flameUv = uv;
          vec3 p = position;
          p.x += sin(time * 2.8 + phase + uv.y * 5.0) * uv.y * uv.y * 0.12;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        varying vec2 flameUv;
        uniform float time; uniform float phase;
        void main() {
          float y = flameUv.y;
          float sway = sin(y * 9.0 - time * 3.2 + phase) * 0.045 * y;
          float x = abs(flameUv.x - 0.5 + sway);
          float width = 0.43 * pow(max(0.0, 1.0-y), 0.72);
          float edge = 1.0 - smoothstep(width * 0.42, width, x);
          float wisps = 0.83 + 0.17 * sin(y * 18.0 - time * 5.0 + phase);
          float alpha = edge * smoothstep(0.0, 0.08, y) * (1.0-smoothstep(0.8, 1.0, y)) * wisps;
          float core = (1.0-smoothstep(0.0, width * 0.65, x)) * (1.0-y);
          vec3 color = mix(vec3(1.0, 0.21, 0.025), vec3(1.0, 0.77, 0.24), core);
          gl_FragColor = vec4(color, alpha * 0.64);
        }`,
    });
    materials.push(mat);
    const flame = new T.Mesh(flameGeometry, mat);
    flame.name = 'campfire-flame';
    flame.position.set(Math.sin(i * 2.4) * 0.18, 0.36, Math.cos(i * 2.4) * 0.18);
    flame.rotation.y = (i * Math.PI) / 2.5;
    group.add(flame);
    return flame;
  });
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 64;
  const gc = glowCanvas.getContext('2d')!;
  const glow = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, '#ffcc7680');
  glow.addColorStop(0.45, '#ffa84c35');
  glow.addColorStop(1, '#ff9e3900');
  gc.fillStyle = glow;
  gc.fillRect(0, 0, 64, 64);
  const glowTexture = new T.CanvasTexture(glowCanvas);
  const glowMaterial = new T.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  materials.push(glowMaterial);
  const pool = add(new T.PlaneGeometry(7, 7), glowMaterial, 0, 0.035, 0);
  pool.rotation.x = -Math.PI / 2;
  const coalMat = new T.MeshStandardMaterial({
    color: '#642218',
    emissive: '#ff4d13',
    emissiveIntensity: 0,
    roughness: 1,
  });
  materials.push(coalMat);
  const coalGeometry = new T.IcosahedronGeometry(0.12, 0);
  for (let i = 0; i < 12; i++) {
    const angle = i * 2.4,
      r = 0.2 + (i % 4) * 0.15;
    const coal = add(coalGeometry, coalMat, Math.cos(angle) * r, 0.12, Math.sin(angle) * r);
    coal.scale.set(1.4, 0.5, 1);
  }
  const emberPositions = new Float32Array(14 * 3);
  const emberGeometry = new T.BufferGeometry();
  emberGeometry.setAttribute('position', new T.BufferAttribute(emberPositions, 3));
  const emberMaterial = new T.PointsMaterial({
    color: '#ffbd64',
    size: 0.075,
    map: glowTexture,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  materials.push(emberMaterial);
  const embers = new T.Points(emberGeometry, emberMaterial);
  embers.frustumCulled = false;
  group.add(embers);
  const light = new T.PointLight('#ffb45e', 0, 10, 2);
  light.position.set(0, 1.3, 0);
  group.add(light);
  // Default to unlit until the world's current time is supplied.
  flames.forEach((flame) => (flame.visible = false));
  pool.visible = false;
  embers.visible = false;
  return {
    update(night: boolean, time: number, reducedMotion: boolean) {
      const t = reducedMotion ? 0 : time / 1000;
      flames.forEach((flame, i) => {
        flame.visible = night;
        if (!night) return;
        const pulse = Math.sin(t * 3.3 + i * 2.1);
        flame.scale.set(
          0.72 + (i % 2) * 0.24 + pulse * 0.04,
          1.25 + (i === 2 ? 0.65 : i * 0.08) + pulse * 0.13,
          1,
        );
        flame.material.uniforms.time.value = t;
      });
      pool.visible = night;
      light.intensity = night ? 18 + Math.sin(t * 3.3) * 1.6 + Math.sin(t * 7.1) * 0.7 : 0;
      coalMat.emissiveIntensity = night ? 1.2 + Math.sin(t * 2.1) * 0.2 : 0;
      embers.visible = night && !reducedMotion;
      if (embers.visible) {
        for (let i = 0; i < 14; i++) {
          const age = (t * (0.19 + (i % 3) * 0.025) + i / 14) % 1;
          emberPositions[i * 3] = Math.sin(i * 2.4 + age * 3) * (0.12 + age * 0.55);
          emberPositions[i * 3 + 1] = 0.5 + age * 2.1;
          emberPositions[i * 3 + 2] = Math.cos(i * 2.4) * (0.15 + age * 0.35);
        }
        emberGeometry.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      flameGeometry.dispose();
      emberGeometry.dispose();
      const geometries = new Set<T.BufferGeometry>();
      group.traverse((node) => {
        if (node instanceof T.Mesh) geometries.add(node.geometry);
      });
      geometries.delete(flameGeometry);
      geometries.forEach((geometry) => geometry.dispose());
      group.removeFromParent();
      glowTexture.dispose();
      materials.forEach((mat) => mat.dispose());
    },
  };
}
