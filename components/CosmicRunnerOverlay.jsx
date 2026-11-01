"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const SITE_SOUND_EVENT_NAME = "galaxy-cat:play-sound";
const SITE_MUSIC_EVENT_NAME = "galaxy-cat:music";
const RUNNER_JUMP_SOUND_URL = "/sounds/runner-jump.mp3";
const RUNNER_GAME_OVER_SOUND_URL = "/sounds/runner-game-over.mp3";
const RUNNER_GAME_MUSIC_URL = "/sounds/runner-game-music.mp3";
const RUNNER_GAME_MUSIC_VOLUME = 0.38;

// Lighter rendering for mobile.
const RUNNER_RENDER_PIXEL_RATIO = 1.5;
const RUNNER_SCORE_MULTIPLIER = 12;
const RUNNER_SPARKLE_COUNT = 12;
// Floating sky clouds. All 12 images are shuffled, then reused without
// overlaps. These are decorations only, never obstacle hitboxes.
const SKY_DECORATION_MODE = "png"; // "png" or "crystal"
const SKY_DECORATION_IMAGE_URLS = Array.from(
  { length: 12 },
  (_, index) => `/images/cloud-${String(index).padStart(2, "0")}.png`,
);
const SKY_CLOUD_HEIGHT_MIN = 0.57; // World-space height of a small cloud
const SKY_CLOUD_HEIGHT_MAX = 0.82; // World-space height of a large cloud
const SKY_CLOUD_SPEED = 0.90;      // Same speed for all clouds: no overtaking
const SKY_CLOUD_GAP = 0.65;       // Horizontal gap between cloud edges
const SKY_CLOUD_Z = -2.0;        // Shared depth to maintain exact spacing

const RUNNER_STRIPE_COUNT = 12;
// All 19 transparent gem images live in /public/images/.
// Every available gem is equally likely to appear as a runner obstacle.
const GEM_OBSTACLE_IMAGE_URLS = Array.from(
  { length: 19 },
  (_, index) => `/images/gem${index + 1}.png`,
);

const LEADERBOARD_API_URL = "/api/leaderboard";
const LOCAL_LEADERBOARD_KEY = "cosmicRunnerLeaderboardLocal";
const PLAYER_NAME_KEY = "cosmicRunnerPlayerName";
const DEVICE_ID_KEY = "cosmicRunnerDeviceId";
const LEADERBOARD_LIMIT = 100;
const MAX_PLAYER_NAME_LENGTH = 18;

function getDeviceId() {
  if (typeof window === "undefined") return "server";

  try {
    let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      const randomPart =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      deviceId = `device-${randomPart}`;
      window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function cleanPlayerName(name) {
  const cleaned = String(name || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PLAYER_NAME_LENGTH);

  return cleaned || "Alien Cat";
}

function normalizeLeaderboardEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry, index) => ({
      id: String(entry?.id || `score-${index}`),
      name: cleanPlayerName(entry?.name),
      score: Math.max(0, Math.floor(Number(entry?.score) || 0)),
      createdAt: entry?.createdAt ? String(entry.createdAt) : new Date().toISOString(),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, LEADERBOARD_LIMIT);
}

function readLocalLeaderboard() {
  if (typeof window === "undefined") return [];

  try {
    return normalizeLeaderboardEntries(JSON.parse(window.localStorage.getItem(LOCAL_LEADERBOARD_KEY) || "[]"));
  } catch {
    return [];
  }
}

function saveLocalLeaderboard(entries) {
  if (typeof window === "undefined") return entries;

  const normalized = normalizeLeaderboardEntries(entries);
  try {
    window.localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(normalized));
  } catch {
    // Local storage can fail in private browsing. The game should keep running anyway.
  }
  return normalized;
}

function saveLocalScore(entry) {
  return saveLocalLeaderboard([entry, ...readLocalLeaderboard()]);
}

function requestRunnerSound(sound, options = {}) {
  if (typeof window === "undefined" || !sound) return;

  window.dispatchEvent(
    new CustomEvent(SITE_SOUND_EVENT_NAME, {
      detail: {
        sound,
        allowFallback: options.allowFallback !== false,
      },
    }),
  );
}



function requestRunnerMusic(action, options = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(SITE_MUSIC_EVENT_NAME, {
      detail: {
        action,
        sound: RUNNER_GAME_MUSIC_URL,
        volume: options.volume ?? RUNNER_GAME_MUSIC_VOLUME,
        reset: options.reset,
      },
    }),
  );
}

export default function CosmicRunnerOverlay({
  open = false,
  onClose,
  imagePath = "/images/alien-cat-game.png",
}) {
  const mountRef = useRef(null);
  const scoreRef = useRef(null);
  const bestRef = useRef(null);
  const statusRef = useRef(null);
  const overRef = useRef(null);
  const playerNameInputRef = useRef(null);
  const lastScoreRef = useRef(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardMode, setLeaderboardMode] = useState("loading");
  const [leaderboardMessage, setLeaderboardMessage] = useState("Loading global scoreboard...");
  const [lastScore, setLastScore] = useState(0);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);

  const refreshLeaderboard = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      const response = await fetch(`${LEADERBOARD_API_URL}?limit=${LEADERBOARD_LIMIT}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Global scoreboard is not configured yet.");

      const data = await response.json();
      const entries = normalizeLeaderboardEntries(data?.scores);
      setLeaderboard(entries);
      setLeaderboardMode(data?.mode === "global" ? "global" : "local");
      setLeaderboardMessage(data?.mode === "global" ? "Global scoreboard" : "Local scores on this device");
    } catch {
      setLeaderboard(readLocalLeaderboard());
      setLeaderboardMode("local");
      setLeaderboardMessage("Local scores on this device.");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    refreshLeaderboard();
  }, [open, refreshLeaderboard]);

  const submitScore = useCallback(async (event) => {
    event?.preventDefault?.();
    if (submittingScore || scoreSubmitted) return;

    const scoreToSave = Math.max(0, Math.floor(Number(lastScoreRef.current || lastScore) || 0));
    if (scoreToSave <= 0) {
      setLeaderboardMessage("Score needs to be above 0 before saving.");
      return;
    }

    const name = cleanPlayerName(playerNameInputRef.current?.value || "Alien Cat");
    try {
      window.localStorage.setItem(PLAYER_NAME_KEY, name);
    } catch {
      // Ignore storage errors. The name still submits for this request.
    }

    const entry = {
      name,
      score: scoreToSave,
      deviceId: getDeviceId(),
    };

    setSubmittingScore(true);
    setLeaderboardMessage("Saving score...");

    try {
      const response = await fetch(LEADERBOARD_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });

      if (!response.ok) throw new Error("Global scoreboard is not configured yet.");

      const data = await response.json();
      const entries = normalizeLeaderboardEntries(data?.scores);
      setLeaderboard(entries);
      setLeaderboardMode(data?.mode === "global" ? "global" : "local");
      setLeaderboardMessage(data?.mode === "global" ? "Score saved for everyone." : "Score saved on this device.");
      setScoreSubmitted(true);
      setScoreboardOpen(true);
    } catch {
      const localEntry = {
        ...entry,
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
      };
      setLeaderboard(saveLocalScore(localEntry));
      setLeaderboardMode("local");
      setLeaderboardMessage("Score saved locally.");
      setScoreSubmitted(true);
      setScoreboardOpen(true);
    } finally {
      setSubmittingScore(false);
    }
  }, [lastScore, refreshLeaderboard, scoreSubmitted, submittingScore]);

  const sortedLeaderboard = [...leaderboard].sort(
    (a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt),
  );

  const toggleScoreboard = useCallback(() => {
    setScoreboardOpen((current) => {
      const next = !current;
      if (next) refreshLeaderboard();
      return next;
    });
  }, [refreshLeaderboard]);

  useEffect(() => {
    if (!open || !mountRef.current) return;

    const mount = mountRef.current;
    let raf = 0;
    let dead = false;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xfff6ff, 10, 42);

    const camera = new THREE.PerspectiveCamera(58, 1, 0.01, 100);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RUNNER_RENDER_PIXEL_RATIO));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c4ff, 2.8));

    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(4, 8, 6);
    sun.castShadow = true;
    scene.add(sun);

    const colors = {
      pink: "#ffb7dc",
      hotPink: "#ff8fc9",
      blue: "#aedbff",
      purple: "#8269c7",
      yellow: "#fff0a3",
      white: "#ffffff",
      ink: "#4b2864",
    };


    const runnerX = -1.15;
    const runner = new THREE.Group();
    runner.position.set(runnerX, 0, 0);
    scene.add(runner);

    let visual = null;
    let runnerTexture = null;

    const setStatus = (text) => {
      if (statusRef.current) statusRef.current.textContent = text;
    };

    function setVisual(object) {
      if (visual) runner.remove(visual);
      visual = object;
      runner.add(visual);
    }

    // Render the PNG within the existing Three.js runner group.
    // The runner group still handles jump movement, bounce, and knockdown.
    setStatus("Loading alien cat PNG...");
    if (imagePath) {
      new THREE.TextureLoader().load(
        imagePath,
        (texture) => {
          if (dead) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;
          runnerTexture = texture;

          const image = texture.image;
          const aspect = (image?.naturalWidth || image?.width || 1) /
            (image?.naturalHeight || image?.height || 1);
          const height = 2.15;
          const width = height * aspect;

          const cat = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              alphaTest: 0.025,
              depthWrite: false,
              depthTest: true,
              side: THREE.DoubleSide,
              toneMapped: false,
            }),
          );
          cat.name = "AlienCatRunnerPNG";
          cat.position.y = height * 0.5;
          cat.quaternion.copy(camera.quaternion);
          setVisual(cat);
          if (gemAssetsReady) setStatus("");
        },
        undefined,
        () => {
          if (!dead) setStatus("Could not load alien-cat-game.png.");
        },
      );
    }

/* ==========================================
   SINGLE SMOOTH BLUE ROAD - NO SEAMS
   ========================================== */

const ROAD_LENGTH = 80;     // long enough to cover the whole view
const ROAD_WIDTH = 5.4;
const ROAD_CORE_WIDTH = 4.8;
const ROAD_Y = -0.13;
const ROAD_THICKNESS = 0.22;
const ROAD_ROUNDNESS = 0.10;

function createRoadEdgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0.00, "rgba(174,219,255,0)");
  gradient.addColorStop(0.08, "rgba(174,219,255,0.20)");
  gradient.addColorStop(0.18, "rgba(174,219,255,0.85)");
  gradient.addColorStop(0.28, "rgba(174,219,255,1)");
  gradient.addColorStop(0.72, "rgba(174,219,255,1)");
  gradient.addColorStop(0.82, "rgba(174,219,255,0.85)");
  gradient.addColorStop(0.92, "rgba(174,219,255,0.20)");
  gradient.addColorStop(1.00, "rgba(174,219,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

const groundCoreMaterial = new THREE.MeshStandardMaterial({
  color: colors.blue,
  roughness: 0.64,
  metalness: 0.02,
  depthWrite: false
});

const groundCoreGeometry = new RoundedBoxGeometry(
  ROAD_LENGTH,
  ROAD_THICKNESS,
  ROAD_CORE_WIDTH,
  3,
  ROAD_ROUNDNESS
);

const groundEdgeTexture = createRoadEdgeTexture();

const groundEdgeMaterial = new THREE.MeshBasicMaterial({
  map: groundEdgeTexture,
  color: 0xffffff,
  transparent: true,
  opacity: 1,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false
});

const groundEdgeGeometry = new THREE.PlaneGeometry(
  ROAD_LENGTH,
  ROAD_WIDTH
);

const groundGroup = new THREE.Group();
scene.add(groundGroup);

const roadCore = new THREE.Mesh(groundCoreGeometry, groundCoreMaterial);
roadCore.position.set(0, ROAD_Y, 0);
roadCore.receiveShadow = true;
groundGroup.add(roadCore);

const roadEdges = new THREE.Mesh(groundEdgeGeometry, groundEdgeMaterial);
roadEdges.rotation.x = -Math.PI / 2;
roadEdges.position.set(0, ROAD_Y + ROAD_THICKNESS / 2 + 0.005, 0);
roadEdges.renderOrder = -10;
groundGroup.add(roadEdges);


const stripeMat = new THREE.MeshStandardMaterial({
  color: colors.pink,
  roughness: 0.52
});

const stripes = [];
for (let i = 0; i < RUNNER_STRIPE_COUNT; i++) {
  const stripe = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.78, 6, 12),
    stripeMat
  );

  stripe.rotation.z = Math.PI / 2; // make it horizontal
  stripe.scale.z = 0.45;           // flatten depth a bit
  stripe.position.set(i * 2.2 - 12, 0.025, 2.12);

  scene.add(stripe);
  stripes.push(stripe);
}

    const obstacles = [];
    const obstacleScreenBounds = new THREE.Box3();
    const obstacleScreenCorner = new THREE.Vector3();
    const obstacleGroup = new THREE.Group();
    scene.add(obstacleGroup);

    // Load each PNG once and reuse its GPU texture for every appearance.
    // Sprites automatically face the camera and preserve transparent edges.
    const gemLoader = new THREE.TextureLoader();
    let gemTextures = [];
    let gemAssetsReady = false;
    let lastGemUrl = null;

    function makeObstacle() {
      if (!gemTextures.length) return null;

      // Uniform selection across all 19 images, without an immediate repeat.
      const candidates = gemTextures.length > 1
        ? gemTextures.filter((entry) => entry.url !== lastGemUrl)
        : gemTextures;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      lastGemUrl = chosen.url;

      const group = new THREE.Group();
      const height = THREE.MathUtils.randFloat(0.85, 1.22);
      const width = height * chosen.aspect;
      const material = new THREE.SpriteMaterial({
        map: chosen.texture,
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.04,
        depthTest: true,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.name = `RunnerGem_${chosen.url.split('/').pop()}`;
      sprite.scale.set(width, height, 1);
      sprite.position.y = height * 0.5;
      group.add(sprite);

      // Keep gameplay hitboxes aligned to the visible (rounded) gem artwork.
      group.userData.width = width * 0.78;
      group.userData.height = height * 0.85;
      group.userData.centerY = height * 0.5;
      group.userData.sprite = sprite;
      group.userData.wobblePhase = Math.random() * Math.PI * 2;
      return group;
    }

    function disposeObstacle(obstacle) {
      obstacleGroup.remove(obstacle);
      obstacle.userData.sprite?.material?.dispose();
    }

    function spawnObstacle(x = 5.2) {
      const obstacle = makeObstacle();
      if (!obstacle) return;
      obstacle.position.set(x, 0, THREE.MathUtils.randFloat(-0.18, 0.18));
      obstacleGroup.add(obstacle);
      obstacles.push(obstacle);
    }

    // Start gameplay only when the PNGs are ready: no blank or white rectangles.
    Promise.allSettled(
      GEM_OBSTACLE_IMAGE_URLS.map(async (url) => {
        const texture = await gemLoader.loadAsync(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        const image = texture.image;
        const width = image?.naturalWidth || image?.width || 1;
        const height = image?.naturalHeight || image?.height || 1;
        return { url, texture, aspect: width / height };
      }),
    ).then((results) => {
      const loaded = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      if (dead) {
        loaded.forEach(({ texture }) => texture.dispose());
        return;
      }
      gemTextures = loaded;
      const missingCount = results.length - loaded.length;
      if (missingCount) {
        console.warn(`${missingCount} runner gem PNG(s) could not load.`, results);
      }
      if (!gemTextures.length) {
        setStatus('Could not load the obstacle PNGs from /images/.');
        return;
      }
      gemAssetsReady = true;
      setStatus('');
      restart();
    });

    // SKY DECORATIONS: randomly ordered clouds with no visual collisions.
    // The position interval of each sprite is disjoint on the X axis.
    // All clouds move at identical speed, so intervals cannot overtake.
    const sparkles = [];
    const skyTextures = [];
    const skyPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -SKY_CLOUD_Z);
    const skyRaycaster = new THREE.Raycaster();
    const skyPoint = new THREE.Vector3();
    const skyProjected = new THREE.Vector3();
    const skyRight = new THREE.Vector3();
    const skyNdcPoint = new THREE.Vector2();
    let skyDeck = [];
    let skyDeckCursor = 0;

    function worldXAtScreenEdge(ndcX) {
      camera.updateMatrixWorld();
      skyNdcPoint.set(ndcX, 0);
      skyRaycaster.setFromCamera(skyNdcPoint, camera);
      if (!skyRaycaster.ray.intersectPlane(skyPlane, skyPoint)) {
        return ndcX * 8;
      }
      return skyPoint.x;
    }

    function shuffleSkyDeck() {
      skyDeck = skyTextures.slice();
      for (let i = skyDeck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [skyDeck[i], skyDeck[j]] = [skyDeck[j], skyDeck[i]];
      }
      skyDeckCursor = 0;
    }

    function nextSkyImage() {
      if (!skyDeck.length || skyDeckCursor >= skyDeck.length) {
        shuffleSkyDeck();
      }
      return skyDeck[skyDeckCursor++];
    }

    function setSkyCloudImage(sprite, entry) {
      const height = THREE.MathUtils.randFloat(SKY_CLOUD_HEIGHT_MIN, SKY_CLOUD_HEIGHT_MAX);
      const width = height * entry.aspect;
      sprite.material.map = entry.texture;
      sprite.material.needsUpdate = true;
      sprite.scale.set(width, height, 1);
      sprite.userData.width = width;
      sprite.userData.height = height;
    }

    function respawnSkyCloud(sprite) {
      setSkyCloudImage(sprite, nextSkyImage());
      // Spawn outside the RIGHT edge or after the rightmost active cloud.
      // This conservative rule guarantees none of the cloud rectangles touch,
      // even if clouds occupy different heights or the viewport was resized.
      let nextLeft = worldXAtScreenEdge(1) + SKY_CLOUD_GAP;
      for (const other of sparkles) {
        if (other === sprite) continue;
        nextLeft = Math.max(
          nextLeft,
          other.position.x + other.userData.width / 2 + SKY_CLOUD_GAP,
        );
      }
      sprite.position.set(
        nextLeft + sprite.userData.width / 2,
        THREE.MathUtils.randFloat(2.55, 4.55),
        SKY_CLOUD_Z,
      );
    }

    function skyCloudIsPastLeftEdge(sprite) {
      // PNG sprite is camera-facing, so use its right edge in screen space.
      skyRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      skyProjected.copy(sprite.position)
        .addScaledVector(skyRight, sprite.userData.width / 2)
        .project(camera);
      return skyProjected.x < -1.07;
    }

    if (SKY_DECORATION_MODE === "png") {
      const loader = new THREE.TextureLoader();
      Promise.allSettled(
        SKY_DECORATION_IMAGE_URLS.map(async (url) => {
          const texture = await loader.loadAsync(url);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          const img = texture.image;
          const width = img?.naturalWidth || img?.width || 1;
          const height = img?.naturalHeight || img?.height || 1;
          return { texture, aspect: width / height, url };
        }),
      ).then((results) => {
        const loaded = results
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value);
        if (dead) {
          loaded.forEach((entry) => entry.texture.dispose());
          return;
        }
        if (loaded.length !== SKY_DECORATION_IMAGE_URLS.length) {
          console.warn("Some cloud images could not load:", results);
        }
        skyTextures.push(...loaded);
        if (!skyTextures.length) return;

        // Place clouds in a spaced procession, starting near the left edge.
        // Subsequent loops reuse every image in a new randomized order.
        let rightmost = worldXAtScreenEdge(-1) - 0.2;
        for (let i = 0; i < RUNNER_SPARKLE_COUNT; i += 1) {
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            transparent: true,
            color: 0xffffff,
            depthWrite: false,
            depthTest: true,
            toneMapped: false,
            fog: false,
          }));
          setSkyCloudImage(sprite, nextSkyImage());
          sprite.position.set(
            rightmost + SKY_CLOUD_GAP + sprite.userData.width / 2,
            THREE.MathUtils.randFloat(2.55, 4.55),
            SKY_CLOUD_Z,
          );
          rightmost = sprite.position.x + sprite.userData.width / 2;
          sprite.name = "DecorativeSkyCloud";
          scene.add(sprite);
          sparkles.push(sprite);
        }
      });
    } else {
      const sparkleMat = new THREE.MeshStandardMaterial({
        color: "#ffffff", emissive: colors.pink, emissiveIntensity: 0.62,
      });
      for (let i = 0; i < RUNNER_SPARKLE_COUNT; i += 1) {
        const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), sparkleMat);
        sparkle.position.set(
          THREE.MathUtils.randFloat(-5.5, 8),
          THREE.MathUtils.randFloat(2.1, 5.5),
          THREE.MathUtils.randFloat(-2.4, 1.3),
        );
        sparkle.userData.speed = THREE.MathUtils.randFloat(0.7, 1.8);
        scene.add(sparkle);
        sparkles.push(sparkle);
      }
    }

    let velocityY = 0;
    let grounded = true;
    let running = false; // Wait for the PNG obstacle textures before starting.
    let speed = 4.3;
    let score = 0;
    let best = Number(localStorage.getItem("cosmicRunnerBest") || 0);
    let elapsed = 0;
    let nextSpawn = 1.1;
    let last = performance.now();

    const playerBox = new THREE.Box3();
    const obstacleBox = new THREE.Box3();

    function startGameMusic() {
      if (dead || !running) return;
      requestRunnerMusic("play");
    }

    function stopGameMusic(reset = false) {
      requestRunnerMusic("stop", { reset });
    }

    function text() {
      if (scoreRef.current) scoreRef.current.textContent = String(score);
      if (bestRef.current) bestRef.current.textContent = String(best);
    }

    function restart() {
      if (!gemAssetsReady) return;
      running = true;
      speed = 4.3;
      score = 0;
      elapsed = 0;
      nextSpawn = 1.1;
      velocityY = 0;
      grounded = true;
      runner.position.set(runnerX, 0, 0);
      runner.rotation.set(0, 0, 0);
      runner.scale.set(1, 1, 1);
      lastScoreRef.current = 0;
      setLastScore(0);
      setScoreSubmitted(false);
      overRef.current?.classList.remove("show");
      for (const obstacle of obstacles) disposeObstacle(obstacle);
      obstacles.length = 0;
      spawnObstacle(5.4);
      text();
      startGameMusic();
    }

    function endGame() {
      if (!running) return;
      running = false;
      stopGameMusic();
      requestRunnerSound(RUNNER_GAME_OVER_SOUND_URL);
      lastScoreRef.current = score;
      setLastScore(score);
      setScoreSubmitted(false);
      overRef.current?.classList.add("show");
      requestAnimationFrame(() => {
        if (playerNameInputRef.current) {
          try {
            playerNameInputRef.current.value = window.localStorage.getItem(PLAYER_NAME_KEY) || "";
          } catch {
            playerNameInputRef.current.value = "";
          }
        }
      });
      refreshLeaderboard();
      if (score > best) {
        best = score;
        localStorage.setItem("cosmicRunnerBest", String(best));
        text();
      }
    }

    function jump() {
      if (!gemAssetsReady) return;
      if (!running) {
        restart();
        return;
      }
      if (!grounded) return;
      requestRunnerSound(RUNNER_JUMP_SOUND_URL);
      startGameMusic();
      velocityY = 0.26;
      grounded = false;
    }

    function hit(obstacle) {
      playerBox.setFromCenterAndSize(
        new THREE.Vector3(runner.position.x, runner.position.y + 0.92, runner.position.z),
        new THREE.Vector3(0.72, 1.55, 0.82)
      );
      obstacleBox.setFromCenterAndSize(
        new THREE.Vector3(obstacle.position.x, obstacle.position.y + obstacle.userData.centerY, obstacle.position.z),
        new THREE.Vector3(obstacle.userData.width, obstacle.userData.height, 0.76)
      );
      return playerBox.intersectsBox(obstacleBox);
    }

    function resize() {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      camera.position.set(0, h >= w ? 2.95 : 2.65, h >= w ? 6.65 : 6.2);
      camera.lookAt(-0.35, 1.12, 0);
      // Keep the side-view PNG facing the viewer at every screen size.
      if (visual) visual.quaternion.copy(camera.quaternion);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RUNNER_RENDER_PIXEL_RATIO));
      renderer.setSize(w, h);
    }

    function animate(now) {
      if (dead) return;
      raf = requestAnimationFrame(animate);
      const delta = Math.min(0.033, (now - last) / 1000);
      last = now;


      // Clouds all travel at the same speed, so one can never catch another.
      if (SKY_DECORATION_MODE === "png") {
        camera.updateMatrixWorld();
        for (const cloud of sparkles) {
          cloud.position.x -= SKY_CLOUD_SPEED * delta;
          if (skyCloudIsPastLeftEdge(cloud)) {
            respawnSkyCloud(cloud);
          }
        }
      } else {
        for (const sparkle of sparkles) {
          sparkle.position.x -= sparkle.userData.speed * delta;
          sparkle.rotation.x += 2 * delta;
          sparkle.rotation.y += 1.5 * delta;
          if (sparkle.position.x < -5.8) {
            sparkle.position.x = THREE.MathUtils.randFloat(5.8, 8.8);
          }
        }
      }

      if (running) {
        elapsed += delta;
        speed += delta * 0.11;
        score = Math.floor(elapsed * RUNNER_SCORE_MULTIPLIER);
        text();

        velocityY -= 0.62 * delta;
        runner.position.y += velocityY;
        if (runner.position.y <= 0) {
          runner.position.y = 0;
          velocityY = 0;
          grounded = true;
        }

        const bounce = Math.sin(now * 0.018) * 0.025;
        runner.scale.set(1 + bounce, 1 - bounce * 0.7, 1 + bounce);
        runner.rotation.z = grounded ? Math.sin(now * 0.014) * 0.035 : -0.18;

        for (const stripe of stripes) {
          stripe.position.x -= speed * delta;
          if (stripe.position.x < -12) stripe.position.x += 39.6;
        }

        nextSpawn -= delta;
        if (nextSpawn <= 0) {
          spawnObstacle(5.6);
          nextSpawn = THREE.MathUtils.randFloat(0.72, 1.2) * Math.max(0.6, 6.5 / speed);
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obstacle = obstacles[i];
          obstacle.position.x -= speed * delta;
          // A tiny, playful rocking motion without turning the flat sprite edge-on.
          const gemSprite = obstacle.userData.sprite;
          if (gemSprite) {
            gemSprite.material.rotation = Math.sin(now * 0.0025 + obstacle.userData.wobblePhase) * 0.09;
          }
          if (hit(obstacle)) endGame();

/* Remove gem ONLY after fully leaving the left viewport */
camera.updateMatrixWorld();

obstacleScreenBounds.setFromObject(obstacle);

let rightmostScreenX = -Infinity;

for (let corner = 0; corner < 8; corner++) {
  obstacleScreenCorner.set(
    (corner & 1)
      ? obstacleScreenBounds.max.x
      : obstacleScreenBounds.min.x,
    (corner & 2)
      ? obstacleScreenBounds.max.y
      : obstacleScreenBounds.min.y,
    (corner & 4)
      ? obstacleScreenBounds.max.z
      : obstacleScreenBounds.min.z
  );

  obstacleScreenCorner.project(camera);

  rightmostScreenX = Math.max(
    rightmostScreenX,
    obstacleScreenCorner.x
  );
}

// -1 = left edge of the visible screen
// -1.05 = extra 5% offscreen margin
if (rightmostScreenX < -1.05) {
  disposeObstacle(obstacle);
  obstacles.splice(i, 1);
}

        }
      } else if (gemAssetsReady) {
        runner.rotation.z = Math.PI / 2;
        runner.position.y = 0.4;
      }

      renderer.render(scene, camera);
    }

    function onKey(event) {
      const target = event.target;
      if (target?.closest?.("input, textarea, select, button, a")) return;

      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        jump();
      }
    }

    function onPointer(event) {
      if (event.target.closest("button, input, textarea, select, a, form")) return;
      jump();
    }

    setStatus('Loading gem obstacles...');
    resize();
    text();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKey);
    mount.addEventListener("pointerdown", onPointer);
    raf = requestAnimationFrame(animate);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      mount.removeEventListener("pointerdown", onPointer);
      stopGameMusic(true);
      for (const obstacle of obstacles) disposeObstacle(obstacle);
      gemTextures.forEach(({ texture }) => texture.dispose());
      if (visual) {
        visual.geometry?.dispose();
        visual.material?.dispose();
      }
      runnerTexture?.dispose();
      // Dispose decorative assets when leaving the runner.
      for (const sparkle of sparkles) {
        scene.remove(sparkle);
        if (sparkle.isSprite) {
          sparkle.material?.dispose();
        } else {
          sparkle.geometry?.dispose();
        }
      }
      if (SKY_DECORATION_MODE !== "png" && sparkles[0]?.material) {
        sparkles[0].material.dispose();
      }
      skyTextures.forEach(({ texture }) => texture.dispose());
      groundCoreGeometry.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [open, imagePath, refreshLeaderboard]);

  return (
    <>

      {open && (
        <div className="cosmicRunnerOverlay">
          <div ref={mountRef} className="cosmicRunnerCanvas" />
          <div ref={statusRef} className="cosmicRunnerGlass cosmicRunnerStatus" role="status" aria-live="polite" />

          <div className="cosmicRunnerHud">
            <div className="cosmicRunnerGlass cosmicRunnerScore">
              <span>Score: <b ref={scoreRef}>0</b></span>
              <span>Best: <b ref={bestRef}>0</b></span>
            </div>
            <button
              type="button"
              className="cosmicRunnerTrophyButton"
              data-button-sound="/sounds/intro-enter.mp3"
              aria-label="Show scoreboard"
              aria-expanded={scoreboardOpen}
              onClick={toggleScoreboard}
            >
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    role="img"
    aria-hidden="true"
    className="buttonIcon"
  >
    <g
      fill="none"
      stroke="#000000"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.05 3.35h9.9a1.55 1.55 0 0 1 1.55 1.55v1.8h2.55a1.25 1.25 0 0 1 1.25 1.25v2.45a4.65 4.65 0 0 1-4.65 4.65h-.7" />
      <path d="M7.05 3.35A1.55 1.55 0 0 0 5.5 4.9v1.8H2.95A1.25 1.25 0 0 0 1.7 7.95v2.45a4.65 4.65 0 0 0 4.65 4.65h.7" />
      <path d="M5.5 6.7v4.35c0 4.25 2.95 7.25 6.5 7.25s6.5-3 6.5-7.25V6.7" />
      <path d="M10.25 18.15c-.12 1.08-.82 2.05-1.85 2.7h7.2c-1.03-.65-1.73-1.62-1.85-2.7" />
      <path d="M5.7 22.05h12.6" />
      <path d="M12 7.1l1.08 2.18 2.4.35-1.74 1.69.41 2.39L12 12.58l-2.15 1.13.41-2.39-1.74-1.69 2.4-.35L12 7.1Z" />
    </g>
  </svg>

            </button>
            <button type="button" data-button-sound="" onClick={() => onClose?.()}>×</button>
          </div>

          {scoreboardOpen && (
            <button
              type="button"
              className="cosmicRunnerScoreboardBackdrop"
              data-button-sound=""
              aria-label="Close scoreboard"
              onClick={() => setScoreboardOpen(false)}
            />
          )}

          {scoreboardOpen && (
            <aside className="cosmicRunnerGlass cosmicRunnerLeaderboard" aria-live="polite">
              <div className="cosmicRunnerLeaderboardTop">
                <div>
                  <h3>Scoreboard</h3>
                  <span>{leaderboardMode === "global" ? "Everyone" : "This device"}</span>
                </div>
                <button
                  type="button"
                  data-button-sound=""
                  aria-label="Close scoreboard"
                  onClick={() => setScoreboardOpen(false)}
                >
                  ×
                </button>
              </div>
              {sortedLeaderboard.length > 0 ? (
                <ol>
                  {sortedLeaderboard.map((entry, index) => (
                    <li key={entry.id || `${entry.name}-${entry.score}-${index}`}>
                      <span>{index + 1}. {entry.name}</span>
                      <b>{entry.score}</b>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="cosmicRunnerLeaderboardEmpty">No scores yet.</p>
              )}
              <p className="cosmicRunnerLeaderboardStatus">{leaderboardMessage}</p>
            </aside>
          )}

          <div className="cosmicRunnerGlass cosmicRunnerHint">Tap to jump.</div>

          <div ref={overRef} className="cosmicRunnerGlass cosmicRunnerGameOver">
            <h2>Try again!</h2>
            <p>The alien cat crashed into a gem.</p>
            <p className="cosmicRunnerFinalScore">Score: <b>{lastScore}</b></p>
            <form className="cosmicRunnerScoreForm" onSubmit={submitScore}>
              <label htmlFor="cosmicRunnerPlayerName">Name for scoreboard</label>
              <input
                ref={playerNameInputRef}
                id="cosmicRunnerPlayerName"
                name="playerName"
                type="text"
                inputMode="text"
                autoComplete="nickname"
                autoFocus={false}
                maxLength={MAX_PLAYER_NAME_LENGTH}
                placeholder="Alien Cat"
                aria-label="Name for scoreboard"
              />
              <button
                type="submit"
                data-button-sound="/sounds/intro-enter.mp3"
                disabled={submittingScore || scoreSubmitted}
              >
                {scoreSubmitted ? "Saved" : submittingScore ? "Saving..." : "Save score"}
              </button>
            </form>
            <p className="cosmicRunnerSubmitStatus">{leaderboardMessage}</p>
            <button type="button" data-button-sound="/sounds/intro-enter.mp3" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }))}>
              Play again
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .cosmicRunnerOverlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          overflow: hidden;
          background: radial-gradient(circle at 18% 18%, rgba(255, 175, 237, 0.9), transparent 32%), radial-gradient(circle at 82% 12%, rgba(160, 225, 255, 0.9), transparent 34%), radial-gradient(circle at 50% 100%, rgba(206, 177, 255, 0.75), transparent 42%), linear-gradient(180deg, #fff8ff 0%, #f4fbff 52%, #fff0fb 100%);
        }
        .cosmicRunnerCanvas { position: absolute; inset: 0; contain: strict; }
        .cosmicRunnerHud {
          position: fixed;
          top: max(14px, env(safe-area-inset-top));
          left: 50%;
          transform: translateX(-50%);
          width: min(94vw, 560px);
          z-index: 2;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: center;
        }
        .cosmicRunnerGlass {
          border: 1px solid rgba(255, 255, 255, 0.76);
          background: rgba(255, 255, 255, 0.42);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border-radius: 22px;
          box-shadow: 0 14px 46px rgba(168, 100, 220, 0.18);
          color: #75468f;
        }
        .cosmicRunnerScore {
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 900;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .cosmicRunnerHud button,
        .cosmicRunnerGameOver button {
          border: 0;
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 900;
          color: #714184;
          background: linear-gradient(135deg, #ffd2f5, #ccefff);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
          cursor: pointer;
          white-space: nowrap;
        }
        .cosmicRunnerStatus:empty { display: none; }
        .cosmicRunnerStatus {
          position: fixed;
          left: 50%;
          top: 76px;
          transform: translateX(-50%);
          z-index: 2;
          width: min(92vw, 560px);
          padding: 10px 14px;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
        }
        .cosmicRunnerTrophyButton {
          min-width: 44px;
          font-size: 17px !important;
          line-height: 1;
        }
.cosmicRunnerScoreboardBackdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  border: 0;
  padding: 0;
  background: rgba(255, 248, 255, 0.86);
  backdrop-filter: blur(8px) saturate(0.72) brightness(1.08);
  -webkit-backdrop-filter: blur(8px) saturate(0.72) brightness(1.08);
}
        .cosmicRunnerLeaderboard {
          position: fixed;
          top: calc(max(14px, env(safe-area-inset-top)) + 62px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 51;
          width: min(94vw, 560px);
          max-height: min(62vh, 520px);
          padding: 13px 14px 14px;
          pointer-events: auto;
          display: flex;
          flex-direction: column;
        }
        .cosmicRunnerLeaderboardTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
          flex: 0 0 auto;
        }
        .cosmicRunnerLeaderboardTop > div {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .cosmicRunnerLeaderboardTop button {
          border: 0;
          border-radius: 999px;
          width: 34px;
          height: 34px;
          padding: 0;
          color: #714184;
          background: linear-gradient(135deg, #ffd2f5, #ccefff);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }
        .cosmicRunnerLeaderboard h3 {
          margin: 0;
          color: #703b8f;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .cosmicRunnerLeaderboardTop span {
          border-radius: 999px;
          padding: 5px 8px;
          background: rgba(255, 255, 255, 0.5);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .cosmicRunnerLeaderboard ol {
          display: grid;
          gap: 4px;
          margin: 0;
          padding: 0 4px 0 0;
          list-style: none;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          flex: 1 1 auto;
          min-height: 0;
          overscroll-behavior: contain;
        }
        .cosmicRunnerLeaderboard ol::-webkit-scrollbar {
          width: 8px;
        }
        .cosmicRunnerLeaderboard ol::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(168, 100, 220, 0.28);
        }
        .cosmicRunnerLeaderboard li {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border-radius: 12px;
          padding: 5px 8px;
          background: rgba(255, 255, 255, 0.34);
          font-size: 11px;
          font-weight: 900;
        }
        .cosmicRunnerLeaderboard li span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cosmicRunnerLeaderboardEmpty,
        .cosmicRunnerLeaderboardStatus {
          margin: 4px 0 0;
          font-size: 10px;
          font-weight: 800;
          opacity: 0.82;
        }
        .cosmicRunnerHint {
          position: fixed;
          left: 50%;
          bottom: calc(max(16px, env(safe-area-inset-bottom)) + 18px);
          transform: translateX(-50%);
          z-index: 2;
          width: min(92vw, 560px);
          padding: 13px 16px;
          text-align: center;
          font-size: 14px;
          font-weight: 800;
        }
        .cosmicRunnerGameOver {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 3;
          display: none;
          width: min(86vw, 420px);
          padding: 24px;
          text-align: center;
        }
        .cosmicRunnerGameOver.show { display: block; }
        .cosmicRunnerGameOver h2 {
          margin: 0 0 8px;
          color: #703b8f;
          font-size: 34px;
        }
        .cosmicRunnerGameOver p {
          margin: 0 0 14px;
          font-weight: 800;
        }
        .cosmicRunnerFinalScore {
          border-radius: 16px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.42);
          color: #703b8f;
        }
        .cosmicRunnerScoreForm {
          display: grid;
          gap: 9px;
          margin: 14px 0;
        }
        .cosmicRunnerScoreForm label {
          color: #75468f;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .cosmicRunnerScoreForm input {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 999px;
          padding: 13px 15px;
          color: #703b8f;
          background: rgba(255, 255, 255, 0.62);
          box-shadow: inset 0 0 0 1px rgba(206, 177, 255, 0.22);
          font-size: 16px;
          font-weight: 900;
          text-align: center;
          outline: none;
        }
        .cosmicRunnerScoreForm input:focus {
          border-color: rgba(255, 143, 201, 0.9);
          box-shadow: 0 0 0 4px rgba(255, 143, 201, 0.2);
        }
        .cosmicRunnerScoreForm button:disabled {
          cursor: default;
          opacity: 0.62;
        }
        .cosmicRunnerSubmitStatus {
          font-size: 11px;
          opacity: 0.86;
        }
        @media (max-height: 720px) {
          .cosmicRunnerLeaderboard {
            top: calc(max(14px, env(safe-area-inset-top)) + 58px);
            bottom: auto;
            max-height: 46vh;
          }
          .cosmicRunnerHint { display: none; }
        }
      `}</style>
    </>
  );
}
