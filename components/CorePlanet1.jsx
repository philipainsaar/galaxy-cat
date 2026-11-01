'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyCorePlanetMaterials } from './corePlanetMaterials';
import { createSparkleRotation } from './corePlanetAnimations';
import styles from './CorePlanet.module.css';

// ===== REAL 3D ORBIT SHOP BUTTON =======================================
// A curved, physically beveled pill is mounted ON the animated GLB Torus.
// Its geometry wraps along the torus centerline and is hidden by the planet.
const ORBIT_SHOP_BUTTON_ENABLED = true;
const ORBIT_SHOP_BUTTON_TEXT = '· CLICK TO SHOP ·';
const ORBIT_SHOP_BUTTON_SIZE = 1.0;           // 0.7 compact; 1 normal; 1.4 large
const ORBIT_SHOP_BUTTON_POSITION = -0.48;     // Where on the visible ring to start (screen Y)
const ORBIT_SHOP_BUTTON_WIDTH = 2.35;         // Actual width in 3D world units
const ORBIT_SHOP_BUTTON_HEIGHT = 0.59;        // Actual height in 3D world units
const ORBIT_SHOP_BUTTON_THICKNESS = 0.08;     // Solid volumetric body thickness
const ORBIT_SHOP_BUTTON_BEVEL = 0.085;        // Rounded edges
const ORBIT_SHOP_BUTTON_TILT = 0;             // Extra pitch around ring tangent (degrees); 0 follows ring
const ORBIT_SHOP_BUTTON_RING_GAP = 0.035;     // Small separation from ring surface (3D units)
const ORBIT_SHOP_BUTTON_LIFT = 0.10;         // Gentle visual lift above the ring, in local 3D units
// Pale ice-blue and purple are the colors of the original 2D shop pill.
const ORBIT_SHOP_BUTTON_FACE_COLOR = '#e2f5ff';
const ORBIT_SHOP_BUTTON_FACE_OPACITY = 0.90; // 0 invisible; 1 fully solid
const ORBIT_SHOP_BUTTON_EDGE_COLOR = '#b4f3fc';
const ORBIT_SHOP_BUTTON_EDGE_OPACITY = 0.40; // Independent translucent 3D bevel/side opacity (0–1)
const ORBIT_SHOP_BUTTON_TEXT_COLOR = '#ffffff'; // Crisp center of the letters

// Text is drawn onto its own transparent canvas, independently of face/edge alpha.
const ORBIT_SHOP_TEXT_COLOR = '#74488f'; // Dark purple outline for contrast
const ORBIT_SHOP_TEXT_WEIGHT = 800; // Font weight; 400 normal, 700 bold, 900 extra bold
const ORBIT_SHOP_TEXT_OUTLINE_WIDTH = 6; // Canvas pixels; adds real apparent thickness
const ORBIT_SHOP_TEXT_GLOW_COLOR = '#c594ff';
const ORBIT_SHOP_TEXT_GLOW_BLUR = 20; // Canvas pixels; 0 means no blur
const ORBIT_SHOP_TEXT_GLOW_ENABLED = true;
// Restored 2D-style visual energy, now on the actual moving 3D mesh.
const ORBIT_SHOP_BUTTON_GLOW_PULSE_SPEED = 0.85; // Breathing cycles per second
const ORBIT_SHOP_BUTTON_GLOW_PULSE_AMOUNT = 0.23; // 0 = static, 0.5 = dramatic
const ORBIT_SHOP_BUTTON_SHIMMER_ENABLED = true;
const ORBIT_SHOP_BUTTON_SHIMMER_SPEED = 0.42; // Repeating reflections per second
const ORBIT_SHOP_BUTTON_SHIMMER_STRENGTH = 0.30;
const ORBIT_SHOP_BUTTON_HOVER_BRIGHTNESS = 0.38;
const ORBIT_SHOP_BUTTON_START_X = 0.0; // 0 = screen center; -0.5 left; +0.5 right
// =====================================================================

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

// ===== OUTER BLUE/PINK HOLOGRAPHIC SHELL ===============================
// This is a THIRD, transparent layer OUTSIDE the existing sphere, not the
// heart. All values can be changed here; no extra PNG, GLB or material file.
const SHELL_HOLO_ENABLED = true;             // false = original translucent sphere
const SHELL_HOLO_PINK = '#ff54d4';          // Electric iridescent pink
const SHELL_HOLO_BLUE = '#49c9ff';          // Ice/electric holographic blue
const SHELL_HOLO_INTENSITY = 1.7;          // Overall visibility (1 subtle, 1.8 dramatic)
const SHELL_HOLO_RIM_GLOW = 1.75;           // Brilliant colored reflections at rim
const SHELL_HOLO_REFLECTIONS = 2.65;        // Shiny white glints from the scene lights
const SHELL_HOLO_FLOW_SPEED = 0.7;         // Repeating flow; 0 freezes; 0.34 = ~9.4s per white sweep
const SHELL_HOLO_BAND_SCALE = 1.15;         // Width/frequency of interference bands
const SHELL_HOLO_GAP = 0.012;              // Shell radius offset, 1.9% OUTSIDE sphere
const SPARKLE_HOLO_GAP = 0.008;            // Additional gap beyond holographic shell
// =====================================================================

// ===== PEARLESCENT HOLOGRAPHIC SHARDS ON THE HEART =====================
// Separate transparent layer ABOVE the existing textured Heart mesh.
// The original heart PNG and its pulse animation are never replaced.
const HEART_SHARD_HOLO_ENABLED = true;       // Set false for original heart only
const HEART_SHARD_OFFSET = 0.014;            // Surface offset as a fraction of heart radius
const HEART_SHARD_INTENSITY = 1.15;          // 0.5 subtle; 1.0 pearl; 1.5 dramatic
const HEART_SHARD_ALPHA = 0.35;              // Transparency of the reflective overlay
const HEART_SHARD_FRESNEL = 1.45;            // Pearly edge sheen, increases with angle
const HEART_SHARD_FLOW_SPEED = 0.82;         // Continuous iridescent flow; 0 freezes
const HEART_SHARD_SHARD_SCALE = 6.0;         // Number of softly blended shard regions
const HEART_SHARD_GLOSS = 1.35;              // Sharpness of lighting reflections
const HEART_SHARD_REFLECTIONS = 1.25;        // Brightness of scene-light highlights
const HEART_SHARD_COLOR_A = '#dffbff';      // Icy white-blue
const HEART_SHARD_COLOR_B = '#ffd3ef';      // Pearly pink
const HEART_SHARD_COLOR_C = '#d8cbff';      // Soft lilac
const HEART_SHARD_COLOR_D = '#fff4d9';      // Warm opal highlights
// =====================================================================

const SPARKLE_COLORS = ['#ffffff', '#ffb4ed', '#93dcff', '#edbfff', '#fff8fe'];
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
        gl_FragColor = vec4(mix(uColor, vec3(1.0), ${rays ? '0.64' : '0.90'}), clamp(alpha, 0.0, 1.0));
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * A translucent, luminous film slightly OUTSIDE the blue/pink planet sphere.
 * Its geometry inherits the original globe animation, and its reflected
 * light depends on the actual key/fill light positions and the camera.
 * The underlying shell and Heart texture/pulse are untouched.
 */
function createShellHologram(globe, keyLight, fillLight) {
  if (!SHELL_HOLO_ENABLED || !globe?.isMesh) return null;

  globe.geometry.computeBoundingSphere();
  const bounds = globe.geometry.boundingSphere;
  const radius = Math.max(bounds?.radius || 1, 0.001);
  const material = new THREE.ShaderMaterial({
    name: 'Outer hologram / blue-pink thin-film glass',
    uniforms: {
      uTime: { value: 0 },
      uKeyViewPosition: { value: new THREE.Vector3() },
      uFillViewPosition: { value: new THREE.Vector3() },
      uRadius: { value: radius },
      uGap: { value: SHELL_HOLO_GAP },
      uIntensity: { value: SHELL_HOLO_INTENSITY },
      uRimGlow: { value: SHELL_HOLO_RIM_GLOW },
      uReflections: { value: SHELL_HOLO_REFLECTIONS },
      uFlowSpeed: { value: SHELL_HOLO_FLOW_SPEED },
      uBandScale: { value: SHELL_HOLO_BAND_SCALE },
      uPink: { value: new THREE.Color(SHELL_HOLO_PINK) },
      uBlue: { value: new THREE.Color(SHELL_HOLO_BLUE) },
    },
    transparent: true,
    blending: THREE.NormalBlending,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false,
    vertexShader: `
      uniform float uRadius;
      uniform float uGap;
      varying vec3 vPosition;
      varying vec3 vNormalView;
      varying vec3 vPositionView;
      void main() {
        vPosition = position / max(0.001, uRadius);
        // Offset along the real curved surface normals, not mesh scaling.
        // This avoids drifting when the globe has a translated mesh origin.
        vec3 outer = position + normalize(normal) * (uRadius * uGap);
        vec4 p = modelViewMatrix * vec4(outer, 1.0);
        vPositionView = p.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * p;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uRimGlow;
      uniform float uReflections;
      uniform float uFlowSpeed;
      uniform float uBandScale;
      uniform vec3 uPink;
      uniform vec3 uBlue;
      uniform vec3 uKeyViewPosition;
      uniform vec3 uFillViewPosition;
      varying vec3 vPosition;
      varying vec3 vNormalView;
      varying vec3 vPositionView;
      void main() {
        vec3 n = normalize(vNormalView);
        vec3 v = normalize(-vPositionView);
        float facing = clamp(dot(n, v), 0.0, 1.0);
        float fresnel = pow(1.0 - facing, 2.15);
        vec3 p = vPosition;
        float scale = max(0.05, uBandScale);
        float t = uTime * uFlowSpeed;

        // Two changing interference patterns move across the CURVED sphere.
        // The colors remain pink, blue and lavender, not a flat rainbow image.
        float phaseA = sin(scale * (p.x * 5.1 + p.y * 3.7 - p.z * 2.4) + t * 1.30);
        float phaseB = sin(scale * (p.z * 6.4 - p.x * 2.6 + p.y * 1.7) - t * 0.85);
        float mixFactor = clamp(0.52 + 0.34 * phaseA + 0.18 * phaseB, 0.0, 1.0);
        vec3 film = mix(uBlue, uPink, mixFactor);
        film = mix(film, vec3(0.95, 0.95, 1.0), 0.11);

        // White jewelry-like glints are linked to the REAL THREE.JS LIGHTS.
        vec3 lightKey = normalize(uKeyViewPosition - vPositionView);
        vec3 lightFill = normalize(uFillViewPosition - vPositionView);
        float keyGlint = pow(max(dot(n, normalize(v + lightKey)), 0.0), 112.0);
        float fillGlint = pow(max(dot(n, normalize(v + lightFill)), 0.0), 76.0);

        // CONTINUOUS LOOP: the old linear offset (-t * 0.20) pushed this
        // reflection off the sphere forever, making it appear only once.
        // Move a single thin studio-light band across the sphere, then wrap it
        // OUTSIDE the visible surface. Periodic distance prevents any jump.
        float sweepPeriod = 2.4;
        float sweepCenter = mod(t * 0.75, sweepPeriod) - 0.5 * sweepPeriod;
        float stripPosition = p.x * 0.72 + p.y * 0.39 + 0.08 * phaseB;
        float stripDistance = abs(stripPosition - sweepCenter);
        stripDistance = min(stripDistance, abs(stripPosition - sweepCenter + sweepPeriod));
        stripDistance = min(stripDistance, abs(stripPosition - sweepCenter - sweepPeriod));
        float strip = exp(-pow(stripDistance / 0.070, 2.0));
        strip *= 0.35 + 0.65 * fresnel;
        float shine = max(0.0, uReflections) *
          (0.80 * keyGlint + 0.48 * fillGlint + 0.20 * strip);

        // Concentrate color near the edge and along flowing thin-film bands.
        // Keep the middle highly transparent so the textured Heart is visible.
        float flowing = 0.5 + 0.5 * sin(scale * (p.x * 7.3 - p.y * 4.0) - t * 1.0);
        float rim = fresnel * max(0.0, uRimGlow);
        float alpha = max(0.0, uIntensity) *
          (0.038 + 0.075 * flowing + 0.29 * rim + 0.22 * shine);
        alpha = clamp(alpha, 0.0, 0.75);
        vec3 color = film * (0.88 + 0.45 * rim) + vec3(1.0) * (1.40 * shine);
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
  });

  // The extra layer is a child of the original globe, following its animation
  // and exactly matching its geometry. The shader moves vertices slightly out.
  const outer = new THREE.Mesh(globe.geometry, material);
  outer.name = 'OuterBluePinkHolographicShell';
  outer.renderOrder = 11; // After original shell (10); before glints (12-14) and front ring (15).
  outer.frustumCulled = false; // The shader expands vertices beyond the source bounds.
  outer.raycast = () => {};    // Preserve existing hit-testing and dragging.
  globe.add(outer);

  const keyWorld = new THREE.Vector3();
  const fillWorld = new THREE.Vector3();
  return {
    update(seconds, camera) {
      material.uniforms.uTime.value = seconds;
      keyLight.getWorldPosition(keyWorld);
      fillLight.getWorldPosition(fillWorld);
      material.uniforms.uKeyViewPosition.value.copy(keyWorld).applyMatrix4(camera.matrixWorldInverse);
      material.uniforms.uFillViewPosition.value.copy(fillWorld).applyMatrix4(camera.matrixWorldInverse);
    },
  };
}

/**
 * Soft opalescent shards on the Heart, using its OWN geometry as a separate,
 * transparent overlay. Light is driven by the scene's key/fill lamps and the
 * viewing direction; a periodic, non-terminating interference pattern creates
 * the shifting pearly reflections. No external texture is loaded.
 *
 * A vertex-normal offset (rather than a scaled mesh) keeps the film close to
 * the heart even when the mesh pivot isn't at the geometry's center. As a
 * child of the original Heart, it inherits the existing pulse animation.
 */
function createHeartShardHologram(heart, keyLight, fillLight) {
  if (!HEART_SHARD_HOLO_ENABLED || !heart?.isMesh) return null;
  heart.geometry.computeBoundingSphere();
  const bounds = heart.geometry.boundingSphere;
  const radius = Math.max(bounds?.radius || 1, 0.001);

  const material = new THREE.ShaderMaterial({
    name: 'Heart / soft pearlescent holographic shard film',
    uniforms: {
      uTime: { value: 0 },
      uOffset: { value: radius * HEART_SHARD_OFFSET },
      uRadius: { value: radius },
      uCenter: { value: bounds?.center?.clone() || new THREE.Vector3() },
      uIntensity: { value: HEART_SHARD_INTENSITY },
      uAlpha: { value: HEART_SHARD_ALPHA },
      uFresnel: { value: HEART_SHARD_FRESNEL },
      uFlowSpeed: { value: HEART_SHARD_FLOW_SPEED },
      uShardScale: { value: HEART_SHARD_SHARD_SCALE },
      uGloss: { value: HEART_SHARD_GLOSS },
      uReflections: { value: HEART_SHARD_REFLECTIONS },
      uColorA: { value: new THREE.Color(HEART_SHARD_COLOR_A) },
      uColorB: { value: new THREE.Color(HEART_SHARD_COLOR_B) },
      uColorC: { value: new THREE.Color(HEART_SHARD_COLOR_C) },
      uColorD: { value: new THREE.Color(HEART_SHARD_COLOR_D) },
      uKeyViewPosition: { value: new THREE.Vector3() },
      uFillViewPosition: { value: new THREE.Vector3() },
    },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.FrontSide,
    toneMapped: false,
    vertexShader: `
      uniform float uOffset;
      uniform float uRadius;
      uniform vec3 uCenter;
      varying vec2 vUv;
      varying vec3 vHeartPos;
      varying vec3 vViewPos;
      varying vec3 vViewNormal;
      void main() {
        vUv = uv;
        vHeartPos = (position - uCenter) / max(0.001, uRadius);
        vec3 displaced = position + normalize(normal) * uOffset;
        vec4 viewPos = modelViewMatrix * vec4(displaced, 1.0);
        vViewPos = viewPos.xyz;
        vViewNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uAlpha;
      uniform float uFresnel;
      uniform float uFlowSpeed;
      uniform float uShardScale;
      uniform float uGloss;
      uniform float uReflections;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform vec3 uColorD;
      uniform vec3 uKeyViewPosition;
      uniform vec3 uFillViewPosition;
      varying vec2 vUv;
      varying vec3 vHeartPos;
      varying vec3 vViewPos;
      varying vec3 vViewNormal;

      // Cheap, stable 2-D hash for smooth Voronoi-like shard regions.
      vec2 shardHash(vec2 p) {
        return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                              dot(p, vec2(269.5, 183.3)))) * 43758.5453);
      }
      float shardTone(vec2 p) {
        return fract(sin(dot(p, vec2(46.41, 91.17))) * 43758.5453);
      }
      void main() {
        vec3 n = normalize(vViewNormal);
        vec3 v = normalize(-vViewPos);
        float facing = clamp(dot(n, v), 0.0, 1.0);
        float rim = pow(1.0 - facing, 2.4 / max(0.25, uFresnel));
        float time = uTime * uFlowSpeed;

        // Smooth, softly bounded reflective 'shards', not geometric chunks.
        // UVs are reused from the heart; no new texture, UV export or mesh.
        vec2 coords = vUv * max(0.5, uShardScale);
        coords += 0.055 * vec2(sin(coords.y * 1.8), cos(coords.x * 1.6));
        vec2 gridCell = floor(coords);
        vec2 fracCell = fract(coords);
        float nearest = 9.0;
        float second = 9.0;
        vec2 closestId = vec2(0.0);
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 id = gridCell + neighbor;
            vec2 center = neighbor + mix(vec2(0.19), vec2(0.81), shardHash(id));
            float dist2 = dot(center - fracCell, center - fracCell);
            if (dist2 < nearest) {
              second = nearest;
              nearest = dist2;
              closestId = id;
            } else if (dist2 < second) {
              second = dist2;
            }
          }
        }
        float edge = 1.0 - smoothstep(0.012, 0.19, second - nearest);
        float cellTone = shardTone(closestId);
        float cellPhase = shardTone(closestId + vec2(18.3, 4.7));

        // Continuously repeating thin-film color interference. Its phase is
        // periodic and never sweeps out of view permanently.
        float wave = 0.5 + 0.5 * sin(
          7.2 * (1.0 - facing) + vHeartPos.x * 6.5 -
          vHeartPos.y * 4.7 + 3.0 * cellPhase + time * 1.7);
        float wave2 = 0.5 + 0.5 * sin(
          vHeartPos.y * 9.2 + vHeartPos.z * 4.6 - time * 1.1);
        vec3 pearl = mix(uColorA, uColorB, wave);
        pearl = mix(pearl, uColorC, 0.25 + 0.40 * wave2);
        pearl = mix(pearl, uColorD, 0.11 + 0.15 * (1.0 - wave));
        pearl = mix(pearl, vec3(1.0), 0.17);
        pearl *= mix(0.84, 1.15, cellTone);

        // Broad reflection plus sharp glints from the actual scene lights.
        vec3 lk = normalize(uKeyViewPosition - vViewPos);
        vec3 lf = normalize(uFillViewPosition - vViewPos);
        vec3 halfKey = normalize(lk + v);
        vec3 halfFill = normalize(lf + v);
        float gloss = max(0.3, uGloss);
        float broad = pow(max(dot(n, halfKey), 0.0), 18.0 * gloss);
        float sharp = pow(max(dot(n, halfKey), 0.0), 96.0 * gloss);
        float fill = pow(max(dot(n, halfFill), 0.0), 42.0 * gloss);

        // Thin, softly moving studio reflection inside the shard film.
        float sweep = pow(max(0.0, cos(
          (vHeartPos.x * 4.0 + vHeartPos.y * 2.2 +
           0.30 * sin(vHeartPos.z * 7.0)) - time * 1.35)), 28.0);
        float highlight = max(0.0, uReflections) *
          (0.58 * broad + 1.4 * sharp + 0.45 * fill + 0.23 * sweep);
        float patchSheen = (0.15 + 0.30 * wave) * (0.65 + 0.35 * cellTone);
        float boundarySheen = 0.06 * edge * (0.35 + 0.65 * wave2);

        // The original textured heart stays visible under the transparent film.
        float opacity = clamp(max(0.0, uAlpha) * max(0.0, uIntensity) *
          (0.34 + patchSheen + 0.40 * rim + boundarySheen + 0.55 * highlight),
          0.0, 0.64);
        vec3 color = pearl * (0.90 + 0.35 * rim + 0.18 * patchSheen)
                   + vec3(1.0) * (0.82 * highlight + 0.06 * edge * wave);
        if (opacity < 0.002) discard;
        gl_FragColor = vec4(color, opacity);
        #include <colorspace_fragment>
      }
    `,
  });

  // Reuse heart geometry and its pulse transform. Displace vertices along the
  // actual heart normals so the film does not distort the model's silhouette.
  const overlay = new THREE.Mesh(heart.geometry, material);
  overlay.name = 'HeartOpalescentShardOverlay';
  overlay.renderOrder = 9; // Heart first, then shard film, then shell (10/11).
  overlay.frustumCulled = false;
  overlay.raycast = () => {}; // Do not interfere with the existing click target.
  heart.add(overlay);

  const keyWorld = new THREE.Vector3();
  const fillWorld = new THREE.Vector3();
  return {
    update(seconds, camera) {
      material.uniforms.uTime.value = seconds;
      keyLight.getWorldPosition(keyWorld);
      fillLight.getWorldPosition(fillWorld);
      material.uniforms.uKeyViewPosition.value.copy(keyWorld).applyMatrix4(camera.matrixWorldInverse);
      material.uniforms.uFillViewPosition.value.copy(fillWorld).applyMatrix4(camera.matrixWorldInverse);
    },
  };
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
    // Float just OUTSIDE the new blue/pink holographic layer, with a tiny
    // additional gap. Keep invisible geometry from protruding into the scene.
    const outsideRadius = radius * (1 + (SHELL_HOLO_ENABLED ? SHELL_HOLO_GAP : 0) + SPARKLE_HOLO_GAP);
    group.position.copy(center).addScaledVector(normal, outsideRadius);
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

/**
 * Infer the torus' own centerline from its exported mesh, not from camera-up,
 * world axes or arbitrary GLB object rotation. Handles Blender-baked plane tilt.
 * The smallest principal axis of the vertex cloud is the circle's plane normal.
 */
function measureOrbitTube(geometry) {
  const vertices = geometry.getAttribute('position');
  if (!vertices || vertices.count < 12) return null;
  const stride = Math.max(1, Math.floor(vertices.count / 12000));
  const center = new THREE.Vector3();
  const p = new THREE.Vector3();
  let count = 0;
  for (let i = 0; i < vertices.count; i += stride) {
    center.add(p.fromBufferAttribute(vertices, i));
    count++;
  }
  center.multiplyScalar(1 / count);
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (let i = 0; i < vertices.count; i += stride) {
    p.fromBufferAttribute(vertices, i).sub(center);
    xx += p.x * p.x; xy += p.x * p.y; xz += p.x * p.z;
    yy += p.y * p.y; yz += p.y * p.z; zz += p.z * p.z;
  }
  const a = [[xx, xy, xz], [xy, yy, yz], [xz, yz, zz]];
  const eigenvectors = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let k = 0; k < 24; k++) {
    let u = 0, v = 1;
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
      if (Math.abs(a[i][j]) > Math.abs(a[u][v])) { u = i; v = j; }
    }
    if (Math.abs(a[u][v]) < 1e-10) break;
    const angle = 0.5 * Math.atan2(2 * a[u][v], a[v][v] - a[u][u]);
    const c = Math.cos(angle), s = Math.sin(angle);
    // Jacobi rotation with eigenvector columns, preserving symmetry.
    const auu = a[u][u], avv = a[v][v], auv = a[u][v];
    a[u][u] = c * c * auu - 2 * c * s * auv + s * s * avv;
    a[v][v] = s * s * auu + 2 * c * s * auv + c * c * avv;
    a[u][v] = a[v][u] = 0;
    for (let i = 0; i < 3; i++) {
      if (i !== u && i !== v) {
        const aiu = a[i][u], aiv = a[i][v];
        a[i][u] = a[u][i] = c * aiu - s * aiv;
        a[i][v] = a[v][i] = s * aiu + c * aiv;
      }
      const viu = eigenvectors[i][u], viv = eigenvectors[i][v];
      eigenvectors[i][u] = c * viu - s * viv;
      eigenvectors[i][v] = s * viu + c * viv;
    }
  }
  let smallest = 0;
  for (let i = 1; i < 3; i++) if (a[i][i] < a[smallest][smallest]) smallest = i;
  const planeNormal = new THREE.Vector3(
    eigenvectors[0][smallest], eigenvectors[1][smallest], eigenvectors[2][smallest],
  ).normalize();
  const axisU = new THREE.Vector3(1, 0, 0).addScaledVector(planeNormal, -planeNormal.x);
  if (axisU.lengthSq() < 0.01) axisU.set(0, 1, 0).addScaledVector(planeNormal, -planeNormal.y);
  axisU.normalize();
  const axisV = new THREE.Vector3().crossVectors(planeNormal, axisU).normalize();
  let radialSum = 0, minRadial = Infinity, maxRadial = 0;
  for (let i = 0; i < vertices.count; i += stride) {
    p.fromBufferAttribute(vertices, i).sub(center);
    const radial = Math.hypot(p.dot(axisU), p.dot(axisV));
    radialSum += radial;
    minRadial = Math.min(minRadial, radial);
    maxRadial = Math.max(maxRadial, radial);
  }
  const radius = radialSum / count;
  const tubeRadius = Math.max(0.001, (maxRadial - minRadial) * 0.5);
  if (!Number.isFinite(radius) || radius <= tubeRadius * 1.2) return null;
  return { center, axisU, axisV, radius, tubeRadius };
}

/**
 * The entire CTA is actual THREE.Mesh geometry parented to the animated Torus.
 * Thus it inherits the GLB's baked 0.4x orbit movement with zero HTML
 * projection, CSS transforms, or fake depth. The text is a CanvasTexture
 * on the face of a physical, bevelled capsule (no image asset required).
 *
 * The underlying translucent globe does not write depth. To make the pill
 * disappear BEHIND that sphere instead of shining through, an explicit
 * sphere/ray depth test is injected into the button's own materials. It
 * discards covered FRAGMENTS rather than hiding the entire button at once.
 */
function createOrbitShopMesh(ring, globe, camera) {
  if (!ring?.isMesh || !globe?.isMesh || !ORBIT_SHOP_BUTTON_ENABLED) return null;
  const tube = measureOrbitTube(ring.geometry);
  if (!tube) return null;
  ring.updateWorldMatrix(true, false);
  globe.updateWorldMatrix(true, false);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  // Use the real geometry center, not just the object origin. This keeps the
  // depth test and button placement accurate when Blender baked a translation.
  globe.geometry.computeBoundingSphere();
  const globeRadius = globe.geometry.boundingSphere.radius;
  const globeCenter = globe.localToWorld(globe.geometry.boundingSphere.center.clone());
  const globeScale = new THREE.Vector3();
  globe.getWorldScale(globeScale);
  const worldRadius = globeRadius * Math.max(globeScale.x, globeScale.y, globeScale.z)
    * (1 + (SHELL_HOLO_ENABLED ? SHELL_HOLO_GAP : 0));

  const scale = Math.max(0.01, ORBIT_SHOP_BUTTON_SIZE);
  const w = ORBIT_SHOP_BUTTON_WIDTH;
  const h = ORBIT_SHOP_BUTTON_HEIGHT;
  const d = ORBIT_SHOP_BUTTON_THICKNESS;
  const bevel = Math.min(ORBIT_SHOP_BUTTON_BEVEL, h * 0.40);

  // Mount on the FRONT of the torus tube, not radially off its left/right
  // circumference. The local ring frame keeps the bevel and text readable,
  // while the entire object still rides on Torus as real 3D geometry.
  // Candidate anchors are checked for occlusion of the entire button.
  const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const localEye = new THREE.Vector3();
  const ringInverse = ring.matrixWorld.clone().invert();
  const cameraLocal = camera.position.clone().applyMatrix4(ringInverse);
  const anchor = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const up = new THREE.Vector3();
  const world = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const corner = new THREE.Vector3();
  const screenRight = new THREE.Vector3();
  const sphereRay = new THREE.Vector3();
  const centerRay = new THREE.Vector3();
  const eyeDirection = new THREE.Vector3();
  let bestAngle = null;
  let bestScore = Infinity;

  function sphereHides(worldPoint) {
    sphereRay.subVectors(worldPoint, camera.position);
    const distance = sphereRay.length();
    sphereRay.divideScalar(Math.max(0.000001, distance));
    centerRay.subVectors(globeCenter, camera.position);
    const along = centerRay.dot(sphereRay);
    const disc = along * along - centerRay.lengthSq() + worldRadius * worldRadius;
    return disc > 0 && along > 0 && along - Math.sqrt(disc) > 0 &&
      distance > along - Math.sqrt(disc) + 0.012;
  }

  function ringFrame(theta) {
    radial.copy(tube.axisU).multiplyScalar(Math.cos(theta))
      .addScaledVector(tube.axisV, Math.sin(theta)).normalize();
    anchor.copy(tube.center).addScaledVector(radial, tube.radius);
    tangent.copy(tube.axisV).multiplyScalar(Math.cos(theta))
      .addScaledVector(tube.axisU, -Math.sin(theta)).normalize();
    world.copy(anchor).applyMatrix4(ring.matrixWorld);
    camera.getWorldDirection(eyeDirection);
    screenRight.copy(localRight).transformDirection(ringInverse);
    if (tangent.dot(screenRight) < 0) tangent.negate();
    localEye.copy(cameraLocal).sub(anchor);
    forward.copy(localEye).addScaledVector(tangent, -localEye.dot(tangent)).normalize();
    if (forward.lengthSq() < 0.01) forward.copy(tube.axisU).cross(tangent).normalize();
    up.crossVectors(forward, tangent).normalize();
    const pitch = THREE.MathUtils.degToRad(ORBIT_SHOP_BUTTON_TILT);
    up.applyAxisAngle(tangent, pitch);
    forward.applyAxisAngle(tangent, pitch);
    // The button is mounted on the camera-facing SIDE of the torus cross-section
    // rather than moving radially away from the ring center. At the start of
    // the orbit its front reads like the original capsule, without side skew.
    // Its actual thickness + bevel + a small gap clear the whole tube.
    return tube.tubeRadius + scale * (d * 0.5 + bevel) +
      Math.max(0, ORBIT_SHOP_BUTTON_RING_GAP);
  }

  for (let i = 0; i < 360; i++) {
    const theta = i * Math.PI * 2 / 360;
    const mount = ringFrame(theta);
    corner.copy(anchor).addScaledVector(forward, mount)
      .addScaledVector(up, ORBIT_SHOP_BUTTON_LIFT * scale);
    const centerWorld = corner.clone().applyMatrix4(ring.matrixWorld);
    projected.copy(centerWorld).project(camera);
    if (projected.z < -1 || projected.z > 1) continue;
    let penalty = 0;
    // Sample the visible front face and its four corners. This prevents
    // the 'CLICK TO SH...' clipping seen on the left side of the globe.
    for (const px of [-0.5, 0, 0.5]) {
      for (const py of [-0.5, 0, 0.5]) {
        const p = corner.clone()
          .addScaledVector(tangent, px * w * scale)
          .addScaledVector(up, py * h * scale)
          .addScaledVector(forward, (d * 0.5 + bevel) * scale)
          .applyMatrix4(ring.matrixWorld);
        const ndc = p.clone().project(camera);
        if (Math.abs(ndc.x) > 0.96 || Math.abs(ndc.y) > 0.94) penalty += 10;
        if (sphereHides(p)) penalty += 8;
      }
    }
    // Strongly prioritize bottom CENTER, rather than the far-left endpoint.
    // A real occlusion/offscreen penalty still takes precedence when necessary.
    const score = 3.0 * penalty +
      26.0 * (projected.x - ORBIT_SHOP_BUTTON_START_X) ** 2 +
      5.0 * (projected.y - ORBIT_SHOP_BUTTON_POSITION) ** 2;
    if (score < bestScore) { bestScore = score; bestAngle = theta; }
  }
  if (bestAngle === null) return null;

  const mountDistance = ringFrame(bestAngle);
  const inward = radial.clone().negate();
  const orbitGroup = new THREE.Group();
  orbitGroup.name = 'OrbitShopButton_Real3D';
  // Mount against the camera-facing surface of the curved torus tube.
  // The small screen-up lift is local to Torus, so the button follows every
  // ring rotation and will go behind the planet naturally.
  orbitGroup.position.copy(anchor).addScaledVector(forward, mountDistance)
    .addScaledVector(up, ORBIT_SHOP_BUTTON_LIFT * scale);
  orbitGroup.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(tangent, up, forward),
  );
  orbitGroup.scale.setScalar(scale);
  ring.add(orbitGroup);

  // Bend the actual mesh, sidewalls and text around the torus circular arc.
  // Unlike a rigid flat pill, even the far ends now follow the ring tube.
  // Each cross-section is parallel-transported as the ring turns under it.
  const inwardLocal = new THREE.Vector3(0, inward.dot(up), inward.dot(forward));
  const radialLocal = inwardLocal.clone().negate();
  const bendAxis = new THREE.Vector3(1, 0, 0).cross(inwardLocal).normalize();
  const bendRadius = tube.radius / scale;
  const mountLocal = mountDistance / scale;
  const liftLocal = ORBIT_SHOP_BUTTON_LIFT;
  const section = new THREE.Vector3();
  function wrapToOrbit(geometry) {
    const attr = geometry.getAttribute('position');
    for (let i = 0; i < attr.count; i++) {
      const x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i);
      const theta = x / bendRadius;
      const sag = bendRadius * (1 - Math.cos(theta));
      // Carry the initial forward offset and lift along the actual arc,
      // preserving a curved pill without deforming the face or text asymmetrically.
      section.set(0, y + liftLocal, z + mountLocal).applyAxisAngle(bendAxis, theta);
      attr.setXYZ(i,
        bendRadius * Math.sin(theta) + section.x,
        inwardLocal.y * sag + section.y - liftLocal,
        inwardLocal.z * sag + section.z - mountLocal,
      );
    }
    attr.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
  }

  function pillShape(width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    const x = -width / 2, y = -height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    for (let i = 1; i <= 24; i++) {
      shape.lineTo(x + r + (width - 2 * r) * i / 24, y);
    }
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    for (let i = 1; i <= 24; i++) {
      shape.lineTo(x + width - r - (width - 2 * r) * i / 24, y + height);
    }
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
  }

  // The curved 3D bevel and front have separate adjustable alpha values.
  // Both remain properly sphere-occluded by the existing material shader.
  const bodyGeometry = new THREE.ExtrudeGeometry(pillShape(w, h, h / 2 - bevel), {
    depth: d,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 14,
    steps: 1,
  });
  bodyGeometry.translate(0, 0, -d * 0.5);
  wrapToOrbit(bodyGeometry);
  const faceZ = d * 0.5 + bevel;
  // ExtrudeGeometry has separate groups for its front/back and bevel sides.
  // The cool-blue edge is shaded differently, so this reads as a solid pill
  // while keeping the SAME pale blue appearance as the original HTML CTA.
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    name: 'Shop / original ice-blue rounded face',
    color: ORBIT_SHOP_BUTTON_FACE_COLOR,
    metalness: 0.02,
    roughness: 0.18,
    clearcoat: 1.8,
    clearcoatRoughness: 0.12,
    emissive: ORBIT_SHOP_BUTTON_FACE_COLOR,
    emissiveIntensity: 0.42,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: THREE.MathUtils.clamp(ORBIT_SHOP_BUTTON_FACE_OPACITY, 0, 1),
    depthWrite: false,
  });
  const edgeMaterial = new THREE.MeshPhysicalMaterial({
    name: 'Shop / soft ice-blue 3D beveled edge',
    color: ORBIT_SHOP_BUTTON_EDGE_COLOR,
    metalness: 0.04,
    roughness: 0.25,
    clearcoat: 0.9,
    clearcoatRoughness: 0.11,
    emissive: ORBIT_SHOP_BUTTON_EDGE_COLOR,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: THREE.MathUtils.clamp(ORBIT_SHOP_BUTTON_EDGE_OPACITY, 0, 1),
    depthWrite: false, // Transparent edges must not punch holes in the ring/heart.
  });
  const body = new THREE.Mesh(bodyGeometry, [bodyMaterial, edgeMaterial]);
  body.name = 'OrbitShopButton_SolidBeveledBody';
  body.renderOrder = 18; // Draw above the front ring so the tube stays UNDER the pill.
  body.castShadow = false;
  body.receiveShadow = false;
  orbitGroup.add(body);

  // A custom text canvas becomes a material map on a true 3D front plane.
  // The texture has NO solid background; the bevelled body provides it.
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) { ring.remove(orbitGroup); return null; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Always honor the top-of-file font weight, even after fitting long text.
  const fontWeight = Math.max(100, Math.min(900, ORBIT_SHOP_TEXT_WEIGHT));
  const textFont = (px) => `${fontWeight} ${px}px "Inconsolata", ui-monospace, monospace`;
  ctx.font = textFont(84);
  // Fit text inside the curved 3D face without changing button geometry.
  const maxTextWidth = canvas.width * 0.87;
  const measuredWidth = ctx.measureText(ORBIT_SHOP_BUTTON_TEXT).width;
  if (measuredWidth > maxTextWidth) {
    ctx.font = textFont(Math.max(48, Math.floor(84 * maxTextWidth / measuredWidth)));
  }
  const textX = canvas.width / 2;
  const textY = canvas.height / 2;
  const outlineWidth = Math.max(0, ORBIT_SHOP_TEXT_OUTLINE_WIDTH);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Draw the luminous halo on the transparent lettering texture itself.
  // A separate material keeps the text legible when the body/edge are glassy.
  if (ORBIT_SHOP_TEXT_GLOW_ENABLED && ORBIT_SHOP_TEXT_GLOW_BLUR > 0) {
    ctx.save();
    ctx.shadowColor = ORBIT_SHOP_TEXT_GLOW_COLOR;
    ctx.shadowBlur = Math.max(0, ORBIT_SHOP_TEXT_GLOW_BLUR);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = ORBIT_SHOP_TEXT_GLOW_COLOR;
    ctx.lineWidth = outlineWidth + 3;
    ctx.globalAlpha = 0.65;
    // A second pass strengthens the soft light, rather than enlarging the text.
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.strokeText(ORBIT_SHOP_BUTTON_TEXT, textX, textY);
    }
    ctx.restore();
  }

  // Dark purple outline + white core: crisp, thicker, and easily readable.
  // The text colors are independent of the 3D glass face and its opacity.
  if (outlineWidth > 0) {
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = ORBIT_SHOP_TEXT_COLOR;
    ctx.strokeText(ORBIT_SHOP_BUTTON_TEXT, textX, textY);
  }
  ctx.fillStyle = ORBIT_SHOP_BUTTON_TEXT_COLOR;
  ctx.fillText(ORBIT_SHOP_BUTTON_TEXT, textX, textY);
  const textMap = new THREE.CanvasTexture(canvas);
  textMap.colorSpace = THREE.SRGBColorSpace;
  textMap.anisotropy = 4;
  const textMaterial = new THREE.MeshBasicMaterial({
    name: 'Shop / crisp lettering on 3D face',
    map: textMap,
    transparent: true,
    alphaTest: 0.004, // Don't discard the soft lavender glow's low-alpha pixels.
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const textMesh = new THREE.Mesh(wrapToOrbit(new THREE.PlaneGeometry(w * 0.98, h * 0.93, 36, 2).translate(0, 0, faceZ + 0.013)), textMaterial);
  textMesh.name = 'OrbitShopButton_Lettering';
  textMesh.renderOrder = 22;
  textMesh.raycast = () => {};
  orbitGroup.add(textMesh);

  // A translucent rounded frontal enamel coat catches reflections with
  // geometry and material response (not an HTML border or CSS gradient).
  const faceMaterial = new THREE.MeshPhysicalMaterial({
    name: 'Shop / translucent pearly glass face',
    color: '#f4fcff',
    metalness: 0.0,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.09,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const enamel = new THREE.Mesh(wrapToOrbit(new THREE.ShapeGeometry(
    pillShape(w * 0.95, h * 0.84, h * 0.39),
  ).translate(0, 0, faceZ + 0.005)), faceMaterial);
  enamel.name = 'OrbitShopButton_PearlyGlassFace';
  enamel.renderOrder = 19;
  enamel.raycast = () => {};
  orbitGroup.add(enamel);

  // The original pastel 2D pill had an airy, light-catching presence. Keep
  // that aesthetic with a real animated reflection on the CURVED 3D surface,
  // rather than a camera-aligned HTML overlay or constantly rotating billboard.
  const sweepGeometry = new THREE.ShapeGeometry(pillShape(w * 0.93, h * 0.78, h * 0.35));
  const sweepUv = sweepGeometry.getAttribute('uv');
  const sweepPosition = sweepGeometry.getAttribute('position');
  for (let i = 0; i < sweepUv.count; i++) {
    sweepUv.setXY(i, sweepPosition.getX(i) / w + 0.5,
      sweepPosition.getY(i) / h + 0.5);
  }
  sweepUv.needsUpdate = true;
  sweepGeometry.translate(0, 0, faceZ + 0.009);
  wrapToOrbit(sweepGeometry);
  const sweepMaterial = new THREE.ShaderMaterial({
    name: 'Shop / animated pastel glass reflection',
    transparent: true,
    blending: THREE.NormalBlending,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: ORBIT_SHOP_BUTTON_SHIMMER_SPEED },
      uStrength: { value: ORBIT_SHOP_BUTTON_SHIMMER_ENABLED ? ORBIT_SHOP_BUTTON_SHIMMER_STRENGTH : 0 },
      uOcclusionCenter: { value: new THREE.Vector3() },
      uOcclusionCamera: { value: new THREE.Vector3() },
      uOcclusionRadius: { value: worldRadius },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      uniform float uTime, uSpeed, uStrength, uOcclusionRadius;
      uniform vec3 uOcclusionCenter, uOcclusionCamera;
      void main() {
        // Transparent sphere does not write depth, so clip the reflection too.
        vec3 ray = vWorldPosition - uOcclusionCamera;
        float distanceToPixel = length(ray);
        vec3 dir = ray / max(distanceToPixel, 0.00001);
        vec3 toSphere = uOcclusionCenter - uOcclusionCamera;
        float along = dot(toSphere, dir);
        float disc = along * along - dot(toSphere, toSphere) + uOcclusionRadius * uOcclusionRadius;
        if (disc > 0.0) {
          float nearD = along - sqrt(disc);
          if (nearD > 0.0 && distanceToPixel > nearD + 0.015) discard;
        }
        // Smooth seamless periodic sweep from left to right with soft edges.
        float phase = fract(uTime * uSpeed);
        float center = phase * 1.6 - 0.3;
        float blade = exp(-pow((vUv.x - center) / 0.092, 2.0));
        float vertical = 0.58 + 0.42 * smoothstep(0.0, 1.0, vUv.y);
        float fade = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
        float alpha = clamp(blade * vertical * fade * uStrength, 0.0, 0.65);
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(0.93, 0.99, 1.0, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
  const sweepMesh = new THREE.Mesh(sweepGeometry, sweepMaterial);
  sweepMesh.name = 'OrbitShopButton_AnimatedSheen';
  sweepMesh.renderOrder = 20;
  sweepMesh.raycast = () => {};
  orbitGroup.add(sweepMesh);

  // Explicit sphere occlusion, PER FRAGMENT. The existing sphere material
  // is transparent with depthWrite:false, so ordinary depthTest alone does
  // NOT hide an object on its far side. Mask against its world-space surface.
  const occlusionCenter = globeCenter.clone();
  const occlusionCamera = new THREE.Vector3();
  const occlusionRadius = { value: worldRadius };
  const patchOcclusion = (material) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uShopSphereCenter = { value: occlusionCenter };
      shader.uniforms.uShopCamera = { value: occlusionCamera };
      shader.uniforms.uShopSphereRadius = occlusionRadius;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>', '#include <common>\nvarying vec3 vShopWorldPosition;');
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvShopWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vShopWorldPosition;
         uniform vec3 uShopSphereCenter;
         uniform vec3 uShopCamera;
         uniform float uShopSphereRadius;`);
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
         vec3 shopRay = vShopWorldPosition - uShopCamera;
         float shopDistance = length(shopRay);
         vec3 shopDirection = shopRay / max(shopDistance, 0.00001);
         vec3 shopCenterVector = uShopSphereCenter - uShopCamera;
         float shopAlong = dot(shopCenterVector, shopDirection);
         float shopDiscriminant = shopAlong * shopAlong
           - dot(shopCenterVector, shopCenterVector)
           + uShopSphereRadius * uShopSphereRadius;
         if (shopDiscriminant > 0.0) {
           float shopNear = shopAlong - sqrt(shopDiscriminant);
           if (shopNear > 0.0 && shopDistance > shopNear + 0.015) discard;
         }`);
    };
    material.customProgramCacheKey = () => 'shop-sphere-clip-v1';
    material.needsUpdate = true;
  };
  for (const material of [bodyMaterial, edgeMaterial, textMaterial, faceMaterial]) patchOcclusion(material);

  // The raycaster must honor the SAME occlusion as the fragment shader:
  // invisible backside geometry cannot create a ghost clicking area.
  const originalRaycast = body.raycast.bind(body);
  body.raycast = (raycaster, intersects) => {
    const hits = [];
    originalRaycast(raycaster, hits);
    for (const hit of hits) {
      const ray = hit.point.clone().sub(raycaster.ray.origin);
      const distance = ray.length();
      ray.divideScalar(Math.max(distance, 0.00001));
      const toCenter = occlusionCenter.clone().sub(raycaster.ray.origin);
      const along = toCenter.dot(ray);
      const disc = along * along - toCenter.lengthSq() + occlusionRadius.value ** 2;
      if (disc > 0 && along - Math.sqrt(disc) > 0 &&
          distance > along - Math.sqrt(disc) + 0.015) continue;
      intersects.push(hit);
    }
  };

  const worldSize = new THREE.Vector3();
  let hovered = false;
  let hoverBlend = 0;
  return {
    // Real 3D ray test respects the same sphere mask used during rendering.
    setHover(raycaster) {
      hovered = Boolean(raycaster && raycaster.intersectObject(body, false).length);
      return hovered;
    },
    update(seconds = 0, dt = 0, animate = true) {
      globe.updateWorldMatrix(true, false);
      occlusionCenter.copy(globe.geometry.boundingSphere.center).applyMatrix4(globe.matrixWorld);
      globe.getWorldScale(worldSize);
      occlusionRadius.value = globeRadius * Math.max(worldSize.x, worldSize.y, worldSize.z)
        * (1 + (SHELL_HOLO_ENABLED ? SHELL_HOLO_GAP : 0));
      occlusionCamera.copy(camera.position);
      const phase = animate ? seconds : 0;
      const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2 *
        Math.max(0, ORBIT_SHOP_BUTTON_GLOW_PULSE_SPEED));
      const breathing = (pulse - 0.5) * 2 * ORBIT_SHOP_BUTTON_GLOW_PULSE_AMOUNT;
      hoverBlend = THREE.MathUtils.damp(hoverBlend, hovered ? 1 : 0, 8, Math.max(0, dt));
      const boost = ORBIT_SHOP_BUTTON_HOVER_BRIGHTNESS * hoverBlend;
      // Preserve independent opacity sliders and crisp text while breathing.
      bodyMaterial.opacity = THREE.MathUtils.clamp(
        ORBIT_SHOP_BUTTON_FACE_OPACITY * (1 + breathing * 0.24 + boost * 0.25), 0, 1);
      edgeMaterial.opacity = THREE.MathUtils.clamp(
        ORBIT_SHOP_BUTTON_EDGE_OPACITY * (1 + breathing * 0.28 + boost * 0.38), 0, 1);
      bodyMaterial.emissiveIntensity = 0.42 * (1 + breathing + boost);
      edgeMaterial.emissiveIntensity = 0.20 * (1 + breathing * 1.3 + boost * 1.5);
      textMaterial.opacity = THREE.MathUtils.clamp(0.90 + 0.10 * pulse + boost * 0.3, 0, 1);
      sweepMaterial.uniforms.uTime.value = phase;
      sweepMaterial.uniforms.uStrength.value = ORBIT_SHOP_BUTTON_SHIMMER_ENABLED && animate
        ? Math.max(0, ORBIT_SHOP_BUTTON_SHIMMER_STRENGTH) * (1 + boost) : 0;
      sweepMaterial.uniforms.uOcclusionCenter.value.copy(occlusionCenter);
      sweepMaterial.uniforms.uOcclusionCamera.value.copy(occlusionCamera);
      sweepMaterial.uniforms.uOcclusionRadius.value = occlusionRadius.value;
      // The curved mesh is in torus-local space: the 0.4x orbit animates it.
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
    let shellHologram;
    let heartShardHologram;
    let orbitShopMesh;
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
      const rect = canvas.getBoundingClientRect();
      if (orbitShopMesh && rect.width > 0 && rect.height > 0) {
        pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
          1 - (event.clientY - rect.top) / rect.height * 2);
        hitTest.setFromCamera(pointer, camera);
        orbitShopMesh.setHover(hitTest);
      }
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

    // The shop link covers the entire visible CorePlanet, not just the
    // lettering on its moving button. Click the sphere, heart, ring or button.
    // Only truly empty background invokes the popup's close callback.
    element.containsPlanetPoint = (x, y) => {
      if (!model) return true;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      pointer.set((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2);
      hitTest.setFromCamera(pointer, camera);
      model.updateMatrixWorld(true);
      const sphere = model.getObjectByName('Sphere');
      const ring = model.getObjectByName('Torus');
      const shop = model.getObjectByName('OrbitShopButton_Real3D');
      // A transparent shader need not write WebGL depth to be clickable.
      // THREE.Raycaster intersects the actual shell geometry directly.
      if (sphere && hitTest.intersectObject(sphere, false).length) return true;
      if (ring && hitTest.intersectObject(ring, false).length) return true;
      if (shop && hitTest.intersectObject(shop, true).length) return true;
      return false;
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

      // Preserve the original heart texture and pulse. The blue/pink outer
      // shell and the pearlescent heart film are two independent layers.
      const globe = model.getObjectByName('Sphere');
      shellHologram = createShellHologram(globe, key, fill);
      // A separate pearlescent shard film follows Heart's existing pulse.
      heartShardHologram = createHeartShardHologram(heart, key, fill);

      // Keep the original SphereSparkle animation pivot, but replace its
      // repeated PNG and geometric star spikes with tiny 3D crystal facets,
      // camera-dependent optical glints and two real moving point lights.
      const sparkleOverlay = model.getObjectByName('SphereSparkle');
      if (sparkleOverlay?.isMesh) {
        sparkleEffect = createPhysicalSparkles(sparkleOverlay, globe, key);
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
      if (viewport && href && ORBIT_SHOP_BUTTON_ENABLED) {
        // Create the ring-wrapped 3D capsule: its tangent, curved surface and
        // minimal tube clearance are all measured from the GLB torus geometry.
        const ring = model.getObjectByName('Torus');
        orbitShopMesh = createOrbitShopMesh(ring, globe, camera);
        orbitShopMesh?.update(0, 0, false);
      }
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
      camera.updateMatrixWorld(); // Use the latest user-controlled view for reflections.
      shellHologram?.update(reducedMotion.matches ? 0 : elapsed, camera);
      heartShardHologram?.update(reducedMotion.matches ? 0 : elapsed, camera);
      sparkleEffect?.update(reducedMotion.matches ? 0 : elapsed, camera);
      orbitShopMesh?.update(elapsed, delta, !reducedMotion.matches);
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
    {viewport && href && ORBIT_SHOP_BUTTON_ENABLED && (
      // Hide the OLD label; the new button lives entirely inside the WebGL
      // scene as solid geometry attached directly to the orbit ring.
      <style>{`.${styles.interactionHint} { display: none !important; }`}</style>
    )}
    {failed && <img className={styles.fallback} src="/images/coreplanet-heart.png" alt="Pink heart planet" />}
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
      // All visible CorePlanet parts open the shop; empty canvas closes the popup.
      // Keyboard activation (event.detail === 0) still follows the link.
      if (!viewport || event.detail === 0) return;
      if (!host.current?.containsPlanetPoint?.(event.clientX, event.clientY)) {
        event.preventDefault();
        event.stopPropagation();
        onBackgroundClick?.();
      }
    }}>{content}</a>;
}
