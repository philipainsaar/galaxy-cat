"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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
      pink: "#ff75dc",
      hotPink: "#ff3fc9",
      blue: "#6fdfff",
      purple: "#b184ff",
      yellow: "#fff0a3",
      white: "#fff8ff",
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
      overRef.current?.classList.remove("show");
      for (const obstacle of obstacles) obstacleGroup.remove(obstacle);
      obstacles.length = 0;
      spawnObstacle(4.8);
      text();
    }

    function endGame() {
      running = false;
      overRef.current?.classList.add("show");
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
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        jump();
      }
    }

    function onPointer(event) {
      if (event.target.closest("button")) return;
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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [open, modelPath]);

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
            <button type="button" onClick={() => onClose?.()}>Close</button>
          </div>

  
          <div className="cosmicRunnerGlass cosmicRunnerHint">Tap to jump.</div>

          <div ref={overRef} className="cosmicRunnerGlass cosmicRunnerGameOver">
            <h2>Oh no!</h2>
            <p>The alien cat crashed into a crystal.</p>
            <button type="button" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }))}>
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
      `}</style>
    </>
  );
}
