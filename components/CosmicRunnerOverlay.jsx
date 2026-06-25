"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const SITE_SOUND_EVENT_NAME = "galaxy-cat:play-sound";
const SITE_MUSIC_EVENT_NAME = "galaxy-cat:music";
const RUNNER_JUMP_SOUND_URL = "/sounds/runner-jump.mp3";
const RUNNER_GAME_OVER_SOUND_URL = "/sounds/runner-game-over.mp3";
const RUNNER_GAME_MUSIC_URL = "/sounds/runner-game-music.mp3";
const RUNNER_GAME_MUSIC_VOLUME = 0.38;

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
  modelPath = "/models/alien-cat.glb",
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
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
    let mixer = null;
    const mixerClock = new THREE.Clock();

    const setStatus = (text) => {
      if (statusRef.current) statusRef.current.textContent = text;
    };

    function setVisual(object) {
      if (visual) runner.remove(visual);
      visual = object;
      runner.add(visual);
    }

    function fitGLB(object) {
      const wrap = new THREE.Group();
      wrap.add(object);
      object.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      object.position.sub(center);

      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      const targetHeight = 2.15;
      wrap.scale.setScalar(targetHeight / maxAxis);
      wrap.position.y = targetHeight * 0.5;
      wrap.rotation.y = Math.PI / 2;

      wrap.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });

      return wrap;
    }

    setStatus("Loading alien cat GLB...");

    if (modelPath) {
      new GLTFLoader().load(
        modelPath,
        (gltf) => {
          if (dead) return;
          setVisual(fitGLB(gltf.scene));
          if (gltf.animations?.length) {
            mixer = new THREE.AnimationMixer(gltf.scene);
            mixer.clipAction(gltf.animations[0]).play();
            setStatus("Alien cat loaded with animation.");
          } else {
            setStatus("");
          }
        },
        undefined,
        () => setStatus("Could not load alien-cat.glb.")
      );
    }

    const groundGroup = new THREE.Group();
    scene.add(groundGroup);
    const groundMat = new THREE.MeshStandardMaterial({ color: colors.blue, roughness: 0.64 });
    for (let i = 0; i < 3; i++) {
      const ground = new THREE.Mesh(new THREE.BoxGeometry(22, 0.22, 5.4), groundMat);
      ground.position.set(i * 22 - 22, -0.13, 0);
      ground.receiveShadow = true;
      groundGroup.add(ground);
    }

    const stripeMat = new THREE.MeshStandardMaterial({ color: colors.pink, roughness: 0.52 });
    const stripes = [];
    for (let i = 0; i < 18; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.045, 0.12), stripeMat);
      stripe.position.set(i * 2.2 - 12, 0.025, 2.12);
      scene.add(stripe);
      stripes.push(stripe);
    }

    const obstacles = [];
    const obstacleGroup = new THREE.Group();
    scene.add(obstacleGroup);

    function makeObstacle() {
      const group = new THREE.Group();
      const h = THREE.MathUtils.randFloat(0.68, 1.22);
      const w = THREE.MathUtils.randFloat(0.28, 0.48);
      const palette = [colors.hotPink, colors.purple, colors.blue, colors.yellow];
      const mat = new THREE.MeshStandardMaterial({
        color: palette[Math.floor(Math.random() * palette.length)],
        roughness: 0.31,
        metalness: 0.08,
      });
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5), mat);
      crystal.position.y = h / 2;
      crystal.rotation.y = Math.random() * Math.PI;
      crystal.castShadow = true;
      group.add(crystal);
      group.userData.width = w * 1.1;
      group.userData.height = h;
      group.userData.spin = THREE.MathUtils.randFloat(-2, 2);
      return group;
    }

    function spawnObstacle(x = 5.2) {
      const obstacle = makeObstacle();
      obstacle.position.set(x, 0, THREE.MathUtils.randFloat(-0.18, 0.18));
      obstacleGroup.add(obstacle);
      obstacles.push(obstacle);
    }

    const sparkles = [];
    const sparkleMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: colors.pink, emissiveIntensity: 0.62 });
    for (let i = 0; i < 26; i++) {
      const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), sparkleMat);
      sparkle.position.set(
        THREE.MathUtils.randFloat(-5.5, 8),
        THREE.MathUtils.randFloat(2.1, 5.5),
        THREE.MathUtils.randFloat(-2.4, 1.3)
      );
      sparkle.userData.speed = THREE.MathUtils.randFloat(0.7, 1.8);
      scene.add(sparkle);
      sparkles.push(sparkle);
    }

    let velocityY = 0;
    let grounded = true;
    let running = true;
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
      for (const obstacle of obstacles) obstacleGroup.remove(obstacle);
      obstacles.length = 0;
      spawnObstacle(4.8);
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
          playerNameInputRef.current.focus({ preventScroll: true });
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
        new THREE.Vector3(obstacle.position.x, obstacle.position.y + obstacle.userData.height / 2, obstacle.position.z),
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
      renderer.setSize(w, h);
    }

    function animate(now) {
      if (dead) return;
      raf = requestAnimationFrame(animate);
      const delta = Math.min(0.033, (now - last) / 1000);
      last = now;

      if (mixer) mixer.update(mixerClock.getDelta());


      for (const sparkle of sparkles) {
        sparkle.position.x -= sparkle.userData.speed * delta;
        sparkle.rotation.x += 2 * delta;
        sparkle.rotation.y += 1.5 * delta;
        if (sparkle.position.x < -5.8) sparkle.position.x = THREE.MathUtils.randFloat(5.8, 8.8);
      }

      if (running) {
        elapsed += delta;
        speed += delta * 0.11;
        score = Math.floor(elapsed * 10);
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

        for (const ground of groundGroup.children) {
          ground.position.x -= speed * delta;
          if (ground.position.x < -22) ground.position.x += 66;
        }
        for (const stripe of stripes) {
          stripe.position.x -= speed * delta;
          if (stripe.position.x < -12) stripe.position.x += 39.6;
        }

        nextSpawn -= delta;
        if (nextSpawn <= 0) {
          spawnObstacle(5.2);
          nextSpawn = THREE.MathUtils.randFloat(0.86, 1.48) * Math.max(0.72, 5.0 / speed);
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obstacle = obstacles[i];
          obstacle.position.x -= speed * delta;
          obstacle.rotation.y += obstacle.userData.spin * delta;
          if (hit(obstacle)) endGame();
          if (obstacle.position.x < -4.4) {
            obstacleGroup.remove(obstacle);
            obstacles.splice(i, 1);
          }
        }
      } else {
  runner.rotation.z = Math.PI / 2;
  runner.position.y = 0;
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

    restart();
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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [open, modelPath, refreshLeaderboard]);

  return (
    <>

      {open && (
        <div className="cosmicRunnerOverlay">
          <div ref={mountRef} className="cosmicRunnerCanvas" />

          <div className="cosmicRunnerHud">
            <div className="cosmicRunnerGlass cosmicRunnerScore">
              <span>Score: <b ref={scoreRef}>0</b></span>
              <span>Best: <b ref={bestRef}>0</b></span>
            </div>
            <button
              type="button"
              className="cosmicRunnerTrophyButton"
              data-button-sound="/sounds/runner-scoreboard.mp3"
              aria-label="Show scoreboard"
              aria-expanded={scoreboardOpen}
              onClick={toggleScoreboard}
            >
              🏆
            </button>
            <button type="button" data-button-sound="/sounds/runner-close.mp3" onClick={() => onClose?.()}>×</button>
          </div>

          {scoreboardOpen && (
            <aside className="cosmicRunnerGlass cosmicRunnerLeaderboard" aria-live="polite">
              <div className="cosmicRunnerLeaderboardTop">
                <div>
                  <h3>Scoreboard</h3>
                  <span>{leaderboardMode === "global" ? "Everyone" : "This device"}</span>
                </div>
                <button
                  type="button"
                  data-button-sound="/sounds/runner-close.mp3"
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
            <p>The alien cat crashed into a crystal.</p>
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
                maxLength={MAX_PLAYER_NAME_LENGTH}
                placeholder="Alien Cat"
                aria-label="Name for scoreboard"
              />
              <button
                type="submit"
                data-button-sound="/sounds/runner-save-score.mp3"
                disabled={submittingScore || scoreSubmitted}
              >
                {scoreSubmitted ? "Saved" : submittingScore ? "Saving..." : "Save score"}
              </button>
            </form>
            <p className="cosmicRunnerSubmitStatus">{leaderboardMessage}</p>
            <button type="button" data-button-sound="/sounds/runner-play-again.mp3" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }))}>
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
        .cosmicRunnerCanvas { position: absolute; inset: 0; }
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
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
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
        .cosmicRunnerLeaderboard {
          position: fixed;
          top: calc(max(14px, env(safe-area-inset-top)) + 62px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
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
