'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const START = new THREE.Vector3(3.2, 0.4, 2.5);
const SEATED_FRONT_OF_BOAT = new THREE.Vector3(0, 0.72, 1.15);
const DRAG_Z = 2.5;
const DROP_R = 2.2;

export default function CosmicVoyage() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const [landedUI, setLandedUI] = useState(false);

  const resetExperience = () => {
    const s = stateRef.current;
    if (!s) return;

    s.landed = false;
    s.isDragging = false;
    s.cur.copy(START);
    s.tgt.copy(START);
    s.catGroup.position.copy(START);
    s.catGroup.rotation.set(0, 0, 0);
    s.burstT = -1;
    s.pMat.opacity = 0;

    setLoading(false);
    setLoadingPercent(0);
    setPopupOpen(false);
    setLandedUI(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03000f);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
    if (height > width) camera.position.set(0, 2.8, 13.5);
    else camera.position.set(0, 2.5, 11);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0x8899cc, 1.6));
    const key = new THREE.PointLight(0xffffff, 2.0, 40);
    key.position.set(3, 8, 8);
    scene.add(key);
    const fill = new THREE.PointLight(0x4466ff, 1.2, 30);
    fill.position.set(-5, 2, 5);
    scene.add(fill);

    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const th = Math.PI * 2 * u;
      const ph = Math.acos(2 * v - 1);
      const r = 60 + Math.random() * 30;
      starPositions[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPositions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      starPositions[i * 3 + 2] = r * Math.cos(ph);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xaaccff,
        size: 0.3,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      })
    );
    scene.add(stars);

    const waveMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 } },
      vertexShader: `uniform float uT; varying float vE; void main(){ vec3 p=position; float e=sin(p.x*1.4+uT*.8)*.12+sin(p.z*1.1+uT*.6)*.09; p.y+=e; vE=e; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `varying float vE; void main(){ float t=clamp((vE+.21)/.42,0.,1.); vec3 c=mix(vec3(0.,.05,.2),vec3(0.,.18,.5),t); gl_FragColor=vec4(c,.75); }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const wave = new THREE.Mesh(new THREE.PlaneGeometry(20, 20, 48, 48), waveMat);
    wave.rotation.x = -Math.PI / 2;
    wave.position.y = -0.75;
    scene.add(wave);

    const waterRing = new THREE.Mesh(
      new THREE.RingGeometry(3.4, 3.55, 96),
      new THREE.MeshBasicMaterial({ color: 0x0055ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
    );
    waterRing.rotation.x = -Math.PI / 2;
    waterRing.position.y = -0.72;
    scene.add(waterRing);

    const boatGroup = new THREE.Group();
    scene.add(boatGroup);

    const addMesh = (geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, group = boatGroup) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      group.add(m);
      return m;
    };

    const mWood = new THREE.MeshLambertMaterial({ color: 0x5a2800, emissive: 0x1a0800, emissiveIntensity: 0.3 });
    const mRim = new THREE.MeshLambertMaterial({ color: 0x00f5ff, emissive: 0x00f5ff, emissiveIntensity: 1.5 });
    const mSail = new THREE.MeshLambertMaterial({ color: 0xaaccee, emissive: 0x003388, emissiveIntensity: 0.5, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
    const mMast = new THREE.MeshLambertMaterial({ color: 0x997722 });
    const mGold = new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 1.2 });
    const mCyan = new THREE.MeshLambertMaterial({ color: 0x00f5ff, emissive: 0x00f5ff, emissiveIntensity: 1.2 });

    addMesh(new THREE.CylinderGeometry(1.3, 0.85, 0.6, 64, 6, true), mWood, 0, -0.16, 0);
    addMesh(new THREE.CircleGeometry(0.85, 64), mWood, 0, -0.46, 0, Math.PI / 2);
    addMesh(new THREE.TorusGeometry(1.3, 0.055, 24, 128), mRim, 0, 0.14, 0);
    addMesh(new THREE.CylinderGeometry(0.03, 0.045, 2.1, 24), mMast, 0, 1.0, 0);
    addMesh(new THREE.PlaneGeometry(0.9, 1.35, 4, 4), mSail, 0.26, 0.62, 0, 0, 0.08, 0);
    addMesh(new THREE.SphereGeometry(0.06, 24, 16), mGold, 0, 2.1, 0);
    addMesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), mCyan, 0, 0.05, 1.05);

    const boatLight = new THREE.PointLight(0x00f5ff, 2.5, 6);
    boatLight.position.set(0, 0.4, 0);
    boatGroup.add(boatLight);

    const dzMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const dzRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.38, 96), dzMat);
    dzRing.rotation.x = -Math.PI / 2;
    dzRing.position.y = 0.15;
    boatGroup.add(dzRing);

    const catGroup = new THREE.Group();
    catGroup.scale.setScalar(1.15);
    catGroup.position.copy(START);
    scene.add(catGroup);

    const cm = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => addMesh(geo, mat, x, y, z, rx, ry, rz, catGroup);

    const mBody = new THREE.MeshLambertMaterial({ color: 0x00cc66, emissive: 0x00ff88, emissiveIntensity: 0.7 });
    const mEarO = new THREE.MeshLambertMaterial({ color: 0x00dd77, emissive: 0x00ff88, emissiveIntensity: 0.6 });
    const mEarI = new THREE.MeshLambertMaterial({ color: 0xff44cc, emissive: 0xff44cc, emissiveIntensity: 0.9, transparent: true, opacity: 0.9 });
    const mEyeW = new THREE.MeshLambertMaterial({ color: 0xeeffff, emissive: 0x88ffee, emissiveIntensity: 0.4 });
    const mPup = new THREE.MeshLambertMaterial({ color: 0x001100 });
    const mIris = new THREE.MeshLambertMaterial({ color: 0x00ffdd, emissive: 0x00ffdd, emissiveIntensity: 2.0 });
    const mNose = new THREE.MeshLambertMaterial({ color: 0xff22cc, emissive: 0xff22cc, emissiveIntensity: 1.2 });
    const mTail = new THREE.MeshLambertMaterial({ color: 0xaa44ff, emissive: 0xaa44ff, emissiveIntensity: 1.5 });
    const mWisk = new THREE.MeshLambertMaterial({ color: 0x44ffee, emissive: 0x44ffee, emissiveIntensity: 0.8, transparent: true, opacity: 0.8 });

    cm(new THREE.SphereGeometry(0.32, 48, 32), mBody, 0, -0.18, 0);
    cm(new THREE.SphereGeometry(0.26, 48, 32), mBody, 0, 0.24, 0);
    cm(new THREE.ConeGeometry(0.08, 0.18, 18), mEarO, -0.16, 0.48, 0, 0, 0, -0.45);
    cm(new THREE.ConeGeometry(0.08, 0.18, 18), mEarO, 0.16, 0.48, 0, 0, 0, 0.45);
    cm(new THREE.ConeGeometry(0.042, 0.1, 18), mEarI, -0.16, 0.48, 0.04, 0, 0, -0.45);
    cm(new THREE.ConeGeometry(0.042, 0.1, 18), mEarI, 0.16, 0.48, 0.04, 0, 0, 0.45);
    cm(new THREE.SphereGeometry(0.072, 24, 16), mEyeW, -0.10, 0.26, 0.22);
    cm(new THREE.SphereGeometry(0.072, 24, 16), mEyeW, 0.10, 0.26, 0.22);
    cm(new THREE.SphereGeometry(0.038, 20, 14), mPup, -0.10, 0.26, 0.282);
    cm(new THREE.SphereGeometry(0.038, 20, 14), mPup, 0.10, 0.26, 0.282);
    cm(new THREE.RingGeometry(0.025, 0.058, 32), mIris, -0.10, 0.26, 0.278);
    cm(new THREE.RingGeometry(0.025, 0.058, 32), mIris, 0.10, 0.26, 0.278);
    cm(new THREE.SphereGeometry(0.026, 16, 12), mNose, 0, 0.16, 0.25);
    cm(new THREE.CylinderGeometry(0.03, 0.055, 0.6, 18), mEarO, 0.44, -0.14, 0, 0, 0, -1.1);
    cm(new THREE.SphereGeometry(0.045, 18, 12), mTail, 0.68, -0.42, 0);
    cm(new THREE.SphereGeometry(0.035, 16, 12), mNose, -0.15, 0.74, 0);
    cm(new THREE.SphereGeometry(0.035, 16, 12), mNose, 0.15, 0.74, 0);
    cm(new THREE.CylinderGeometry(0.009, 0.012, 0.24, 12), mEarO, -0.14, 0.62, 0, 0, 0, -0.26);
    cm(new THREE.CylinderGeometry(0.009, 0.012, 0.24, 12), mEarO, 0.14, 0.62, 0, 0, 0, 0.26);
    cm(new THREE.BoxGeometry(0.22, 0.007, 0.007), mWisk, -0.27, 0.16, 0.22, 0, 0, 0.1);
    cm(new THREE.BoxGeometry(0.22, 0.007, 0.007), mWisk, 0.27, 0.16, 0.22, 0, 0, -0.1);
    cm(new THREE.SphereGeometry(0.1, 24, 18), mBody, -0.2, -0.48, 0.1);
    cm(new THREE.SphereGeometry(0.1, 24, 18), mBody, 0.2, -0.48, 0.1);

    const catSpot = new THREE.PointLight(0x00ffcc, 3.5, 3.5);
    catSpot.position.set(0, 0.3, 0.4);
    catGroup.add(catSpot);
    const catSpot2 = new THREE.PointLight(0xff44cc, 1.5, 2.5);
    catSpot2.position.set(0, 0.7, 0);
    catGroup.add(catSpot2);

    const particleCount = 50;
    const pPos = new Float32Array(particleCount * 3);
    const pCol = new Float32Array(particleCount * 3);
    const pVel = new Float32Array(particleCount * 3);
    const palette = [new THREE.Color(0xffd700), new THREE.Color(0x00ffc8), new THREE.Color(0xff00cc), new THREE.Color(0x00f5ff), new THREE.Color(0xffffff)];
    for (let i = 0; i < particleCount; i++) {
      const c = palette[i % palette.length];
      pCol[i * 3] = c.r;
      pCol[i * 3 + 1] = c.g;
      pCol[i * 3 + 2] = c.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const burstPoints = new THREE.Points(pGeo, pMat);
    burstPoints.position.set(0, 0.8, 0.3);
    scene.add(burstPoints);

    const ray = new THREE.Raycaster();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -DRAG_Z);
    const ndc = new THREE.Vector2();
    const tmp = new THREE.Vector3();
    const cur = START.clone();
    const tgt = START.clone();

    const state = {
      landed: false,
      isDragging: false,
      cur,
      tgt,
      catGroup,
      pMat,
      burstT: -1
    };
    stateRef.current = state;

    const toWorld = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      ray.ray.intersectPlane(dragPlane, tmp);
      return tmp;
    };

    const tryDrag = (clientX, clientY) => {
      if (state.landed) return;
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const catWorldPos = new THREE.Vector3();
      catGroup.getWorldPosition(catWorldPos);
      if (ray.ray.distanceToPoint(catWorldPos) < 0.9) {
        state.isDragging = true;
        document.body.style.cursor = 'grabbing';
      }
    };

    const doMove = (clientX, clientY) => {
      if (!state.isDragging || state.landed) return;
      const w = toWorld(clientX, clientY);
      if (w.lengthSq() > 0.001) state.tgt.set(w.x, w.y, DRAG_Z);
    };

    const spawnBurst = () => {
      state.burstT = 0;
      const arr = pGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        arr[i * 3] = 0;
        arr[i * 3 + 1] = 0;
        arr[i * 3 + 2] = 0;
        const phi = Math.acos(2 * Math.random() - 1);
        const th = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 3;
        pVel[i * 3] = Math.sin(phi) * Math.cos(th) * spd;
        pVel[i * 3 + 1] = Math.abs(Math.sin(phi) * Math.sin(th) * spd) + 0.5;
        pVel[i * 3 + 2] = Math.cos(phi) * spd;
      }
      pGeo.attributes.position.needsUpdate = true;
    };

    const doUp = (clientX, clientY) => {
      if (!state.isDragging || state.landed) return;
      state.isDragging = false;
      document.body.style.cursor = '';
      const w = toWorld(clientX, clientY);
      const dx = w.x;
      const dy = w.y - 0.3;
      if (Math.sqrt(dx * dx + dy * dy) < DROP_R) {
        state.landed = true;
        state.tgt.copy(SEATED_FRONT_OF_BOAT);
        setLandedUI(true);
        setLoading(true);
        setLoadingPercent(0);
        spawnBurst();

        const startedAt = Date.now();
        const progressTimer = window.setInterval(() => {
          const next = Math.min(100, Math.round(((Date.now() - startedAt) / 3000) * 100));
          setLoadingPercent(next);
          if (next >= 100) window.clearInterval(progressTimer);
        }, 60);

        window.setTimeout(() => {
          window.clearInterval(progressTimer);
          setLoading(false);
          setLoadingPercent(100);
          setPopupOpen(true);
        }, 3000);
      } else {
        state.tgt.copy(START);
      }
    };

    const onMouseDown = (e) => tryDrag(e.clientX, e.clientY);
    const onMouseMove = (e) => doMove(e.clientX, e.clientY);
    const onMouseUp = (e) => doUp(e.clientX, e.clientY);
    const onTouchStart = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      tryDrag(t.clientX, t.clientY);
    };
    const onTouchMove = (e) => {
      if (state.isDragging) e.preventDefault();
      const t = e.touches[0];
      if (t) doMove(t.clientX, t.clientY);
    };
    const onTouchEnd = (e) => {
      const t = e.changedTouches[0];
      if (t) doUp(t.clientX, t.clientY);
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      camera.aspect = width / height;
      if (height > width) camera.position.set(0, 2.8, 13.5);
      else camera.position.set(0, 2.5, 11);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let elapsed = 0;
    const lerp = (a, b, t) => a + (b - a) * t;

    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;
      waveMat.uniforms.uT.value = elapsed;
      waterRing.material.opacity = 0.1 + Math.abs(Math.sin(elapsed * 0.6)) * 0.18;

      boatGroup.position.y = Math.sin(elapsed * 0.75) * 0.2;
      boatGroup.rotation.z = Math.sin(elapsed * 0.55) * 0.04;

      const dragging = state.isDragging && !state.landed;
      dzMat.opacity = lerp(dzMat.opacity, dragging ? 0.5 + Math.sin(elapsed * 4) * 0.2 : 0, Math.min(1, dt * 7));

      const speed = state.isDragging ? 13 : state.landed ? 4 : 7;
      const f = Math.min(1, dt * speed);
      state.cur.x = lerp(state.cur.x, state.tgt.x, f);
      state.cur.y = lerp(state.cur.y, state.tgt.y, f);
      state.cur.z = lerp(state.cur.z, state.tgt.z, f);
      catGroup.position.copy(state.cur);

      if (!state.isDragging) {
        catGroup.position.y += state.landed ? Math.sin(elapsed * 0.75) * 0.055 : Math.sin(elapsed * 1.0) * 0.09;
        if (!state.landed) catGroup.rotation.y += dt * 0.4;
      } else {
        catGroup.rotation.y += dt * 1.5;
      }

      if (state.landed) {
        catGroup.position.x += boatGroup.position.x;
        catGroup.position.y += boatGroup.position.y;
        catGroup.rotation.z = boatGroup.rotation.z;
        catGroup.rotation.y = 0;
        catGroup.rotation.x = -0.08;
      }

      if (state.burstT >= 0) {
        state.burstT += dt;
        const arr = pGeo.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          arr[i * 3] += pVel[i * 3] * dt;
          arr[i * 3 + 1] += pVel[i * 3 + 1] * dt;
          arr[i * 3 + 2] += pVel[i * 3 + 2] * dt;
          pVel[i * 3 + 1] -= dt * 1.6;
          pVel[i * 3] *= 0.98;
          pVel[i * 3 + 2] *= 0.98;
        }
        pGeo.attributes.position.needsUpdate = true;
        pMat.opacity = state.burstT < 1.6 ? Math.max(0, 1 - state.burstT / 1.6) : 0;
        if (state.burstT > 2.0) state.burstT = -1;
      }

      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, []);

  const loadingBarStyle = useMemo(() => ({ width: `${loadingPercent}%` }), [loadingPercent]);

  return (
    <main className="stage">
      <canvas ref={canvasRef} className="canvas" />

      <div className="ui">
        <div className="title">
          <h1>✦ COSMIC VOYAGE ✦</h1>
          <p>a journey through the infinite</p>
        </div>

        {!landedUI && <div className="arrow3d">➜</div>}
        {!landedUI && <div className="hint">☽ drag the alien cat into the cosmic boat ☾</div>}
      </div>

      {loading && (
        <div className="loadingPopup" role="dialog" aria-label="Loading">
          <div className="loadingWindowBar">
            <span />
            <span>✕</span>
          </div>
          <div className="loadingTitle">LOADING...</div>
          <div className="loadingBarOuter">
            <div className="loadingBarInner" style={loadingBarStyle} />
          </div>
          <div className="loadingPercent">{loadingPercent}%</div>
        </div>
      )}

      {popupOpen && (
        <div className="popupWindow" role="dialog" aria-label="Mission status">
          <div className="termHeader">
            <span>MISSION STATUS</span>
            <button type="button" onClick={resetExperience}>CLOSE</button>
          </div>
          <div className="termText">
            ALIEN CAT SUCCESSFULLY DOCKED.<br /><br />
            STARSHIP ENGINES ONLINE.<br />
            READY FOR HYPERJUMP.
          </div>
        </div>
      )}
    </main>
  );
}
