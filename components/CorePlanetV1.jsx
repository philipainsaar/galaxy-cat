'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyCorePlanetMaterials } from './corePlanetMaterials';
import { createSparkleRotation } from './corePlanetAnimations';
import styles from './CorePlanet.module.css';

// Sparse 3D sparkle geometry, procedural glow and two real animated lights.
// Included here so this single .jsx file replaces the old PNG sparkle layer.

// A few actual faceted 3D crystals, not a tiled PNG starfield.
// Four tapered 3D rays surround selected crystals; a procedurally generated
// soft halo provides the camera bloom appearance without postprocessing.
// Two animated PointLights are real scene lights and can illuminate the heart.
// This module intentionally does not touch the heart, sphere rim, or orbit.

const SPARKLE_COUNT = 48; // ~8 visible at any viewing angle
const LARGE_GLINTS = new Set([1, 5, 9, 13]);
const LIT_GLINTS = new Set([5, 13]);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const COLORS = ['#fff9ff', '#ffe3fa', '#f9ddff', '#e2eaff', '#fff1fa'];

function makeHaloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0.00, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.07, 'rgba(255,255,255,0.83)');
  gradient.addColorStop(0.19, 'rgba(255,255,255,0.23)');
  gradient.addColorStop(0.43, 'rgba(255,255,255,0.045)');
  gradient.addColorStop(1.00, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Attaches sparse, three-dimensional twinkling lights to the existing
 * SphereSparkle mesh. The original mesh remains as an animation pivot, but
 * its *material* is hidden so the old tiled PNG no longer draws.
 *
 * Returns a controller with update(time, camera). Call update in the normal
 * Three.js render loop, after mixer.setTime(). All new meshes, materials,
 * textures and lights are children of `pivot` and are disposed by the site's
 * existing disposeModel(model) traversal.
 */
function createPhysicalSparkles(pivot) {
  if (!pivot?.isMesh) return null;
  pivot.geometry.computeBoundingSphere();
  const bounds = pivot.geometry.boundingSphere;
  if (!bounds || !(bounds.radius > 0)) return null;
  const radius = bounds.radius;

  // Do not hide the OBJECT: that would hide its children and stop its spin.
  // Hiding just the material preserves SphereSparkle's existing animation.
  const oldMaterial = pivot.material;
  pivot.material = new THREE.MeshBasicMaterial({
    name: 'Invisible original sparkle surface (3D light pivot)',
    visible: false,
    depthWrite: false,
  });
  for (const material of [oldMaterial].flat().filter(Boolean)) material.dispose();

  const octahedron = new THREE.OctahedronGeometry(1, 0);
  const taperedRay = new THREE.ConeGeometry(0.18, 1, 3);
  const haloTexture = makeHaloTexture();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const items = [];

  for (let index = 0; index < SPARKLE_COUNT; index += 1) {
    // Fibonacci-sphere placement: sparse and evenly scattered around the
    // whole planet, so turning it reveals glints without visible tiling.
    const height = 1 - (2 * (index + 0.5)) / SPARKLE_COUNT;
    const radial = Math.sqrt(Math.max(0, 1 - height * height));
    const longitude = index * GOLDEN_ANGLE + 0.42;
    const normal = new THREE.Vector3(
      radial * Math.cos(longitude),
      height,
      radial * Math.sin(longitude),
    );
    const large = LARGE_GLINTS.has(index);
    const size = radius * (large ? 0.055 : 0.022 + (index % 4) * 0.0025);
    const color = new THREE.Color(COLORS[index % COLORS.length]);
    const group = new THREE.Group();
    group.name = `PhysicalSparkle_${index + 1}`;
    group.position.copy(bounds.center).addScaledVector(normal, radius * 1.022);
    group.quaternion.setFromUnitVectors(zAxis, normal);
    pivot.add(group);

    const material = new THREE.MeshStandardMaterial({
      name: `Animated emissive crystal ${index + 1}`,
      color,
      emissive: color,
      emissiveIntensity: 0.65,
      metalness: 0.15,
      roughness: 0.12,
      flatShading: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
    });
    const crystal = new THREE.Mesh(octahedron, material);
    crystal.name = 'Faceted3DCrystal';
    crystal.scale.set(size, size, size * 0.75);
    crystal.renderOrder = 12;
    group.add(crystal);

    // Every fourth glint has four *3D* tapered crystal rays, rather than
    // a flat cross printed onto the sphere's UV texture.
    if (large) {
      for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ray = new THREE.Mesh(taperedRay, material);
        ray.name = 'Tapered3DStarRay';
        ray.scale.set(size * 0.7, size * 2.7, size * 0.7);
        ray.position.set(x * size * 1.08, y * size * 1.08, 0);
        ray.quaternion.setFromUnitVectors(yAxis, new THREE.Vector3(x, y, 0));
        ray.renderOrder = 12;
        group.add(ray);
      }
    }

    // Halos are generated in memory and are strictly supporting effects;
    // the lit crystal and rays above are genuine 3D geometry.
    let halo = null;
    if (haloTexture) {
      halo = new THREE.Sprite(new THREE.SpriteMaterial({
        name: `Soft glow ${index + 1}`,
        map: haloTexture,
        color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        opacity: 0.15,
        toneMapped: false,
      }));
      halo.scale.setScalar(radius * (large ? 0.42 : 0.20));
      halo.position.z = size * 0.17;
      halo.renderOrder = 13;
      group.add(halo);
    }

    let light = null;
    if (LIT_GLINTS.has(index)) {
      light = new THREE.PointLight(color, 0, radius * 2.5, 2);
      light.name = `RealSparklePointLight_${index + 1}`;
      light.position.z = radius * 0.07;
      group.add(light);
    }

    items.push({ group, normal, material, halo, light, large,
      phase: index * 1.783 + 0.77,
      speed: 0.72 + (index % 5) * 0.115 });
  }

  const worldRotation = new THREE.Quaternion();
  const worldPosition = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const toCamera = new THREE.Vector3();

  return {
    update(seconds, camera) {
      pivot.getWorldQuaternion(worldRotation);
      for (const item of items) {
        item.group.getWorldPosition(worldPosition);
        worldNormal.copy(item.normal).applyQuaternion(worldRotation).normalize();
        toCamera.subVectors(camera.position, worldPosition).normalize();
        // Hide glints on the far hemisphere. The pastel sphere shell is
        // transparent and doesn't write depth, so facing matters here.
        const facing = THREE.MathUtils.smoothstep(worldNormal.dot(toCamera), 0.02, 0.38);
        item.group.visible = facing > 0.01;
        if (!item.group.visible) continue;

        const wave = 0.5 + 0.5 * Math.sin(seconds * item.speed + item.phase);
        const flash = Math.pow(wave, item.large ? 9 : 13);
        const slow = 0.88 + 0.12 * Math.sin(seconds * 0.28 + item.phase);
        const intensity = flash * slow;
        item.material.emissiveIntensity = 0.55 + 3.7 * intensity;
        item.material.opacity = facing * (0.26 + (item.large ? 0.72 : 0.48) * intensity);
        if (item.halo) {
          item.halo.material.opacity = facing * (0.012 + (item.large ? 0.70 : 0.30) * intensity);
        }
        item.group.scale.setScalar(0.80 + 0.32 * intensity);
        if (item.light) item.light.intensity = facing * (0.12 + 5.8 * intensity);
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
        textureLoader.load('/images/coreplanet-heart.png', (texture) => {
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
      // repeated PNG with sparse 3D crystals, subtle halos and real lights.
      const sparkleOverlay = model.getObjectByName('SphereSparkle');
      if (sparkleOverlay?.isMesh) {
        sparkleEffect = createPhysicalSparkles(sparkleOverlay);
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
