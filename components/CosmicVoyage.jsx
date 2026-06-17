'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const CAT_MODEL_URL = '/models/alien-cat.glb';
const BOAT_MODEL_URL = '/models/cosmic-boat.glb';
const FLOAT_RING_MODEL_URL = '/models/float-ring.glb';
const FLOAT_RING_FALLBACK_MODEL_URL = '/models/floatring.glb';

const CORE_MODEL_PRELOAD_URLS = [
  CAT_MODEL_URL,
  BOAT_MODEL_URL,
  FLOAT_RING_MODEL_URL,
];

// These are all the GLB files currently shipped in /public/models.
// Cat + boat are highest priority because the main scene needs them first.
const ALL_PUBLIC_GLB_PRELOAD_URLS = [
  CAT_MODEL_URL,
  BOAT_MODEL_URL,
  FLOAT_RING_MODEL_URL,
  FLOAT_RING_FALLBACK_MODEL_URL,
  '/models/galaxy-bag.glb',
  '/models/pastel-looping-animated-water.glb',
];

const PUBLIC_IMAGE_PRELOAD_URLS = [
  '/images/pastel-sky.jpg',
  '/images/pastel-sky.png',
  '/images/water-texture.jpg',
  '/images/heart.png',
  '/images/heart.gif',
  '/images/almostmadeinjapan.png',
  '/images/covers/dreamy.jpg',
  '/images/covers/emo.jpg',
  '/images/covers/nature.jpg',
  '/images/covers/cyber.jpg',
  '/images/symbols/pink-star-brooch.png',
  '/images/symbols/pearl-planet.png',
  '/images/symbols/fluffy-purple-star.png',
  '/images/symbols/opal-star.png',
  '/images/symbols/kawaii-planet.png',
];

// Change either value to Math.PI if a model faces backward after export.
const CAT_MODEL_ROTATION_Y = 0;
const BOAT_MODEL_ROTATION_Y = 0;

const START = new THREE.Vector3(1.62, -0.50, 5.0);
const DEFAULT_SEAT = new THREE.Vector3(2.5, 1.0, 2.1);
const DRAG_Z = 5.0;
const BOAT_DEPTH = -8.2;
const BOAT_WATERLINE_Y = -0.28;
const CAT_GROUND_Y = -0.5;

const FLOAT_RING_POSITION = new THREE.Vector3(-3.15, -0.86, 2.95);
const FLOAT_RING_TARGET_SIZE = 1.68;
const FLOAT_RING_MODEL_TILT_X = -Math.PI / 2;

const LAUNCH_DURATION_SECONDS = 3;
const LAUNCH_DISTANCE = 120;
const LAUNCH_HEIGHT = 6;

const RING_TERMINAL_MESSAGE = `> FLOAT-RING SIGNAL FOUND
> CHANNEL: PASTEL WATER / LEFT SIDE
> STATUS: BUBBLE-LINK OPEN

hello tiny shopper.
this floating ring is a soft portal buoy.
when the water starts glowing, follow the bubbles,
keep the alien cat close,
and do not let the boat forget the way home.

> MESSAGE COMPLETE
> TAP OUTSIDE THIS BOX TO CLOSE`;

const RING_CHAT_BUBBLES = [
  { x: 8, y: 10, size: 74, delay: 0.0, speed: 7.2 },
  { x: 19, y: 76, size: 52, delay: -1.4, speed: 6.3 },
  { x: 31, y: 18, size: 42, delay: -2.7, speed: 5.8 },
  { x: 42, y: 84, size: 86, delay: -0.8, speed: 7.9 },
  { x: 56, y: 9, size: 58, delay: -3.1, speed: 6.5 },
  { x: 69, y: 68, size: 44, delay: -1.9, speed: 5.9 },
  { x: 82, y: 20, size: 96, delay: -2.2, speed: 8.2 },
  { x: 91, y: 82, size: 62, delay: -0.6, speed: 6.7 },
  { x: 14, y: 49, size: 38, delay: -3.6, speed: 5.5 },
  { x: 74, y: 43, size: 70, delay: -4.0, speed: 7.1 },
  { x: 50, y: 54, size: 50, delay: -2.8, speed: 6.0 },
  { x: 6, y: 88, size: 110, delay: -1.1, speed: 8.5 },
];

const MISSION_LINK_IMAGES = [
    {
        title: 'DREAMY',
            image: '/images/covers/dreamy.jpg',
                url: 'https://www.almostmadeinjapan.com/collections/dreamy',
                  },
                    {
                        title: 'EMO',
                            image: '/images/covers/emo.jpg',
                                url: 'https://www.almostmadeinjapan.com/collections/emo',
                                  },
                                   {
                                       title: 'NATURE',
                                           image: '/images/covers/nature.jpg',
                                               url: 'https://www.almostmadeinjapan.com/collections/frontpage',
                                                 },
                                                  {
                                                      title: 'CYBER',
                                                          image: '/images/covers/cyber.jpg',
                                                              url: 'https://www.almostmadeinjapan.com/collections/cyber',
                                                                },
                                                                ];

const MOVING_BG_SYMBOLS = [
  '/images/symbols/pink-star-brooch.png',
  '/images/symbols/pearl-planet.png',
  '/images/symbols/fluffy-purple-star.png',
  '/images/symbols/opal-star.png',
  '/images/symbols/kawaii-planet.png',
];

// Maximum total symbols across all 5 images.
const TOTAL_MOVING_SYMBOLS = 30;

function createMovingBackgroundSymbols() {
  const columns = 6;
  const rows = 6;

  const slots = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      slots.push({ row, column });
    }
  }

  // Shuffle the grid cells so the five symbol types feel random,
  // while still keeping enough spacing between every emblem.
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[swapIndex]] = [slots[swapIndex], slots[i]];
  }

  return slots.slice(0, TOTAL_MOVING_SYMBOLS).map((slot, index) => {
    const cellWidth = 100 / columns;

    // Keep the whole symbol field mostly in the upper part of the art.
    const yRows = [6, 15, 25, 37, 51, 66];

    return {
      id: `symbol-${index}`,
      src: MOVING_BG_SYMBOLS[index % MOVING_BG_SYMBOLS.length],
      x: slot.column * cellWidth + cellWidth * 0.5 + (Math.random() * 6 - 3),
      y: yRows[slot.row] + (Math.random() * 4 - 2),
      size: 36 + Math.random() * 28,
      opacity: 0.52 + Math.random() * 0.28,
    };
  });
}

function createFluffSpriteTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const center = size * 0.5;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);

  gradient.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.66)');
  gradient.addColorStop(0.56, 'rgba(255,255,255,0.24)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Tiny radial strokes make each point read as fur instead of dust.
  for (let i = 0; i < 220; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const start = 6 + Math.random() * 14;
    const end = 28 + Math.random() * 34;

    ctx.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.24})`;
    ctx.lineWidth = 0.32 + Math.random() * 0.9;
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * start, center + Math.sin(angle) * start);
    ctx.lineTo(center + Math.cos(angle) * end, center + Math.sin(angle) * end);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
}

function shouldSkipFluff(object, skipPattern) {
  const meshName = object.name || '';
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];

  const materialNames = materials
    .map((material) => material?.name || '')
    .join(' ');

  return skipPattern.test(`${meshName} ${materialNames}`);
}

function collectFluffSurfaceSamples(root, skipPattern) {
  const samples = [];
  const rootInverse = new THREE.Matrix4();
  const localPosition = new THREE.Vector3();
  const worldPosition = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const normalTip = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  root.updateMatrixWorld(true);
  rootInverse.copy(root.matrixWorld).invert();

  root.traverse((object) => {
    if (!object.isMesh || !object.geometry?.attributes?.position) return;
    if (object.userData?.softFluffCloud) return;
    if (shouldSkipFluff(object, skipPattern)) return;

    if (!object.geometry.attributes.normal) {
      object.geometry.computeVertexNormals();
    }

    const positionAttr = object.geometry.attributes.position;
    const normalAttr = object.geometry.attributes.normal;
    const step = Math.max(1, Math.floor(positionAttr.count / 520));

    normalMatrix.getNormalMatrix(object.matrixWorld);

    for (let i = 0; i < positionAttr.count; i += step) {
      localPosition.fromBufferAttribute(positionAttr, i);
      worldPosition.copy(localPosition).applyMatrix4(object.matrixWorld);

      if (normalAttr) {
        worldNormal.fromBufferAttribute(normalAttr, i).applyMatrix3(normalMatrix).normalize();
      } else {
        worldNormal.set(0, 1, 0);
      }

      const rootPosition = worldPosition.clone().applyMatrix4(rootInverse);
      normalTip.copy(worldPosition).add(worldNormal).applyMatrix4(rootInverse);

      const rootNormal = normalTip.sub(rootPosition).normalize();

      samples.push({
        position: rootPosition.clone(),
        normal: rootNormal.lengthSq() > 0.001
          ? rootNormal.clone()
          : new THREE.Vector3(0, 1, 0),
      });
    }
  });

  return samples;
}

function addTexturePreservingFluff(root, options = {}) {
  const {
    texture,
    count = 420,
    size = 0.085,
    opacity = 0.36,
    shellOffset = 0.085,
    jitter = 0.032,
    palette = ['#ffffff'],
    skipPattern = /eye|eyes|pupil|iris|glass|window|light|glow|black|mouth|teeth|screen|gem|crystal|metal|chrome/i,
  } = options;

  if (!texture) return null;

  const samples = collectFluffSurfaceSamples(root, skipPattern);
  if (!samples.length) return null;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorPalette = palette.map((color) => new THREE.Color(color));
  const randomDirection = new THREE.Vector3();

  for (let i = 0; i < count; i += 1) {
    const sample = samples[Math.floor(Math.random() * samples.length)];
    const distance = shellOffset * (0.9 + Math.random() * 1.45);

    randomDirection
      .set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      )
      .normalize()
      .multiplyScalar(jitter * Math.random());

    const point = sample.position
      .clone()
      .addScaledVector(sample.normal, distance)
      .add(randomDirection);

    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;

    const color = colorPalette[i % colorPalette.length]
      .clone()
      .lerp(new THREE.Color('#ffffff'), Math.random() * 0.42);

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.PointsMaterial({
    map: texture,
    size,
    vertexColors: true,
    transparent: true,
    opacity,
    alphaTest: 0.025,
    depthWrite: false,
    depthTest: true,
    sizeAttenuation: true,
    blending: THREE.NormalBlending,
  });

  const cloud = new THREE.Points(geometry, material);
  cloud.name = `${root.name || 'model'}_texture_preserving_fluff`;
  cloud.frustumCulled = false;
  cloud.renderOrder = 55;
  cloud.userData.softFluffCloud = true;
  cloud.userData.fluffMotion = {
    baseSize: size,
    baseOpacity: opacity,
    phase: Math.random() * Math.PI * 2,
  };

  root.add(cloud);
  return cloud;
}


function improveModelQuality(root, renderer, pastelPalette) {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const processedMaterials = new Set();
  let meshIndex = 0;

  root.traverse((object) => {
    if (!object.isMesh) return;

    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = true;

    if (object.geometry && !object.geometry.attributes.normal) {
      object.geometry.computeVertexNormals();
    }

    const tint = pastelPalette?.[
      meshIndex % pastelPalette.length
    ];

    meshIndex += 1;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((material) => {
      if (!material || processedMaterials.has(material)) return;
      processedMaterials.add(material);

      // Smooth shading avoids faceted, low-poly-looking surfaces.
      material.flatShading = false;

      // Preserve textures while gently shifting the whole scene toward
      // pastel pink, purple and blue.
      if (tint && material.color) {
        material.color.lerp(
          tint,
          material.map ? 0.18 : 0.42,
        );
      }

      [
        material.map,
        material.normalMap,
        material.roughnessMap,
        material.metalnessMap,
        material.emissiveMap,
        material.aoMap,
      ].forEach((texture) => {
        if (!texture) return;
        texture.anisotropy = anisotropy;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
      });

      material.needsUpdate = true;
    });
  });
}

function fitModel(root, targetSize, groundY, rotationY, scaleMode = 'max') {
  root.rotation.set(0, rotationY, 0);
  root.updateMatrixWorld(true);

  let box = new THREE.Box3().setFromObject(root);
  const initialSize = box.getSize(new THREE.Vector3());

  const measuredSize =
    scaleMode === 'horizontal'
      ? Math.max(initialSize.x, initialSize.z)
      : Math.max(initialSize.x, initialSize.y, initialSize.z);

  if (!Number.isFinite(measuredSize) || measuredSize <= 0) {
    throw new Error('The GLB model has no measurable geometry.');
  }

  root.scale.multiplyScalar(targetSize / measuredSize);
  root.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y += groundY - box.min.y;
  root.updateMatrixWorld(true);

  return new THREE.Box3().setFromObject(root);
}

function createMixer(root, clips, mixers) {
  if (!clips?.length) return;

  const mixer = new THREE.AnimationMixer(root);
  clips.forEach((clip) => mixer.clipAction(clip).play());
  mixers.push(mixer);
}

function createPreloadStore() {
  return {
    gltfLoader: null,
    textureLoader: null,
    models: new Map(),
    modelPromises: new Map(),
    modelErrors: new Map(),
    images: new Map(),
    imagePromises: new Map(),
    imageErrors: new Map(),
  };
}

function getPreloadGLTFLoader(store) {
  if (!store.gltfLoader) {
    store.gltfLoader = new GLTFLoader();
  }

  return store.gltfLoader;
}

function getPreloadTextureLoader(store) {
  if (!store.textureLoader) {
    store.textureLoader = new THREE.TextureLoader();
  }

  return store.textureLoader;
}

function preloadGLB(store, url) {
  if (!store || !url) return Promise.reject(new Error('Missing preload store or GLB url.'));
  if (store.models.has(url)) return Promise.resolve(store.models.get(url));
  if (store.modelPromises.has(url)) return store.modelPromises.get(url);

  const promise = getPreloadGLTFLoader(store)
    .loadAsync(url)
    .then((gltf) => {
      store.models.set(url, gltf);
      store.modelErrors.delete(url);
      return gltf;
    })
    .catch((error) => {
      store.modelErrors.set(url, error);
      throw error;
    });

  store.modelPromises.set(url, promise);
  return promise;
}

function preloadTexture(store, url) {
  if (!store || !url) return Promise.resolve(null);
  if (store.images.has(url)) return Promise.resolve(store.images.get(url));
  if (store.imagePromises.has(url)) return store.imagePromises.get(url);

  const promise = getPreloadTextureLoader(store)
    .loadAsync(url)
    .then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      store.images.set(url, texture);
      store.imageErrors.delete(url);
      return texture;
    })
    .catch((error) => {
      store.imageErrors.set(url, error);
      return null;
    });

  store.imagePromises.set(url, promise);
  return promise;
}

function cloneMaterialsForScene(root) {
  const clonedMaterials = new Map();

  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => {
        if (!material) return material;
        if (!clonedMaterials.has(material)) {
          clonedMaterials.set(material, material.clone());
        }
        return clonedMaterials.get(material);
      });
    } else {
      const material = object.material;
      if (!clonedMaterials.has(material)) {
        clonedMaterials.set(material, material.clone());
      }
      object.material = clonedMaterials.get(material);
    }
  });
}

function clonePreloadedGLTF(gltf) {
  if (!gltf?.scene) return null;

  const scene = cloneSkeleton(gltf.scene);
  cloneMaterialsForScene(scene);

  return {
    scene,
    animations: gltf.animations || [],
  };
}

async function loadSceneGLTF(store, url) {
  const cached = store?.models?.get(url);

  if (cached) {
    return clonePreloadedGLTF(cached);
  }

  const gltf = await preloadGLB(store, url);
  return clonePreloadedGLTF(gltf);
}

function runSoonWhenIdle(callback, timeout = 350) {
  if (typeof window === 'undefined') return null;

  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout: 1800 });
    return () => window.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(id);
}

function createUltraFastWater() {
  // Smooth, high pastel waves for mobile:
  // one water mesh, no flat overlay planes, no GLB, no texture slicing.
  // Colors live directly on the wave vertices so pink/lavender/cyan stay visible.
  const segments = window.innerWidth < 768 ? 44 : 64;
  const geometry = new THREE.PlaneGeometry(
    120,
    120,
    segments,
    segments,
  );

  const waterPositions = geometry.attributes.position;
  const basePositions = waterPositions.array.slice();

  const waterColors = new Float32Array(waterPositions.count * 3);
  const cyan = new THREE.Color('#4ffaff');
  const deepCyan = new THREE.Color('#00d8ff');
  const pink = new THREE.Color('#ff5eea');
  const softPink = new THREE.Color('#ffd6f5');
  const lavender = new THREE.Color('#a98cff');
  const whiteFoam = new THREE.Color('#ffffff');
  const mixedColor = new THREE.Color();

  for (let i = 0; i < waterPositions.count; i += 1) {
    const x = basePositions[i * 3];
    const y = basePositions[i * 3 + 1];

    const ribbonA = (Math.sin(x * 0.11 + y * 0.035) + 1) * 0.5;
    const ribbonB = (Math.cos(y * 0.10 - x * 0.025) + 1) * 0.5;
    const ribbonC = (Math.sin((x + y) * 0.055) + 1) * 0.5;

    mixedColor.copy(cyan).lerp(pink, ribbonA * 0.55);
    mixedColor.lerp(lavender, ribbonB * 0.45);
    mixedColor.lerp(softPink, ribbonC * 0.18);

    waterColors[i * 3] = mixedColor.r;
    waterColors[i * 3 + 1] = mixedColor.g;
    waterColors[i * 3 + 2] = mixedColor.b;
  }

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(waterColors, 3),
  );
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,

    // No texture by default.
    // If /images/water-texture.jpg is missing, the water stays exactly like before.
    map: null,

    vertexColors: true,
    roughness: 0.18,
    metalness: 0,
    transparent: false,
    flatShading: false,
    side: THREE.DoubleSide,
  });

  const water = new THREE.Mesh(geometry, material);
  water.name = 'SmoothColorfulHighPastelWater';
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.03, -2.2);
  water.receiveShadow = false;
  water.castShadow = false;
  water.frustumCulled = true;

  const group = new THREE.Group();
  group.name = 'SmoothColorfulHighPastelWaterGroup';
  group.add(water);

  return {
    group,
    water,
    waterPositions,
    basePositions,
    waterColors,
    cyan,
    deepCyan,
    pink,
    softPink,
    lavender,
    whiteFoam,
  };
}

function createInfinityTriangleWater() {
  // Star-Wars-style flat infinity triangle.
  // This is a real 3D floor triangle, not a screen billboard.
  // It renders first like z-index: -100000, so the old opaque water,
  // boat and alien cat always render on top of it.
  const geometry = new THREE.BufferGeometry();

  const vertices = new Float32Array([
    // Wide near edge, hidden underneath the old opaque waves.
    -35.0, 0.0, 0.0,
     35.0, 0.0, 0.0,

    // Slightly longer infinity tip with soft fade-out.
      0.0, 30.0, -600.0,
  ]);

  const uvs = new Float32Array([
    0.0, 0.0,
    1.0, 0.0,
    0.5, 1.0,
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },

      // Optional texture. Starts inactive so missing texture keeps the original look.
      uWaterTexture: { value: null },
      uTextureStrength: { value: 0.0 },

      colorA: { value: new THREE.Color('#c8f7ff') },
      colorB: { value: new THREE.Color('#f7ddff') },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform sampler2D uWaterTexture;
      uniform float uTextureStrength;
      uniform vec3 colorA;
      uniform vec3 colorB;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;

        // Soft edge mask for the triangle sides.
        float leftEdge = smoothstep(0.0, 0.055, uv.x);
        float rightEdge = smoothstep(1.0, 0.945, uv.x);
        float baseFade = smoothstep(0.0, 0.1, uv.y);
        float shape = leftEdge * rightEdge * baseFade;

        if (shape < 0.01) discard;

        // Horizontal-only water reflections, stretched like a flat distant runway.
        float driftA = sin(uv.x * 24.0 + uTime * 0.55 + uv.y * 3.0);
        float driftB = sin(uv.x * 48.0 - uTime * 0.75 + uv.y * 7.0);
        float driftC = sin(uv.x * 10.0 + uTime * 0.28);
        float water = driftA * 0.30 + driftB * 0.14 + driftC * 0.10;
        water = water * 0.5 + 0.5;

        vec3 lavender = vec3(0.84, 0.80, 1.0);
        vec3 pink = vec3(1.0, 0.84, 0.98);
        vec3 white = vec3(1.0, 0.985, 1.0);

        vec3 color = mix(colorA, lavender, uv.y * 0.60);
        color = mix(color, colorB, water * 0.18);
        color = mix(color, pink, water * 0.10);

        // Bright center reflection to sell the infinity point.
        float center = 1.0 - abs(uv.x - 0.5) * 2.0;
        center = pow(max(center, 0.0), 2.0);
        color = mix(color, white, center * 0.24);

        float gloss = smoothstep(0.74, 1.0, water) * (1.0 - uv.y * 0.38);
        color = mix(color, white, gloss * 0.18);

        // Optional water texture.
        // It only changes the triangle after /images/water-texture.jpg loads.
        if (uTextureStrength > 0.001) {
          vec2 textureUv = vec2(
            uv.x * 4.0 + uTime * 0.025,
            uv.y * 10.0 - uTime * 0.045
          );

          vec3 tex = texture2D(uWaterTexture, textureUv).rgb;
          color = mix(color, tex, uTextureStrength);
        }

        // Ultra soft Star-Wars horizon fade at the top tip.
        float horizonFade = pow(
  1.0 - smoothstep(
    0.35,
    1.0,
    uv.y
  ),
  3.0
);

        float alpha = shape * horizonFade * 0.92;

        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const triangle = new THREE.Mesh(geometry, material);
    
  triangle.name = 'FlatStarWarsInfinityTriangleWaterZIndexMinus100000';

  // Same floor level as the water, but far behind the boat.
  // The old opaque waves cover the near edge, so it only appears after them.
  triangle.position.set(0, -1.34, -10.0);
  triangle.renderOrder = -100000;
  triangle.frustumCulled = false;

  return triangle;
}

function disposeObject(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();

    const materials = object.material
      ? Array.isArray(object.material)
        ? object.material
        : [object.material]
      : [];

    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
      material.dispose();
    });
  });
}

function loadBlurredSpriteTexture(url, blurPx = 3.0) {
  return new Promise((resolve, reject) => {
    const imageLoader = new THREE.ImageLoader();

    imageLoader.load(
      url,
      (image) => {
        const padding = Math.ceil(blurPx * 6);

        const canvas = document.createElement('canvas');
        canvas.width = image.width + padding * 2;
        canvas.height = image.height + padding * 2;

        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // IMPORTANT:
        // Only draw the blurred image.
        // Do NOT draw the sharp image again on top.
        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(image, padding, padding);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;

        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}



function ShoppingIntroSplash({ onFinished, preloadStore, coreModelsReady }) {
  const bubbleCanvasRef = useRef(null);
  const catCanvasRef = useRef(null);
  const textCardRef = useRef(null);
  const coreModelsReadyRef = useRef(coreModelsReady);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    coreModelsReadyRef.current = coreModelsReady;
  }, [coreModelsReady]);

  useEffect(() => {
    const bubbleCanvas = bubbleCanvasRef.current;
    const catCanvas = catCanvasRef.current;

    if (!bubbleCanvas || !catCanvas) return undefined;

    let disposed = false;
    let animationFrame = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let viewportWidth = 10;
    const viewportHeight = 10;

    const isMobileIntro = width < 700 || window.matchMedia?.('(pointer: coarse)').matches;
    const INTRO_BUBBLE_COUNT = isMobileIntro ? 64 : 92;
    const INTRO_VISIBLE_SECONDS = 3.6;
    const INTRO_FADE_SECONDS = 0.78;
    const INTRO_FADE_START_SECONDS = INTRO_VISIBLE_SECONDS;
    const CAT_GROUND_IN_INTRO = -0.44;

    const bubbleContext = bubbleCanvas.getContext('2d');

    if (!bubbleContext) return undefined;

    const rand = (min, max) => min + Math.random() * (max - min);
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const smoothstep = (edge0, edge1, value) => {
      const t = clamp01((value - edge0) / (edge1 - edge0));
      return t * t * (3 - 2 * t);
    };
    const easeOutQuart = (value) => 1 - Math.pow(1 - value, 4);
    const lerp = (from, to, amount) => from + (to - from) * amount;

    const makeBubbleTexture = () => {
      const size = 320;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;
      const r = size * 0.4;

      ctx.clearRect(0, 0, size, size);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.62)';
      ctx.shadowBlur = 28;
      const glow = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.18);
      glow.addColorStop(0.0, 'rgba(255,255,255,0.00)');
      glow.addColorStop(0.60, 'rgba(255,255,255,0.16)');
      glow.addColorStop(0.82, 'rgba(255,255,255,0.34)');
      glow.addColorStop(1.0, 'rgba(255,255,255,0.00)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.restore();

      const body = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
      body.addColorStop(0.0, 'rgba(255,255,255,0.065)');
      body.addColorStop(0.45, 'rgba(255,255,255,0.075)');
      body.addColorStop(0.82, 'rgba(255,255,255,0.050)');
      body.addColorStop(1.0, 'rgba(255,255,255,0.00)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.25)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 11;
      ctx.strokeStyle = 'rgba(255,255,255,0.62)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.20)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 18;
      ctx.strokeStyle = 'rgba(255,255,255,0.94)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.79, Math.PI * 0.66, Math.PI * 1.44);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.34)';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(255,255,255,0.40)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.77, -Math.PI * 0.18, Math.PI * 0.12);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.18)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.28, cy - r * 0.26, r * 0.11, r * 0.07, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return canvas;
    };

    const bubbleTexture = makeBubbleTexture();
    const bubbles = Array.from({ length: INTRO_BUBBLE_COUNT }, () => ({}));

    const setupBubble = (bubble) => {
      const unit = height / viewportHeight;
      const roll = Math.random();
      const sizeUnit = roll < 0.15
        ? rand(1.0, 1.55)
        : roll < 0.55
          ? rand(0.55, 1.05)
          : rand(0.20, 0.60);
      const verticalBias = Math.pow(Math.random(), 2.4);

      bubble.sizeUnit = sizeUnit;
      bubble.x = rand(-width * 0.05, width * 1.05);
      bubble.y = height - verticalBias * (height * 1.02);
      bubble.vx = rand(-0.18, 0.18) * unit;
      bubble.vy = -rand(0.75, 1.95) * unit;
      bubble.wobbleAmp = rand(0.03, 0.11) * unit;
      bubble.wobbleSpeed = rand(1.8, 4.4);
      bubble.wobblePhase = rand(0, Math.PI * 2);
      bubble.baseOpacity = rand(0.72, 0.86);
    };

    const resizeBubbleCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dprLimit = width < 700 ? 1.25 : 1.6;
      const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);

      bubbleCanvas.width = Math.round(width * dpr);
      bubbleCanvas.height = Math.round(height * dpr);
      bubbleCanvas.style.width = `${width}px`;
      bubbleCanvas.style.height = `${height}px`;
      bubbleContext.setTransform(dpr, 0, 0, dpr, 0, 0);

      bubbles.forEach(setupBubble);
    };

    const renderer = new THREE.WebGLRenderer({
      canvas: catCanvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    const introScene = new THREE.Scene();
    const introCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    introCamera.position.z = 10;

    introScene.add(new THREE.HemisphereLight(0xe9e4ff, 0xffe8f5, 2.65));

    const introKeyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    introKeyLight.position.set(4, 8, 7);
    introScene.add(introKeyLight);

    const introPinkLight = new THREE.PointLight(0xffb7dc, 2.4, 24);
    introPinkLight.position.set(4, 2.5, 4);
    introScene.add(introPinkLight);

    const introBlueLight = new THREE.PointLight(0xaedbff, 2.4, 24);
    introBlueLight.position.set(-4, 2.2, 4);
    introScene.add(introBlueLight);

    const introCatGroup = new THREE.Group();
    introCatGroup.visible = false;
    introScene.add(introCatGroup);

    let introCatLoadedAt = 0;
    const introMixers = [];

    loadSceneGLTF(preloadStore, CAT_MODEL_URL)
      .then((gltf) => {
        if (!gltf?.scene) return;

        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }

        const catModel = gltf.scene;
        catModel.name = 'ShoppingIntroAlienCat';
        improveModelQuality(catModel, renderer, [
          new THREE.Color(0xffb7dc),
          new THREE.Color(0xcab8ff),
          new THREE.Color(0xaedbff),
        ]);
        fitModel(catModel, 3.55, CAT_GROUND_IN_INTRO, CAT_MODEL_ROTATION_Y, 'max');
        introCatGroup.add(catModel);
        createMixer(catModel, gltf.animations, introMixers);
        introCatLoadedAt = elapsed;
        introCatGroup.visible = true;
      })
      .catch((error) => {
        console.error('Could not load intro alien-cat.glb:', error);
      });

    const resizeCatCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const aspect = width / height;
      viewportWidth = viewportHeight * aspect;

      introCamera.left = -viewportWidth / 2;
      introCamera.right = viewportWidth / 2;
      introCamera.top = viewportHeight / 2;
      introCamera.bottom = -viewportHeight / 2;
      introCamera.updateProjectionMatrix();

      const dprLimit = width < 700 ? 1.25 : 1.5;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprLimit));
      renderer.setSize(width, height, false);
    };

    const getIntroCatTargetY = () => {
      const card = textCardRef.current;
      const cardTopPx = card
        ? card.getBoundingClientRect().top
        : height * 0.62;
      const cardTopWorld = introCamera.top - (cardTopPx / height) * viewportHeight;

      // The cat model is fit with its feet at CAT_GROUND_IN_INTRO,
      // so this places its feet right on the top lip of the text card.
      return cardTopWorld - CAT_GROUND_IN_INTRO + 0.03;
    };

    const drawBubbles = (dt) => {
      if (!bubbleContext) return;

      const vanish = smoothstep(2.95, INTRO_VISIBLE_SECONDS, elapsed);

      bubbleContext.clearRect(0, 0, width, height);

      bubbles.forEach((bubble) => {
        const wobble = Math.sin(elapsed * bubble.wobbleSpeed + bubble.wobblePhase) * bubble.wobbleAmp;
        bubble.x += (bubble.vx + wobble * 0.9) * dt;
        bubble.y += bubble.vy * dt;

        const grow = 1.0 + (elapsed / INTRO_VISIBLE_SECONDS) * 0.10 + vanish * 0.12;
        const sizePx = bubble.sizeUnit * (height / viewportHeight) * grow;

        bubbleContext.globalAlpha = bubble.baseOpacity * (1.0 - vanish);
        bubbleContext.drawImage(
          bubbleTexture,
          bubble.x - sizePx / 2,
          bubble.y - sizePx / 2,
          sizePx,
          sizePx,
        );
      });

      bubbleContext.globalAlpha = 1;
    };

    let fadeStartedAt = 0;

    const animate = (now) => {
      if (disposed) return;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      drawBubbles(dt);

      const catFallElapsed = introCatGroup.visible
        ? Math.max(0, elapsed - introCatLoadedAt)
        : 0;
      const fallProgress = clamp01((catFallElapsed - 0.05) / 0.62);
      const easedFall = easeOutQuart(fallProgress);
      const startY = introCamera.top + 3.35;
      const targetY = getIntroCatTargetY();
      const bounce = fallProgress >= 1
        ? Math.sin((catFallElapsed - 0.67) * 20) * Math.exp(-(catFallElapsed - 0.67) * 5) * 0.10
        : 0;

      introCatGroup.position.set(
        0,
        lerp(startY, targetY, easedFall) + bounce,
        0,
      );
      introCatGroup.rotation.x = Math.sin(elapsed * 6.5) * 0.045;
      introCatGroup.rotation.y = Math.sin(elapsed * 4.7) * 0.16;
      introCatGroup.rotation.z = (1 - easedFall) * -0.28 + Math.sin(elapsed * 9) * 0.035;
      introCatGroup.scale.setScalar(1 + Math.max(0, bounce) * 0.18);

      introMixers.forEach((mixer) => mixer.update(dt));
      renderer.render(introScene, introCamera);

      const preloadWaitTimedOut = elapsed >= INTRO_VISIBLE_SECONDS + 1.35;
      const canFadeToMain =
        elapsed >= INTRO_FADE_START_SECONDS &&
        (coreModelsReadyRef.current || preloadWaitTimedOut);

      if (canFadeToMain && !fadeStartedAt) {
        fadeStartedAt = elapsed;
        setIsFading(true);
      }

      if (fadeStartedAt && elapsed >= fadeStartedAt + INTRO_FADE_SECONDS && !disposed) {
        onFinished?.();
        return;
      }

      animationFrame = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      resizeBubbleCanvas();
      resizeCatCanvas();
    };

    handleResize();
    animationFrame = requestAnimationFrame(animate);
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
      introMixers.forEach((mixer) => mixer.stopAllAction());
      disposeObject(introScene);
      renderer.dispose();
    };
  }, [onFinished, preloadStore]);

  return (
    <div className={`shoppingIntroSplash${isFading ? ' isFading' : ''}`}>
      <canvas
        ref={bubbleCanvasRef}
        className="shoppingIntroBubbleCanvas"
        aria-hidden="true"
      />

      <canvas
        ref={catCanvasRef}
        className="shoppingIntroCatCanvas"
        aria-hidden="true"
      />

      <div className="shoppingIntroPreviewText">
        <img
          src="/images/almostmadeinjapan.png"
          alt="Almost Made in Japan"
          className="shoppingIntroLogo"
          draggable="false"
        />

        <div ref={textCardRef} className="shoppingIntroTextCard">
          <h1 className="shoppingIntroText">
            AN ALIEN CAT CAME
            <span>TO COLLECT YOU FOR SHOPPING</span>
          </h1>
        </div>
      </div>
    </div>
  );
}

export default function CosmicVoyage() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const preloadStoreRef = useRef(null);

  if (!preloadStoreRef.current) {
    preloadStoreRef.current = createPreloadStore();
  }

  const [loading, setLoading] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const [ringPopupOpen, setRingPopupOpen] = useState(false);
  const [ringTerminalText, setRingTerminalText] = useState('');
  const ringTerminalRef = useRef(null);
  const [landedUI, setLandedUI] = useState(false);
  const [modelError, setModelError] = useState('');
  const [movingBgSymbols, setMovingBgSymbols] = useState([]);
  const [introFinished, setIntroFinished] = useState(false);
  const [coreModelsReady, setCoreModelsReady] = useState(false);
  const finishIntro = useCallback(() => setIntroFinished(true), []);
  const closeRingPopup = useCallback(() => setRingPopupOpen(false), []);

  useEffect(() => {
    if (!ringPopupOpen) {
      setRingTerminalText('');
      return undefined;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(index + 2, RING_TERMINAL_MESSAGE.length);
      setRingTerminalText(RING_TERMINAL_MESSAGE.slice(0, index));

      if (index >= RING_TERMINAL_MESSAGE.length) {
        window.clearInterval(timer);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [ringPopupOpen]);

  useEffect(() => {
    if (!ringTerminalRef.current) return;
    ringTerminalRef.current.scrollTop = ringTerminalRef.current.scrollHeight;
  }, [ringTerminalText]);

  const resetExperience = () => {
    const state = stateRef.current;
    if (!state) return;

    state.landed = false;
    state.isDragging = false;
    state.hasDragged = false;
    state.dragDistancePx = 0;
    state.launching = false;
    state.launchComplete = false;
    state.launchElapsed = 0;

    state.cur.copy(START);
    state.tgt.copy(START);

    state.boatGroup.visible = true;
    state.boatGroup.position.set(0, BOAT_WATERLINE_Y, BOAT_DEPTH);
    state.boatGroup.rotation.set(0, 0, 0);
    state.boatGroup.scale.setScalar(1);

    state.catGroup.position.copy(START);
    state.catGroup.rotation.set(0, 0, 0);
    state.catGroup.scale.setScalar(1);
    state.catGroup.visible = true;
    state.burstT = -1;
    state.particleMaterial.opacity = 0;

    document.body.style.cursor = '';

    setLoading(false);
    setLoadingPercent(0);
    setPopupOpen(false);
    setRingPopupOpen(false);
    setLandedUI(false);
  };


  useEffect(() => {
    const preloadStore = preloadStoreRef.current;
    let cancelled = false;

    THREE.Cache.enabled = true;

    // Start the two models needed for first paint immediately.
    Promise.allSettled(
      CORE_MODEL_PRELOAD_URLS.map((url) => preloadGLB(preloadStore, url)),
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(
            `Could not preload core model ${CORE_MODEL_PRELOAD_URLS[index]}:`,
            result.reason,
          );
        }
      });

      if (!cancelled) {
        setCoreModelsReady(true);
      }
    });

    // Warm the rest of /public in idle time so the intro stays smooth.
    const cancelIdleWork = runSoonWhenIdle(() => {
      ALL_PUBLIC_GLB_PRELOAD_URLS
        .filter((url) => !CORE_MODEL_PRELOAD_URLS.includes(url))
        .forEach((url) => {
          preloadGLB(preloadStore, url).catch((error) => {
            console.warn(`Optional model preload skipped ${url}:`, error);
          });
        });

      PUBLIC_IMAGE_PRELOAD_URLS.forEach((url) => {
        preloadTexture(preloadStore, url).catch(() => null);
      });
    });

    return () => {
      cancelled = true;
      cancelIdleWork?.();
    };
  }, []);

  useEffect(() => {
    if (!introFinished) return;
    setMovingBgSymbols(createMovingBackgroundSymbols());
  }, [introFinished]);

  useEffect(() => {
    if (!introFinished) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let width = window.innerWidth;
    let height = window.innerHeight;

    THREE.Cache.enabled = true;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false;

    const scene = new THREE.Scene();
    scene.background = null;
    renderer.setClearColor(0x000000, 0);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1200);
    camera.position.set(0, height > width ? 2.8 : 2.5, height > width ? 13.5 : 11);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xe9e4ff, 0xffe8f5, 2.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(4, 8, 7);
    keyLight.castShadow = false;
    scene.add(keyLight);

    const blueFill = new THREE.PointLight(0xaedbff, 2.2, 30);
    blueFill.position.set(-5, 2, 5);
    scene.add(blueFill);

    const pinkFill = new THREE.PointLight(0xffb7dc, 1.8, 20);
    pinkFill.position.set(5, 3, 3);
    scene.add(pinkFill);

    // Star field
    const starCount = width < 768 ? 450 : 900;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i += 1) {
      const u = Math.random();
      const v = Math.random();
      const theta = Math.PI * 2 * u;
      const phi = Math.acos(2 * v - 1);
      const radius = 60 + Math.random() * 30;

      starPositions[i * 3] =
        radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] =
        radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] =
        radius * Math.cos(phi);
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(starPositions, 3),
    );

    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xb7c8ff,
        size: 0.3,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    scene.add(stars);

    // Infinity triangle water is drawn first, like z-index: -100000.
    // Old opaque waves, boat and cat render on top of it.
    const infinityTriangleWater = createInfinityTriangleWater();
    scene.add(infinityTriangleWater);

const tipMaterial = new THREE.SpriteMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: true,
  toneMapped: false,
  color: new THREE.Color(1.0, 1.0, 1.0),
  opacity: 1,
  blending: THREE.NormalBlending,
});

const tipImage = new THREE.Sprite(tipMaterial);

tipImage.position.set(0, 30, -600);

scene.add(tipImage);

loadBlurredSpriteTexture('/images/heart.png?v=10', 4.0)
  .then((texture) => {
    tipMaterial.map = texture;
    tipMaterial.needsUpdate = true;

    const aspect = texture.image.width / texture.image.height;

    const heartHeight = 60;
    const heartWidth = heartHeight * aspect;

    tipImage.scale.set(heartWidth, heartHeight, 1);
  })
  .catch((error) => {
    console.error('Could not load blurred /images/heart.png:', error);
  });
      
    // Smooth pastel water: no GLB and no textures, but enough geometry for real waves.
    // This avoids the hard texture cuts caused by separate flat highlight planes.
    const pastelWater = createUltraFastWater();
    scene.add(pastelWater.group);

    // Optional water texture for both the old/front water and the infinity triangle.
    // Missing file = no texture added, so both waters stay exactly like before.
    const waterTextureLoader = new THREE.TextureLoader();

    waterTextureLoader.load(
      '/images/water-texture.jpg?v=1',
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5, 5);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;

        // Add texture to the old/front water only after the image exists.
        if (pastelWater?.water?.material) {
          pastelWater.water.material.map = texture;
          pastelWater.water.material.roughness = 0.12;
          pastelWater.water.material.needsUpdate = true;
        }

        // Add texture to the new/infinity triangle only after the image exists.
        if (infinityTriangleWater?.material?.uniforms) {
          infinityTriangleWater.material.uniforms.uWaterTexture.value = texture;
          infinityTriangleWater.material.uniforms.uTextureStrength.value = 0.22;
        }
      },
      undefined,
      (error) => {
        console.warn(
          'No /images/water-texture.jpg found. Water stays original without texture.',
          error,
        );
      },
    );

    // These groups preserve all of the original motion and drag behaviour.
    // The GLB scenes are inserted inside them after loading.
    const boatGroup = new THREE.Group();
    boatGroup.position.z = BOAT_DEPTH;
    scene.add(boatGroup);

    const catGroup = new THREE.Group();
    catGroup.position.copy(START);
    scene.add(catGroup);

    const floatRingGroup = new THREE.Group();
    floatRingGroup.name = 'ClickableFloatingRing';
    floatRingGroup.position.copy(FLOAT_RING_POSITION);
    scene.add(floatRingGroup);

    const seatPosition = DEFAULT_SEAT.clone();
    const mixers = [];
    const fluffTexture = createFluffSpriteTexture();
    const fluffClouds = [];

    const dropZoneMaterial = new THREE.MeshBasicMaterial({
      color: 0xaedbff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const dropZoneRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.38, 128),
      dropZoneMaterial,
    );
    dropZoneRing.rotation.x = -Math.PI / 2;
    dropZoneRing.position.y = 0.15;
    boatGroup.add(dropZoneRing);

    const dropTargetMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
      side: THREE.DoubleSide,
    });

    const dropTarget = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 3.8, 6.4),
      dropTargetMaterial,
    );
    dropTarget.position.set(0, 0.8, 0);
    dropTarget.name = 'BoatDropTarget';
    boatGroup.add(dropTarget);

    const boatGlow = new THREE.PointLight(0xb8dfff, 2.4, 10);
    boatGlow.position.set(0, 0.45, 0);
    boatGroup.add(boatGlow);

    const catGlow = new THREE.PointLight(0xb8dfff, 2.8, 5);
    catGlow.position.set(0, 0.4, 0.5);
    catGroup.add(catGlow);

    const catPinkGlow = new THREE.PointLight(0xffb7dc, 2.0, 4);
    catPinkGlow.position.set(0, 0.9, 0);
    catGroup.add(catPinkGlow);

    const floatRingHitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
    });

    const floatRingHitbox = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 32, 16),
      floatRingHitMaterial,
    );
    floatRingHitbox.name = 'FloatingRingClickTarget';
    floatRingHitbox.userData.isFloatingRing = true;
    floatRingGroup.add(floatRingHitbox);

    const floatRingGlow = new THREE.PointLight(0xffd7f4, 1.8, 4.5);
    floatRingGlow.position.set(0, 0.28, 0);
    floatRingGroup.add(floatRingGlow);

    // Load the boat and cat from the intro preload cache when possible.
    // If the intro finished before a preload completed, this waits on the same Promise
    // instead of starting a duplicate network request.
    const preloadStore = preloadStoreRef.current;


    loadSceneGLTF(preloadStore, FLOAT_RING_MODEL_URL)
      .catch((primaryError) => {
        console.warn('Could not load /models/float-ring.glb, trying /models/floatring.glb:', primaryError);
        return loadSceneGLTF(preloadStore, FLOAT_RING_FALLBACK_MODEL_URL);
      })
      .then((ringGLTF) => {
        if (disposed) {
          disposeObject(ringGLTF.scene);
          return;
        }

        const floatRingModel = ringGLTF.scene;
        floatRingModel.name = 'FloatingRingModel';
        improveModelQuality(floatRingModel, renderer, [
          new THREE.Color(0xffb7dc),
          new THREE.Color(0xcab8ff),
          new THREE.Color(0xaedbff),
          new THREE.Color(0xffffff),
        ]);

        fitModel(
          floatRingModel,
          FLOAT_RING_TARGET_SIZE,
          -0.16,
          0,
          'max',
        );

        // If the ring appears upright in your exported GLB, change this constant to 0.
        floatRingModel.rotation.x = FLOAT_RING_MODEL_TILT_X;
        floatRingModel.rotation.z = 0.14;
        floatRingModel.traverse((object) => {
          object.userData.isFloatingRing = true;
        });

        floatRingGroup.add(floatRingModel);
      })
      .catch((error) => {
        console.warn('Floating ring model could not be loaded:', error);
      });

    Promise.all([
      loadSceneGLTF(preloadStore, BOAT_MODEL_URL),
      loadSceneGLTF(preloadStore, CAT_MODEL_URL),
    ])
      .then(([boatGLTF, catGLTF]) => {
        if (disposed) {
          disposeObject(boatGLTF.scene);
          disposeObject(catGLTF.scene);
          return;
        }

        const boatModel = boatGLTF.scene;
        boatModel.name = 'CosmicBoatModel';
        improveModelQuality(boatModel, renderer, [
          new THREE.Color(0xaedbff),
          new THREE.Color(0xcab8ff),
          new THREE.Color(0xffb7dc),
        ]);

        const boatBox = fitModel(
          boatModel,
          7.0,
          -0.65,
          BOAT_MODEL_ROTATION_Y,
          'horizontal',
        );

        boatGroup.add(boatModel);
        createMixer(boatModel, boatGLTF.animations, mixers);

        const boatFluff = addTexturePreservingFluff(boatModel, {
          texture: fluffTexture,
          count: width < 768 ? 220 : 340,
          size: 0.115,
          opacity: 0.28,
          shellOffset: 0.070,
          jitter: 0.026,
          palette: ['#fff0fb', '#efe7ff', '#e9fbff', '#ffffff'],
          skipPattern: /eye|eyes|pupil|iris|glass|window|light|glow|black|mouth|teeth|screen|gem|crystal|metal|chrome|propeller/i,
        });

        if (boatFluff) fluffClouds.push(boatFluff);

        const boatSize = boatBox.getSize(new THREE.Vector3());

        // Optional exact marker:
        // Add an Empty named "CatSeat" inside cosmic-boat.glb to control
        // the final cat position precisely.
        const seatMarker =
          boatModel.getObjectByName('CatSeat') ||
          boatModel.getObjectByName('cat_seat') ||
          boatModel.getObjectByName('CAT_SEAT');

        if (seatMarker) {
          const markerWorld = seatMarker.getWorldPosition(new THREE.Vector3());
          seatPosition.copy(boatGroup.worldToLocal(markerWorld));
        } else {
          const estimatedDeckY = boatBox.min.y + boatSize.y * 0.25;

          seatPosition.set(
            -0.8,
            estimatedDeckY - CAT_GROUND_Y + 0.03,
            boatBox.max.z - boatSize.z * 0.38,
          );
        }

        dropZoneRing.position.y =
          seatPosition.y + CAT_GROUND_Y + 0.04;

        const catModel = catGLTF.scene;
        catModel.name = 'AlienCatModel';
        improveModelQuality(catModel, renderer, [
          new THREE.Color(0xffb7dc),
          new THREE.Color(0xcab8ff),
          new THREE.Color(0xaedbff),
        ]);

        const catBox = fitModel(
          catModel,
          2.35,
          CAT_GROUND_Y,
          CAT_MODEL_ROTATION_Y,
          'max',
        );

        catGroup.add(catModel);
        createMixer(catModel, catGLTF.animations, mixers);

        const catFluff = addTexturePreservingFluff(catModel, {
          texture: fluffTexture,
          count: width < 768 ? 420 : 620,
          size: 0.105,
          opacity: 0.42,
          shellOffset: 0.095,
          jitter: 0.035,
          palette: ['#fff6fb', '#f5e9ff', '#e8fbff', '#ffffff'],
        });

        if (catFluff) fluffClouds.push(catFluff);

        const catSize = catBox.getSize(new THREE.Vector3());
        const hitRadius =
          Math.max(catSize.x, catSize.y, catSize.z) * 0.7;

        const currentState = stateRef.current;
        if (currentState) {
          currentState.modelsReady = true;
          currentState.catHitRadius = Math.max(0.7, hitRadius);
        }
      })
      .catch((error) => {
        console.error('Cosmic Voyage model/setup error:', error);

        if (!disposed) {
          setModelError(
            `Model setup failed: ${error?.message || 'Unknown GLB/model error'}`,
          );
        }
      });

    // Celebration particles
    const particleCount = 50;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color(0xffb7dc),
      new THREE.Color(0xcab8ff),
      new THREE.Color(0xaedbff),
      new THREE.Color(0xf5c8ff),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < particleCount; i += 1) {
      const color = palette[i % palette.length];
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3),
    );
    particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(particleColors, 3),
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const burstPoints = new THREE.Points(
      particleGeometry,
      particleMaterial,
    );
    burstPoints.position.set(0, 0.8, 0.3);
    scene.add(burstPoints);

    const raycaster = new THREE.Raycaster();
    const dragPlane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      -DRAG_Z,
    );
    const pointerNDC = new THREE.Vector2();
    const temporaryWorldPosition = new THREE.Vector3();

    const currentPosition = START.clone();
    const targetPosition = START.clone();

    const state = {
      landed: false,
      isDragging: false,
      hasDragged: false,
      dragDistancePx: 0,
      dragStartClient: new THREE.Vector2(),
      modelsReady: false,
      catHitRadius: 0.9,
      launching: false,
      launchComplete: false,
      launchElapsed: 0,
      cur: currentPosition,
      tgt: targetPosition,
      boatGroup,
      catGroup,
      floatRingGroup,
      particleMaterial,
      burstT: -1,
    };

    stateRef.current = state;

    const setPointerRay = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();

      pointerNDC.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(pointerNDC, camera);
    };

    const pointerToWorld = (clientX, clientY) => {
      setPointerRay(clientX, clientY);
      raycaster.ray.intersectPlane(
        dragPlane,
        temporaryWorldPosition,
      );
      return temporaryWorldPosition;
    };


    const tryOpenFloatingRing = (clientX, clientY) => {
      if (state.isDragging || state.launching) return false;

      setPointerRay(clientX, clientY);
      const ringIntersections = raycaster.intersectObject(floatRingGroup, true);

      if (ringIntersections.length > 0) {
        setRingPopupOpen(true);
        document.body.style.cursor = '';
        return true;
      }

      return false;
    };

    const tryDrag = (clientX, clientY) => {
      if (state.landed || !state.modelsReady) return;

      setPointerRay(clientX, clientY);

      const modelIntersections = raycaster.intersectObject(
        catGroup,
        true,
      );

      const catWorldPosition = catGroup.getWorldPosition(
        new THREE.Vector3(),
      );

      const closeToCat =
        raycaster.ray.distanceToPoint(catWorldPosition) <
        state.catHitRadius;

      if (modelIntersections.length > 0 || closeToCat) {
        state.isDragging = true;
        state.hasDragged = false;
        state.dragDistancePx = 0;
        state.dragStartClient.set(clientX, clientY);
        document.body.style.cursor = 'grabbing';
      }
    };

    const moveDraggedCat = (clientX, clientY) => {
      if (!state.isDragging || state.landed) return;

      const deltaX = clientX - state.dragStartClient.x;
      const deltaY = clientY - state.dragStartClient.y;
      const distance = Math.hypot(deltaX, deltaY);

      state.dragDistancePx = Math.max(
        state.dragDistancePx,
        distance,
      );

      // This threshold prevents a tap or tiny finger wobble from
      // counting as a completed drag.
      if (state.dragDistancePx < 14) return;

      state.hasDragged = true;

      const worldPosition = pointerToWorld(clientX, clientY);

      if (worldPosition.lengthSq() > 0.001) {
        state.tgt.set(
          worldPosition.x,
          worldPosition.y,
          DRAG_Z,
        );
      }
    };

    const spawnBurst = () => {
      state.burstT = 0;
      const positions =
        particleGeometry.attributes.position.array;

      for (let i = 0; i < particleCount; i += 1) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;

        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;

        particleVelocities[i * 3] =
          Math.sin(phi) * Math.cos(theta) * speed;
        particleVelocities[i * 3 + 1] =
          Math.abs(Math.sin(phi) * Math.sin(theta) * speed) +
          0.5;
        particleVelocities[i * 3 + 2] =
          Math.cos(phi) * speed;
      }

      particleGeometry.attributes.position.needsUpdate = true;
    };

    const finishDrag = (clientX, clientY) => {
      if (!state.isDragging || state.landed) return;

      state.isDragging = false;
      document.body.style.cursor = '';

      // A press-and-release without meaningful movement is only a tap.
      if (!state.hasDragged) {
        state.tgt.copy(START);
        state.dragDistancePx = 0;
        return;
      }

      // The release point must actually be over the boat's invisible
      // 3D drop target. This keeps drop detection visually accurate
      // even though the boat is farther away in depth.
      setPointerRay(clientX, clientY);
      const releasedOverBoat =
        raycaster.intersectObject(dropTarget, false).length > 0;

      state.hasDragged = false;
      state.dragDistancePx = 0;

      if (releasedOverBoat) {
        state.landed = true;
        state.launching = true;
        state.launchComplete = false;
        state.launchElapsed = 0;

        boatGroup.updateMatrixWorld(true);
        state.tgt.copy(
          boatGroup.localToWorld(seatPosition.clone()),
        );

        // Keep the cat visible throughout the loading sequence.
        setLandedUI(true);
        setLoading(true);
        setLoadingPercent(0);
        spawnBurst();

        const startedAt = Date.now();

        const progressTimer = window.setInterval(() => {
          const nextPercent = Math.min(
            100,
            Math.round(
              ((Date.now() - startedAt) / 3000) * 100,
            ),
          );

          setLoadingPercent(nextPercent);

          if (nextPercent >= 100) {
            window.clearInterval(progressTimer);
          }
        }, 60);

        window.setTimeout(() => {
          window.clearInterval(progressTimer);

          state.launching = false;
          state.launchComplete = true;
          state.boatGroup.visible = false;
          state.catGroup.visible = false;

          setLoading(false);
          setLoadingPercent(100);
          setPopupOpen(true);
        }, LAUNCH_DURATION_SECONDS * 1000);
      } else {
        state.tgt.copy(START);
      }
    };

    const onMouseDown = (event) => {
      if (tryOpenFloatingRing(event.clientX, event.clientY)) return;
      tryDrag(event.clientX, event.clientY);
    };

    const onMouseMove = (event) => {
      moveDraggedCat(event.clientX, event.clientY);

      if (!state.isDragging && !state.landed && !state.launching) {
        setPointerRay(event.clientX, event.clientY);
        const hoveringRing = raycaster.intersectObject(floatRingGroup, true).length > 0;
        document.body.style.cursor = hoveringRing ? 'pointer' : '';
      }
    };

    const onMouseUp = (event) => {
      finishDrag(event.clientX, event.clientY);
    };

    const onTouchStart = (event) => {
      event.preventDefault();
      const touch = event.touches[0];

      if (touch) {
        if (tryOpenFloatingRing(touch.clientX, touch.clientY)) return;
        tryDrag(touch.clientX, touch.clientY);
      }
    };

    const onTouchMove = (event) => {
      if (state.isDragging) event.preventDefault();
      const touch = event.touches[0];

      if (touch) {
        moveDraggedCat(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = (event) => {
      const touch = event.changedTouches[0];

      if (touch) {
        finishDrag(touch.clientX, touch.clientY);
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, {
      passive: false,
    });
    window.addEventListener('touchmove', onTouchMove, {
      passive: false,
    });
    window.addEventListener('touchend', onTouchEnd);

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 1.5),
      );
      renderer.setSize(width, height);

      camera.aspect = width / height;
      camera.position.set(
        0,
        height > width ? 2.8 : 2.5,
        height > width ? 13.5 : 11,
      );
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let elapsed = 0;

    const lerp = (from, to, amount) =>
      from + (to - from) * amount;

    const easeOutCubic = (value) =>
      1 - Math.pow(1 - value, 3);

    renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.05);
      elapsed += delta;

      infinityTriangleWater.material.uniforms.uTime.value = elapsed;

      // Animate the optional water texture only if it successfully loaded.
      if (pastelWater?.water?.material?.map) {
        pastelWater.water.material.map.offset.x = elapsed * 0.015;
        pastelWater.water.material.map.offset.y = elapsed * 0.025;
      }


      const ringBob = Math.sin(elapsed * 2.05) * 0.085 + Math.cos(elapsed * 1.25) * 0.035;
      floatRingGroup.position.set(
        FLOAT_RING_POSITION.x,
        FLOAT_RING_POSITION.y + ringBob,
        FLOAT_RING_POSITION.z,
      );
      floatRingGroup.rotation.x = Math.cos(elapsed * 1.45) * 0.045;
      floatRingGroup.rotation.y = Math.sin(elapsed * 0.85) * 0.10;
      floatRingGroup.rotation.z = Math.sin(elapsed * 1.75) * 0.065;
      floatRingGlow.intensity = 1.45 + Math.sin(elapsed * 3.2) * 0.28;

      fluffClouds.forEach((cloud) => {
        const motion = cloud.userData.fluffMotion;
        if (!motion) return;

        const pulse = 0.92 + Math.sin(elapsed * 2.15 + motion.phase) * 0.08;
        cloud.material.size = motion.baseSize * pulse;
        cloud.material.opacity = motion.baseOpacity * (0.88 + Math.sin(elapsed * 1.75 + motion.phase) * 0.12);
        cloud.rotation.y = Math.sin(elapsed * 0.72 + motion.phase) * 0.018;
        cloud.rotation.x = Math.cos(elapsed * 0.55 + motion.phase) * 0.012;
      });

      // Smooth high waves with animated vertex colors.
      // PlaneGeometry lies in local X/Y, so wave height is local Z after rotation.
      const colorAttr = pastelWater.water.geometry.attributes.color;

      for (let i = 0; i < pastelWater.waterPositions.count; i += 1) {
        const x = pastelWater.basePositions[i * 3];
        const y = pastelWater.basePositions[i * 3 + 1];

        const longWave =
          Math.sin(x * 0.18 + elapsed * 2.55) * 0.50;
        const crossWave =
          Math.cos(y * 0.16 + elapsed * 2.15) * 0.36;
        const diagonalWave =
          Math.sin((x + y) * 0.085 + elapsed * 3.2) * 0.22;
        const smallTide =
          Math.cos((x - y) * 0.12 + elapsed * 4.1) * 0.12;

        const height =
          longWave +
          crossWave +
          diagonalWave +
          smallTide;

        pastelWater.waterPositions.array[i * 3 + 2] = height;

        const crest = THREE.MathUtils.clamp(
          (height + 0.75) / 1.65,
          0,
          1,
        );

        const ribbonA =
          (Math.sin(x * 0.105 + elapsed * 0.9) + 1) * 0.5;
        const ribbonB =
          (Math.cos(y * 0.115 - elapsed * 0.7) + 1) * 0.5;
        const ribbonC =
          (Math.sin((x + y) * 0.06 + elapsed * 1.15) + 1) * 0.5;

        const c = new THREE.Color();

        c.copy(pastelWater.deepCyan)
          .lerp(pastelWater.cyan, crest * 0.65)
          .lerp(pastelWater.pink, ribbonA * 0.42)
          .lerp(pastelWater.lavender, ribbonB * 0.34)
          .lerp(pastelWater.softPink, ribbonC * 0.20)
          .lerp(pastelWater.whiteFoam, Math.max(0, crest - 0.72) * 0.75);

        colorAttr.array[i * 3] = c.r;
        colorAttr.array[i * 3 + 1] = c.g;
        colorAttr.array[i * 3 + 2] = c.b;
      }

      pastelWater.waterPositions.needsUpdate = true;
      colorAttr.needsUpdate = true;
      pastelWater.water.geometry.computeVertexNormals();
      pastelWater.water.rotation.z = Math.sin(elapsed * 0.8) * 0.006;

      if (state.launching) {
        state.launchElapsed = Math.min(
          LAUNCH_DURATION_SECONDS,
          state.launchElapsed + delta,
        );

        const launchProgress =
          state.launchElapsed / LAUNCH_DURATION_SECONDS;
        const easedLaunch = easeOutCubic(launchProgress);

        // Turn the boat around and send it far away while LOADING is shown.
        boatGroup.position.x =
          Math.sin(easedLaunch * Math.PI) * 1.6;
        boatGroup.position.y =
          BOAT_WATERLINE_Y +
          easedLaunch * LAUNCH_HEIGHT +
          Math.sin(elapsed * 8.0) * 0.08;
        boatGroup.position.z =
          BOAT_DEPTH - easedLaunch * LAUNCH_DISTANCE;

      // Keep the boat facing away during the whole flyaway.
// Math.PI turns it quarter degrees so the viewer sees the back.
boatGroup.rotation.y = -Math.PI / 2;
boatGroup.rotation.z = 0;
boatGroup.rotation.x = 0;
        
      } else if (!state.launchComplete) {
        boatGroup.position.x = 0;
        boatGroup.position.y =
          BOAT_WATERLINE_Y +
          Math.sin(elapsed * 2.45) * 0.17 +
          Math.cos(elapsed * 1.65) * 0.08;
        boatGroup.position.z = BOAT_DEPTH;

        boatGroup.rotation.y = 0;
        boatGroup.rotation.z = Math.sin(elapsed * 2.1) * 0.055;
        boatGroup.rotation.x = Math.cos(elapsed * 1.8) * 0.028;
      }

      mixers.forEach((mixer) => mixer.update(delta));

      const dragging = state.isDragging && !state.landed;
      dropZoneMaterial.opacity = lerp(
        dropZoneMaterial.opacity,
        dragging
          ? 0.5 + Math.sin(elapsed * 4) * 0.2
          : 0,
        Math.min(1, delta * 7),
      );

      const followSpeed = state.isDragging
        ? 13
        : state.landed
          ? 4
          : 7;

      const followAmount = Math.min(
        1,
        delta * followSpeed,
      );

      if (state.landed && !state.launchComplete) {
        // Convert the seat marker/local seat position into scene space
        // every frame so the cat follows the farther-away floating boat.
        boatGroup.updateMatrixWorld(true);
        state.tgt.copy(
          boatGroup.localToWorld(seatPosition.clone()),
        );
      }

      state.cur.x = lerp(
        state.cur.x,
        state.tgt.x,
        followAmount,
      );
      state.cur.y = lerp(
        state.cur.y,
        state.tgt.y,
        followAmount,
      );
      state.cur.z = lerp(
        state.cur.z,
        state.tgt.z,
        followAmount,
      );

      catGroup.position.copy(state.cur);

      if (!state.isDragging && !state.landed) {
  const jump = Math.abs(Math.sin(elapsed * 3.2));

  catGroup.position.y += jump * 0.38;
  catGroup.position.z += Math.sin(elapsed * 1.6) * 0.08;

  catGroup.rotation.y = 0;
  catGroup.rotation.z = Math.sin(elapsed * 6.4) * 0.08;
  catGroup.rotation.x = Math.sin(elapsed * 3.2) * -0.08;
} else if (state.isDragging) {
  catGroup.rotation.y = 0;
      }
if (state.landed) {
  const happyPulse = Math.max(
    0,
    Math.sin(elapsed * 8),
  );

  const CAT_ON_BOAT_OFFSET = new THREE.Vector3(0, 0.0, 0);
  const CAT_ON_BOAT_ROTATION = new THREE.Euler(-0.08, 0, 0);

  catGroup.position.add(CAT_ON_BOAT_OFFSET);
  catGroup.position.y += happyPulse * 0.09;

  catGroup.rotation.x = CAT_ON_BOAT_ROTATION.x;
  catGroup.rotation.y = CAT_ON_BOAT_ROTATION.y;
  catGroup.rotation.z =
    boatGroup.rotation.z + CAT_ON_BOAT_ROTATION.z;

  catGroup.scale.setScalar(1 + happyPulse * 0.035);
}
       else {
        catGroup.scale.setScalar(1);
      }

      if (state.burstT >= 0) {
        state.burstT += delta;

        const positions =
          particleGeometry.attributes.position.array;

        for (let i = 0; i < particleCount; i += 1) {
          positions[i * 3] +=
            particleVelocities[i * 3] * delta;
          positions[i * 3 + 1] +=
            particleVelocities[i * 3 + 1] * delta;
          positions[i * 3 + 2] +=
            particleVelocities[i * 3 + 2] * delta;

          particleVelocities[i * 3 + 1] -= delta * 1.6;
          particleVelocities[i * 3] *= 0.98;
          particleVelocities[i * 3 + 2] *= 0.98;
        }

        particleGeometry.attributes.position.needsUpdate =
          true;

        particleMaterial.opacity =
          state.burstT < 1.6
            ? Math.max(0, 1 - state.burstT / 1.6)
            : 0;

        if (state.burstT > 2) {
          state.burstT = -1;
        }
      }

      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);

      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);

      document.body.style.cursor = '';
      stateRef.current = null;

      mixers.forEach((mixer) => mixer.stopAllAction());
      disposeObject(scene);
      renderer.dispose();
    };
  }, [introFinished]);

  const loadingBarStyle = useMemo(
    () => ({ width: `${loadingPercent}%` }),
    [loadingPercent],
  );

  return (
    <main className="stage">
      {!introFinished ? (
        <ShoppingIntroSplash
          onFinished={finishIntro}
          preloadStore={preloadStoreRef.current}
          coreModelsReady={coreModelsReady}
        />
      ) : (
        <div className="mainExperienceFadeIn">
          <div className="pastelBackgroundViewport" aria-hidden="true">
        <div className="pastelBackgroundMotion">
          <div className="spaceBg" />

          <div className="movingSymbolLayer">
            {movingBgSymbols.map((symbol) => (
              <img
                key={symbol.id}
                className="movingBgSymbol"
                src={symbol.src}
                alt=""
                style={{
                  '--x': `${symbol.x}%`,
                  '--y': `${symbol.y}%`,
                  '--size': `${symbol.size}px`,
                  '--opacity': symbol.opacity,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="canvas" />

      <div className="ui">
        <div className="logoContainer">
            <img
                src="/images/almostmadeinjapan.png"
                    alt="Almost Made in Japan"
                        className="logoImage"
                          />
        </div>


        {!landedUI && (
          <div className="hint">
           ↑ drag the alien cat to the boat ↑
          </div>
        )}
      </div>

      {loading && (
        <div className="loadingOverlay">
          <div className="loadingPopup" role="status">
            <div className="loadingWindowBar">
              <span />
            </div>

            <div className="loadingTitle">LOADING...</div>

            <div className="loadingBarOuter">
              <div
                className="loadingBarInner"
                style={loadingBarStyle}
              />
            </div>

            <div className="loadingPercent">
              {loadingPercent}%
            </div>
          </div>
        </div>
      )}

      {popupOpen && (
        <div className="popupWindow">
          <div className="popupWindow missionGalleryWindow">
              <div className="termHeader">
                  <span>COLLECTIONS</span>
                      <button type="button" onClick={resetExperience}>
                            •
                                </button>
                                  </div>

                                    <div className="missionGalleryIntro">
                                                  </div>

                                                    <div className="missionImageGrid">
                                                        {MISSION_LINK_IMAGES.map((item) => (
                                                              <a
                                                                      key={item.title}
                                                                              className="missionImageLink"
                                                                                      href={item.url}
                                                                                              target="_blank"
                                                                                                      rel="noreferrer"
                                                                                                              aria-label={`Open ${item.title}`}
                                                                                                                    >
                                                                                                                            <img
                                                                                                                                      src={item.image}
                                                                                                                                                alt={item.title}
                                                                                                                                                          loading="lazy"
                                                                                                                                                                  />
                                                                                                                                                                          <span>{item.title}</span>
                                                                                                                                                                                </a>
                                                                                                                                                                                    ))}
                                                                                                                                                                                      </div>
                                                                                                                                                                                      </div>
        </div>
      )}


      {ringPopupOpen && (
        <div
          className="ringChatOverlay"
          role="presentation"
          onPointerDown={closeRingPopup}
        >
          <div className="ringChatBubbleLayer" aria-hidden="true">
            {RING_CHAT_BUBBLES.map((bubble, index) => (
              <span
                key={`ring-bubble-${index}`}
                className="ringChatBubble"
                style={{
                  '--bubble-x': `${bubble.x}%`,
                  '--bubble-y': `${bubble.y}%`,
                  '--bubble-size': `${bubble.size}px`,
                  '--bubble-delay': `${bubble.delay}s`,
                  '--bubble-speed': `${bubble.speed}s`,
                }}
              />
            ))}
          </div>

          <div
            className="ringChatBox"
            role="dialog"
            aria-modal="true"
            aria-label="Floating ring message"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="ringChatHeader">
              <span>FLOATING RING TERMINAL</span>
              <button type="button" onClick={closeRingPopup} aria-label="Close floating ring message">
                •
              </button>
            </div>

            <pre ref={ringTerminalRef} className="ringTerminalText">
              {ringTerminalText}
              <span className="ringTerminalCursor">▌</span>
            </pre>
          </div>
        </div>
      )}

          {modelError && (
            <div className="popupWindow">
          <div className="termHeader">
            <span>MODEL LOAD ERROR</span>
            <button
              type="button"
              onClick={() => setModelError('')}
            >
              CLOSE
            </button>
          </div>

          <div className="termText">
            {modelError}
            <br />
            <br />
            The files may exist, but model setup can still fail.
            <br />
            Open the browser console for the exact error.
          </div>
        </div>
          )}
        </div>
      )}
    </main>
  );
}
