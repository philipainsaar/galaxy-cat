'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const CAT_MODEL_URL = '/models/alien-cat.glb';
const BOAT_MODEL_URL = '/models/cosmic-boat.glb';

// Change either value to Math.PI if a model faces backward after export.
const CAT_MODEL_ROTATION_Y = 0;
const BOAT_MODEL_ROTATION_Y = 0;

const START = new THREE.Vector3(1.62, -0.50, 5.0);
const DEFAULT_SEAT = new THREE.Vector3(2.5, 1.0, 2.1);
const DRAG_Z = 5.0;
const BOAT_DEPTH = -8.2;
const BOAT_WATERLINE_Y = -0.28;
const CAT_GROUND_Y = -0.5;

const LAUNCH_DURATION_SECONDS = 3;
const LAUNCH_DISTANCE = 100;
const LAUNCH_HEIGHT = 6;

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

function createFlatPastelWaterLayer(z, y, opacity = 0.55) {
  const geometry = new THREE.PlaneGeometry(120, 120, 64, 64);

  const material = new THREE.MeshStandardMaterial({
    color: 0xdff8ff,
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const water = new THREE.Mesh(geometry, material);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, y, z);
  water.renderOrder = z > -2.2 ? 3 : 0;

  return water;
}

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

export default function CosmicVoyage() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const [landedUI, setLandedUI] = useState(false);
  const [modelError, setModelError] = useState('');

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
    setLandedUI(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let width = window.innerWidth;
    let height = window.innerHeight;

    THREE.Cache.enabled = true;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
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
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
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

    // Smooth pastel water: no GLB and no textures, but enough geometry for real waves.
    // This avoids the hard texture cuts caused by separate flat highlight planes.
    const backPastelWater = createFlatPastelWaterLayer(-5.2, -1.32, 0.42);
scene.add(backPastelWater);

const pastelWater = createUltraFastWater();
scene.add(pastelWater.group);

const frontPastelWater = createFlatPastelWaterLayer(1.8, -1.18, 0.36);
scene.add(frontPastelWater);

    // These groups preserve all of the original motion and drag behaviour.
    // The GLB scenes are inserted inside them after loading.
    const boatGroup = new THREE.Group();
    boatGroup.position.z = BOAT_DEPTH;
    scene.add(boatGroup);

    const catGroup = new THREE.Group();
    catGroup.position.copy(START);
    scene.add(catGroup);

    const seatPosition = DEFAULT_SEAT.clone();
    const mixers = [];

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

    // Load the boat and cat GLB models. Water is generated as cheap geometry above.
    const loader = new GLTFLoader();

    Promise.all([
      loader.loadAsync(BOAT_MODEL_URL),
      loader.loadAsync(CAT_MODEL_URL),
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
        console.error('Failed to load Cosmic Voyage GLB models:', error);

        if (!disposed) {
          setModelError(
            'Could not load alien-cat.glb or cosmic-boat.glb from /public/models',
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
      tryDrag(event.clientX, event.clientY);
    };

    const onMouseMove = (event) => {
      moveDraggedCat(event.clientX, event.clientY);
    };

    const onMouseUp = (event) => {
      finishDrag(event.clientX, event.clientY);
    };

    const onTouchStart = (event) => {
      event.preventDefault();
      const touch = event.touches[0];

      if (touch) {
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

        pastelWater.water.rotation.z = Math.sin(elapsed * 0.8) * 0.006;

// NEW WATER ANIMATION

backPastelWater.material.color.offsetHSL(
  Math.sin(elapsed * 0.4) * 0.0008,
  0,
  Math.sin(elapsed * 0.8) * 0.0008,
);

frontPastelWater.material.color.offsetHSL(
  Math.sin(elapsed * 0.5) * 0.0008,
  0,
  Math.sin(elapsed * 1.0) * 0.0008,
);

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
  }, []);

  const loadingBarStyle = useMemo(
    () => ({ width: `${loadingPercent}%` }),
    [loadingPercent],
  );

  return (
    <main className="stage">
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
              <span>□</span>
              <span>✕</span>
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
          <div className="termHeader">
            <span>COLLECTIONS</span>
            <button type="button" onClick={resetExperience}>
              •
            </button>
          </div>

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
            Confirm both GLB files exist in:
            <br />
            public/models/
          </div>
        </div>
      )}
    </main>
  );
}
