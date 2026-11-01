import * as THREE from 'three';

// The original 250-frame ring loop at 24 fps is baked at 0.4x speed.
export const ORBIT_LOOP_SECONDS = 250 / 24 / 0.4;

export function createSparkleRotation(nodeName) {
  const times = [];
  const rotations = [];
  // Quarter turns make quaternion interpolation follow a full, constant-speed
  // turn. The last orientation equals the first, with no pause at the seam.
  for (let quarter = 0; quarter <= 4; quarter++) {
    const angle = quarter * Math.PI / 2;
    times.push(ORBIT_LOOP_SECONDS * quarter / 4);
    rotations.push(0, Math.sin(angle / 2), 0, Math.cos(angle / 2));
  }
  return new THREE.AnimationClip('Sparkle / smooth ring-speed loop', ORBIT_LOOP_SECONDS, [
    new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, rotations),
  ]);
}
