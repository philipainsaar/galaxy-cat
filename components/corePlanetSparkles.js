import * as THREE from 'three';

// The PNG supplies all sparkle colors, shapes, halos and transparency.
// Repeat controls size; brightness boosts its RGB without changing its alpha.
export function createSparkleMaterial(texture) {
  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    texture.needsUpdate = true;
  }
  return new THREE.MeshBasicMaterial({
    name: 'PNG sparkle / 5x UV / luminous',
    map: texture,
    color: new THREE.Color().setRGB(3, 3, 3),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });
}
