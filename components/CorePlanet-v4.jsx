'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyCorePlanetMaterials } from './corePlanetMaterials';
import { createSparkleRotation } from './corePlanetAnimations';
import styles from './CorePlanet.module.css';

// ===== SPARKLE SETTINGS (EDIT THESE ONLY) ==============================
// These are REAL multipliers: no silent size/brightness/ray-length caps.
// SIZE changes the bright white core AND its halo, not just invisible padding.
// RAY_LENGTH changes a separate light-streak sprite, not the gemstone geometry.
const SPARKLE_COUNT = 60;          // Total distributed around sphere (~half camera-facing)
const SPARKLE_SIZE = 4.0;          // 1 = delicate; 3 = noticeably large; 5 = dramatic
const SPARKLE_DEPTH = 3;        // Thickness and angular specular response of 3D microfacets
const SPARKLE_RAY_LENGTH = 1;    // 1 = short; 3.5 = long thin streaks; no 1.5 cap
const SPARKLE_BRIGHTNESS = 2.0;    // 1 = gentle; 2 = strong; 3+ = intense

// Optional fine-tuning. These also work directly from the top of this file.
const SPARKLE_CORE_SIZE = 0.7;     // Physical size of the white-hot center
const SPARKLE_HALO_SIZE = 2.0;     // Width of the soft light surrounding each glint
const SPARKLE_RAY_THICKNESS = 0.75;// Lower = finer hairline rays; higher = broader
const SPARKLE_TWINKLE_SPEED = 1.5; // 0.5 slow; 1 normal; 2 faster
// =====================================================================

const SPARKLE_COLORS = ['#ffffff', '#fff9ff', '#ffe9fc', '#eef2ff', '#fff4f9'];
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Core glow and diffraction rays use SEPARATE procedural, additive sprites.
// Previously the shader drew a tiny light spot in a large transparent quad,
// while ray reach was clamped at 1.5. Here the WHITE CORE occupies a useful
// portion of its sprite and the RAYS scale independently without any cap.
function makeDiffractionMaterial(color, angle, rays = false) {
  return new THREE.ShaderMaterial({
    name: rays ? 'Fine streaks / real ray-length control' : 'White core / real size control',
    uniforms: {
      uColor: { value: color },
      uBrightness: { value: 0 },
      uAngle: { value: angle },
      uCoreSize: { value: SPARKLE_CORE_SIZE },
      uHaloSize: { value: SPARKLE_HALO_SIZE },
      uRayThickness: { value: SPARKLE_RAY_THICKNESS },
      uRayLength: { value: SPARKLE_RAY_LENGTH },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        // View-aligned optical highlight; parent still follows sphere rotation.
        vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 worldSize = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
        center.xy += position.xy * worldSize;
        gl_Position = projectionMatrix * center;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uBrightness;
      uniform float uAngle;
      uniform float uCoreSize;
      uniform float uHaloSize;
      uniform float uRayThickness;
      uniform float uRayLength;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float c = cos(uAngle), s = sin(uAngle);
        vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
        float alpha;
        if (${rays ? 'true' : 'false'}) {
          // One-pixel-ish tapered hairlines, never solid white polygon spikes.
          // The ray sprite is resized separately by SPARKLE_RAY_LENGTH.
          float thin = max(0.0005, 0.010 * uRayThickness /
            sqrt(max(0.01, uRayLength)));
          float vertical = exp(-pow(abs(q.x) / thin, 1.35)) *
            exp(-pow(abs(q.y) / 0.44, 1.45));
          float horizontal = exp(-pow(abs(q.y) / thin, 1.35)) *
            exp(-pow(abs(q.x) / 0.40, 1.45));
          alpha = (0.38 * vertical + 0.33 * horizontal) *
            (1.0 - smoothstep(0.79, 0.99, length(p)));
        } else {
          // Wider Gaussian cores. SIZE scales the sprite; CORE_SIZE and
          // HALO_SIZE tune the actual visible white/soft light separately.
          float brightR2 = dot(p, p) / pow(max(0.05, uCoreSize), 2.0);
          float haloR2 = dot(p, p) / pow(max(0.05, uHaloSize), 2.0);
          float pin = exp(-230.0 * brightR2);
          float core = exp(-50.0 * brightR2);
          float halo = exp(-11.0 * haloR2);
          alpha = (0.82 * pin + 0.56 * core + 0.065 * halo) *
            (1.0 - smoothstep(0.74, 0.99, length(p)));
        }
        alpha *= max(0.0, uBrightness);
        if (alpha < 0.002) discard;
        // Additive light, not an opaque white shape. uBrightness is NOT
        // capped at 1.2; bright settings saturate naturally on screen.
        gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.96), clamp(alpha, 0.0, 1.0));
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Replace SphereSparkle's old tiled PNG with sparse, microscopic, real 3D
 * crystal facets. Bright *light reflections* are procedural ShaderMaterials
 * rendered over the crystals (not big solid star shapes).
 * Two glints also get genuine, moving point lights. The original GLB node
 * remains as an invisible animated pivot, preserving the 0.4x orbit speed.
 */
function createPhysicalSparkles(pivot, globe, keyLight) {
  if (!pivot?.isMesh || !globe?.isMesh) return null;
  // The old sparkle mesh can have a different radius than the visible shell.
  // That was why the crystals floated outside it. Use the visible shell instead.
  globe.geometry.computeBoundingSphere();
  const bounds = globe.geometry.boundingSphere;
  if (!bounds || !(bounds.radius > 0)) return null;
  pivot.updateWorldMatrix(true, false);
  globe.updateWorldMatrix(true, false);
  const globeScale = new THREE.Vector3();
  const pivotScale = new THREE.Vector3();
  globe.getWorldScale(globeScale);
  pivot.getWorldScale(pivotScale);
  const globeWorldRadius = bounds.radius * Math.min(globeScale.x, globeScale.y, globeScale.z);
  const pivotScaleAverage = (pivotScale.x + pivotScale.y + pivotScale.z) / 3;
  const radius = globeWorldRadius / Math.max(0.00001, pivotScaleAverage);
  const center = pivot.worldToLocal(globe.localToWorld(bounds.center.clone()));

  const previousMaterial = pivot.material;
  pivot.material = new THREE.MeshBasicMaterial({
    name: 'Invisible old SphereSparkle surface (animation pivot)',
    visible: false,
    depthWrite: false,
  });
  for (const material of [previousMaterial].flat().filter(Boolean)) material.dispose();

  // Solid 3D gemstone: just a few pixels in the viewer, so its facets read as
  // sparkle sources rather than an oversized white cartoon star.
  const crystalGeometry = new THREE.IcosahedronGeometry(1, 0);
  const zAxis = new THREE.Vector3(0, 0, 1);
  const worldUp = new THREE.Vector3(0, 1, 0);
  const alternateUp = new THREE.Vector3(1, 0, 0);
  const items = [];

  for (let index = 0; index < SPARKLE_COUNT; index += 1) {
    // Fibonacci-sphere placement avoids tiling and keeps the density sparse.
    const height = 1 - (2 * (index + 0.5)) / SPARKLE_COUNT;
    const radial = Math.sqrt(Math.max(0, 1 - height * height));
    const longitude = index * GOLDEN_ANGLE + 0.42;
    const normal = new THREE.Vector3(
      radial * Math.cos(longitude), height, radial * Math.sin(longitude),
    );
    const larger = index % 5 === 1;
    const color = new THREE.Color(SPARKLE_COLORS[index % SPARKLE_COLORS.length]);
    const group = new THREE.Group();
    group.name = `RealisticSparkle_${index + 1}`;
    // The visible flash is fixed to the shell. Push only 0.2% beyond it to
    // avoid Z-fighting; the gray 3D source is never visible while unlit.
    group.position.copy(center).addScaledVector(normal, radius * 1.002);
    group.quaternion.setFromUnitVectors(zAxis, normal);
    pivot.add(group);

    // A small microfacet tilt changes the specular flash when the user spins
    // the planet. Its direction is stable in 3D, not an arbitrary screen wiggle.
    const tangent = new THREE.Vector3().crossVectors(
      normal, Math.abs(normal.y) < 0.92 ? worldUp : alternateUp,
    ).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const facetNormal = normal.clone()
      .addScaledVector(tangent, 0.32 * Math.sin(index * 2.31))
      .addScaledVector(bitangent, 0.32 * Math.cos(index * 1.67))
      .normalize();

    // White glint SIZE can grow freely; don't enlarge the hidden faceted
    // source just as quickly or it becomes a visible floating polygon chip.
    const gemSize = radius * (larger ? 0.0042 : 0.0028) *
      Math.sqrt(Math.max(0.01, SPARKLE_SIZE));
    const crystalMaterial = new THREE.MeshPhysicalMaterial({
      name: `Tiny faceted 3D crystal ${index + 1}`,
      color: 0xffffff,
      metalness: 0.06,
      roughness: 0.07,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0,
      flatShading: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystal.name = 'MicroFacetedGemstone';
    crystal.scale.set(gemSize, gemSize, gemSize * SPARKLE_DEPTH);
    crystal.renderOrder = 12;
    crystal.visible = false; // Only revealed for a fraction of a bright flash.
    crystal.raycast = () => {}; // Sparkles are decoration, not clickable objects.
    group.add(crystal);

    // A camera-facing, *procedural light effect* around the true 3D facet.
    // It has no polygon silhouette and produces no texture loading requests.
    // The size setting scales the real visible white center and halo.
    // Separate sprites mean RAY_LENGTH NEVER needs to affect the core size.
    const flareMaterial = makeDiffractionMaterial(color, index * 0.69);
    const flare = new THREE.Sprite(flareMaterial);
    flare.name = 'WhiteSpecularCoreAndHalo';
    const size = radius * (larger ? 0.15 : 0.11) * Math.max(0.01, SPARKLE_SIZE);
    flare.scale.set(size, size, 1);
    flare.position.z = gemSize * 0.2;
    flare.renderOrder = 13;
    flare.raycast = () => {}; // Do not expand click areas beyond the sphere.
    group.add(flare);

    // Ray length is now an UNBOUNDED physical multiplier of its own sprite.
    // Increasing 1 -> 3.5 makes the streaks 3.5x longer, while the core
    // remains unchanged. The streak shader tapers rays to transparency.
    const rayMaterial = makeDiffractionMaterial(color, index * 0.69, true);
    const rays = new THREE.Sprite(rayMaterial);
    rays.name = 'FineOpticalStreaks';
    const rayScale = Math.max(0.01, SPARKLE_RAY_LENGTH);
    rays.scale.set(size * rayScale, size * rayScale, 1);
    rays.position.z = gemSize * 0.25;
    rays.renderOrder = 14;
    rays.raycast = () => {};
    group.add(rays);

    // Only two genuine point lights; more lights cost much more on mobile.
    let light = null;
    if (index === 5 || index === 13) {
      light = new THREE.PointLight(color, 0, radius * 2.5, 2);
      light.name = `RealSpecularPointLight_${index + 1}`;
      light.position.z = radius * 0.005;
      group.add(light);
    }
    items.push({ group, normal, facetNormal, crystal, crystalMaterial,
      flareMaterial, rayMaterial, light, larger,
      phase: index * 1.783 + 0.77,
      speed: 0.9 + (index % 5) * 0.18,
      rayAngle: index * 0.69,
    });
  }

  // Preallocate temporary vectors: no per-frame allocation for sparkles.
  const rotation = new THREE.Quaternion();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const facet = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const toLight = new THREE.Vector3();
  const halfVector = new THREE.Vector3();
  const lightPosition = new THREE.Vector3();

  return {
    update(seconds, camera) {
      pivot.getWorldQuaternion(rotation);
      keyLight.getWorldPosition(lightPosition);
      for (const item of items) {
        item.group.getWorldPosition(point);
        normal.copy(item.normal).applyQuaternion(rotation).normalize();
        toCamera.subVectors(camera.position, point).normalize();

        // The planet's shell is translucent. Hide glints on the back manually,
        // otherwise they incorrectly glow *through* its center.
        // Keep glints on the *visible interior* of the disk. At the edge,
        // billboards can extend over the rim and look detached from the globe.
        const facing = THREE.MathUtils.smoothstep(normal.dot(toCamera), 0.33, 0.68);
        item.group.visible = facing > 0.002;
        if (!item.group.visible) continue;

        toLight.subVectors(lightPosition, point).normalize();
        halfVector.addVectors(toCamera, toLight).normalize();
        facet.copy(item.facetNormal).applyQuaternion(rotation).normalize();
        // Increased DEPTH creates a narrower, more angle-dependent highlight.
        const specular = Math.pow(Math.max(0, facet.dot(halfVector)),
          10 + 8 * Math.max(0.1, SPARKLE_DEPTH));

        // Just a couple of sparkles flare at once. The specular term changes
        // as the planet is rotated and the independent waves do the twinkling.
        const wave = 0.5 + 0.5 * Math.sin(
          seconds * item.speed * 1.25 * Math.max(0, SPARKLE_TWINKLE_SPEED) + item.phase);
        const blink = Math.pow(wave, item.larger ? 8 : 11);
        // No 1.2 ceiling. Brightness 2 is visibly stronger than brightness 1.
        const brightness = facing * Math.max(0, SPARKLE_BRIGHTNESS) *
          (0.012 + blink * (item.larger ? 1.05 : 0.83) *
          (0.86 + (0.45 + 0.15 * SPARKLE_DEPTH) * specular));
        item.flareMaterial.uniforms.uBrightness.value = brightness;
        item.rayMaterial.uniforms.uBrightness.value = brightness;
        const angle = item.rayAngle + 0.04 * Math.sin(seconds * 0.16 + item.phase);
        item.flareMaterial.uniforms.uAngle.value = angle;
        item.rayMaterial.uniforms.uAngle.value = angle;
        // Never show the old gray polygon chips. At the peak of a flash, a
        // very small translucent emissive facet supplies real 3D depth.
        item.crystal.visible = brightness > 0.45;
        item.crystalMaterial.opacity = Math.min(0.10, Math.max(0, brightness - 0.45) * 0.16);
        item.crystalMaterial.emissiveIntensity = brightness * 1.6;
        if (item.light) item.light.intensity = Math.min(2.8, brightness * 2.6);
      }
    },
  };
}

let modelBytes;
function loadModelBytes() {
  if (!modelBytes) {
    modelBytes = fetch('/models/CorePlanet2.glb?v=heart-depth-4').then((response) => {
      if (!response.ok) throw new Error(`CorePlanet: HTTP ${response.status}`);
      return response.arrayBuffer();
    }).catch((error) => { modelBytes = null; throw error; });
  }
  return modelBytes;
}

// Keep this export for CosmicVoyage.jsx in the current GitHub website.
// Its preloader is intentionally the same byte loader the component uses.
export function preloadCorePlanet() {
  return loadModelBytes();
}

function disposeModel(root) {
  const resources = new Set();
  root.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  for (const resource of resources) {
    if (resource.isTexture) resource.source?.data?.close?.();
    resource.dispose();
  }
}

// This site already uses independent canvases for its modal illustrations.
// One reusable, transparent canvas replaces both duplicated modal renderers.
export default function CorePlanet({ viewport = false, href, onBackgroundClick }) {
  const host = useRef(null);
  const dragged = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = host.current;
    let disposed = false;
    let model, mixer, renderer;
    let sparkleEffect;
    const hitTest = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let visible = true;
    let previousTime;
    let elapsed = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.08, 150);
    camera.position.set(17.9, 0.9, 0.6);
    camera.lookAt(0, 0.15, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf4d4fa, 1.3));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(7, 10, 12); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffb4d9, 0.5);
    fill.position.set(-8, 4, -8); scene.add(fill);
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (error) {
      console.error('CorePlanet renderer:', error);
      // Schedule the fallback after setup, just like asynchronous loading failures.
      queueMicrotask(() => { if (!disposed) setFailed(true); });
      return () => { disposed = true; };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.15, 0);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.65;
    controls.update();
    const start = new THREE.Vector2();
    let pointerId = null;
    const pointerDown = (event) => {
      if (pointerId !== null) { dragged.current = true; return; }
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      start.set(event.clientX, event.clientY);
      dragged.current = false;
      element.dataset.dragging = 'true';
    };
    const pointerMove = (event) => {
      if (event.pointerId !== pointerId) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) dragged.current = true;
    };
    const pointerUp = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerMove(event); pointerId = null; element.dataset.dragging = 'false';
    };
    const pointerCancel = () => {
      pointerId = null; dragged.current = true; element.dataset.dragging = 'false';
    };
    const keyDown = (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      if (event.key === 'ArrowLeft') spherical.theta -= 0.12;
      if (event.key === 'ArrowRight') spherical.theta += 0.12;
      if (event.key === 'ArrowUp') spherical.phi -= 0.12;
      if (event.key === 'ArrowDown') spherical.phi += 0.12;
      spherical.makeSafe();
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
      controls.update();
    };
    canvas.addEventListener('pointerdown', pointerDown, true);
    canvas.addEventListener('pointermove', pointerMove, true);
    canvas.addEventListener('pointerup', pointerUp, true);
    canvas.addEventListener('pointercancel', pointerCancel, true);
    element.addEventListener('keydown', keyDown);

    element.containsPlanetPoint = (x, y) => {
      if (!model) return true;
      const rect = canvas.getBoundingClientRect();
      pointer.set((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2);
      hitTest.setFromCamera(pointer, camera);
      return hitTest.intersectObject(model, true).some(({ object }) => {
        for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
        return true;
      });
    };

    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      // Fit the entire ring's bounding sphere, including clearance, at any angle.
      const halfFov = viewport ? Math.asin(6.3 / camera.position.distanceTo(controls.target)) : 19 * Math.PI / 180;
      const aspectFit = viewport ? Math.max(1, 1 / camera.aspect) : Math.max(1, 1.4 / camera.aspect);
      camera.fov = 2 * Math.atan(Math.tan(halfFov) * aspectFit) * 180 / Math.PI;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element); resize();
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    intersection.observe(element);

    loadModelBytes().then((bytes) => {
      if (disposed) return null;
      return new GLTFLoader().parseAsync(bytes.slice(0), '');
    }).then((gltf) => {
      if (!gltf) return;
      if (disposed) { disposeModel(gltf.scene); return; }
      model = gltf.scene;
      // Keep the reference shell and ring geometry with the original viewer materials.
      // Keep the Work viewer's exact pink-purple rim and orbit shaders.
      applyCorePlanetMaterials(model);

      // Preserve the reference Blender heart geometry and UVs. This PNG is
      // extracted from that same export, and is also embedded as a fallback.
      const textureLoader = new THREE.TextureLoader();
      const replacedTextures = new Set();
      const heart = model.getObjectByName('Heart');
      if (heart?.isMesh) {
        textureLoader.load('/images/coreplanet-reference-heart.png', (texture) => {
          if (disposed) { texture.dispose(); return; }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          texture.needsUpdate = true;
          if (heart.material?.isMeshStandardMaterial) {
            for (const old of [heart.material.map, heart.material.emissiveMap]) {
              if (old && !replacedTextures.has(old)) { old.dispose(); replacedTextures.add(old); }
            }
            heart.material.map = texture;
            heart.material.emissiveMap = texture;
            heart.material.needsUpdate = true;
          }
        }, undefined, () => {
          // Texture is also embedded in the GLB; this is not a fatal error.
          console.warn('Using embedded CorePlanet heart texture.');
        });
      }

      // Keep the original SphereSparkle animation pivot, but replace its
      // repeated PNG and geometric star spikes with tiny 3D crystal facets,
      // camera-dependent optical glints and two real moving point lights.
      const sparkleOverlay = model.getObjectByName('SphereSparkle');
      if (sparkleOverlay?.isMesh) {
        sparkleEffect = createPhysicalSparkles(sparkleOverlay, model.getObjectByName('Sphere'), key);
      }

      scene.add(model);
      mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) {
        // Replace the reference sparkle's eased 10-second turn; keep the baked
        // ring, heart pulse and main sphere animation at their existing speeds.
        if (clip.tracks.some((track) => track.name === `${sparkleOverlay?.name}.quaternion`)) continue;
        mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
      }
      if (sparkleOverlay) {
        mixer.clipAction(createSparkleRotation(sparkleOverlay.name))
          .setLoop(THREE.LoopRepeat, Infinity).play();
      }
      // The 0.4x orbit is baked into the GLB. Do not slow the mixer again.
      mixer.setTime(0);
      element.dataset.loaded = 'true';
    }).catch((error) => {
      if (!disposed) { console.error('CorePlanet model:', error); setFailed(true); }
    });

    renderer.setAnimationLoop((time) => {
      const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.1);
      previousTime = time;
      if (!visible || document.hidden) return;
      if (!reducedMotion.matches) elapsed += delta;
      mixer?.setTime(reducedMotion.matches ? 0 : elapsed);
      sparkleEffect?.update(reducedMotion.matches ? 0 : elapsed, camera);
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      disposed = true;
      delete element.containsPlanetPoint;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect(); intersection.disconnect();
      mixer?.stopAllAction();
      if (model) { mixer?.uncacheRoot(model); disposeModel(model); }
      controls.dispose();
      canvas.removeEventListener('pointerdown', pointerDown, true);
      canvas.removeEventListener('pointermove', pointerMove, true);
      canvas.removeEventListener('pointerup', pointerUp, true);
      canvas.removeEventListener('pointercancel', pointerCancel, true);
      element.removeEventListener('keydown', keyDown);
      renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [viewport]);

  const content = <div ref={host} className={styles.canvasHost} data-core-planet
    role={href ? undefined : 'group'} tabIndex={href ? undefined : 0}
    aria-label={href ? undefined : 'Heart planet. Drag or use arrow keys to rotate the view.'}>
    {failed && <img className={styles.fallback} src="/images/core-planet-preview.png" alt="Pink heart planet" />}
  </div>;
  if (!href) return content;
  return <a href={href} className={styles.planetLink} draggable={false}
    aria-label="Explore all collections. Drag to rotate the planet; click or press Enter to visit the shop."
    onDragStart={(event) => event.preventDefault()}
    onKeyDown={(event) => {
      if (event.target === event.currentTarget && event.key.startsWith('Arrow')) {
        event.preventDefault();
        host.current?.dispatchEvent(new KeyboardEvent('keydown', { key: event.key }));
      }
    }}
    onClickCapture={(event) => {
      // Rotating the 3D planet must never navigate to the shop.
      if (event.detail !== 0 && dragged.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // Only the actual model opens the shop; empty canvas closes the popup.
      // Keyboard activation (event.detail === 0) still follows the link.
      if (!viewport || event.detail === 0) return;
      if (!host.current?.containsPlanetPoint?.(event.clientX, event.clientY)) {
        event.preventDefault();
        event.stopPropagation();
        onBackgroundClick?.();
      }
    }}>{content}</a>;
}
