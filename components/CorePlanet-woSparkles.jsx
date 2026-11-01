'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyCorePlanetMaterials } from './corePlanetMaterials';
import { createSparkleMaterial } from './corePlanetSparkles';
import { createSparkleRotation } from './corePlanetAnimations';
import styles from './CorePlanet.module.css';

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

      // GLTFLoader sanitizes dots from exported Blender object names.
      const sparkleOverlay = model.getObjectByName('SphereSparkle');
      if (sparkleOverlay?.isMesh) {
        sparkleOverlay.renderOrder = 12;
        const embeddedMaterial = sparkleOverlay.material;
        sparkleOverlay.material = createSparkleMaterial(embeddedMaterial.map);
        embeddedMaterial.dispose();
        // Apply the same small-scale, luminous PNG material to both sources.
        textureLoader.load('/images/sphere-sparkle.png', (texture) => {
          if (disposed) { texture.dispose(); return; }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          texture.needsUpdate = true;
          for (const old of [sparkleOverlay.material.map, sparkleOverlay.material.emissiveMap]) {
            if (old && !replacedTextures.has(old)) { old.dispose(); replacedTextures.add(old); }
          }
          sparkleOverlay.material.dispose();
          sparkleOverlay.material = createSparkleMaterial(texture);
          sparkleOverlay.renderOrder = 12;
        }, undefined, () => {
          // Keep the embedded PNG material if the external file is missing.
          console.warn('Using embedded Sphere.Sparkle PNG.');
        });
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
