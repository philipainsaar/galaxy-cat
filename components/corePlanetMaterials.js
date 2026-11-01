import * as THREE from 'three';

// Orbit ring ONLY: independent from the sphere's underlying gradient.
const ORBIT_RING_PINK = '#f5cde7';
const ORBIT_RING_WHITE_HIGHLIGHT = 0.18; // 0 = fully pink, 0.18 = soft sheen


// Each instance owns its materials. The original image and UVs stay on Heart.
export function applyCorePlanetMaterials(root) {
const liveSphereMat=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:true,side:THREE.FrontSide,toneMapped:false,
  uniforms:{
    pink:{value:new THREE.Color('#e093c4db')},
    lilac:{value:new THREE.Color('#c69fe898')},
    blue:{value:new THREE.Color('#a1c7ff8d')},
    ice:{value:new THREE.Color('#d9e9ff')}
  },
  vertexShader:`varying vec3 vn;varying vec3 vp;
  void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vp=p.xyz;
  vn=normalize(normalMatrix*normal);gl_Position=projectionMatrix*p;}`,
  fragmentShader:`varying vec3 vn;varying vec3 vp;
  uniform vec3 pink,lilac,blue,ice;
  void main(){
    float facing=clamp(dot(normalize(vn),normalize(-vp)),0.0,1.0);
    vec3 c=mix(pink,lilac,smoothstep(0.10,0.40,facing));
    c=mix(c,blue,smoothstep(0.38,0.66,facing));
    c=mix(c,ice,smoothstep(0.65,0.93,facing));
    float alpha=mix(1.0,0.16,smoothstep(0.38,0.90,facing));
    gl_FragColor=vec4(c,alpha);
    #include <colorspace_fragment>
  }`
});
// Two per-fragment ring passes: behind the shell, then in front.
// This avoids object-level transparent sorting errors where ring and shell cross.
function ringMaterial(frontPass){
 return new THREE.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,side:THREE.FrontSide,
 uniforms:{pink:{value:new THREE.Color(ORBIT_RING_PINK)},center:{value:new THREE.Vector3()},radius:{value:3.854954},frontPass:{value:frontPass}},
 vertexShader:liveSphereMat.vertexShader,
 fragmentShader:`varying vec3 vn;varying vec3 vp;uniform vec3 pink,center;uniform float radius;uniform bool frontPass;
 void main(){
   vec3 ray=normalize(vp);float along=dot(ray,center);
   float discriminant=along*along-dot(center,center)+radius*radius;
   bool behind=false;
   if(discriminant>0.0){float entry=along-sqrt(discriminant);behind=entry>0.0 && length(vp)>entry+0.001;}
   if(frontPass==behind)discard;
   float facing=clamp(dot(normalize(vn),normalize(-vp)),0.0,1.0);
   vec3 color=mix(pink,vec3(1.0),${ORBIT_RING_WHITE_HIGHLIGHT.toFixed(2)}*pow(facing,7.0));
   float alpha=mix(0.20,0.72,smoothstep(0.05,0.85,facing));
   gl_FragColor=vec4(color,alpha);
   #include <colorspace_fragment>
 }`});
}

  const globe=root.getObjectByName('Sphere');
  const ring=root.getObjectByName('Torus');
  if (!globe || !ring) throw new Error('CorePlanet is missing its shell or orbit.');
  globe.material.dispose();
  ring.material.dispose();
  globe.material=liveSphereMat;
  globe.renderOrder=10;
  ring.material=ringMaterial(false);
  ring.renderOrder=5;
  const front=new THREE.Mesh(ring.geometry,ringMaterial(true));
  front.name='OrbitFrontPass';front.renderOrder=15;ring.add(front);
  globe.geometry.computeBoundingSphere();
  const localRadius=globe.geometry.boundingSphere.radius;
  const worldScale=new THREE.Vector3();
  // Use the active render camera and world scale, including parent transforms.
  for (const part of [ring,front]) part.onBeforeRender=(_renderer,_scene,camera)=>{
    globe.getWorldPosition(part.material.uniforms.center.value);
    part.material.uniforms.center.value.applyMatrix4(camera.matrixWorldInverse);
    globe.getWorldScale(worldScale);
    part.material.uniforms.radius.value=localRadius*Math.max(worldScale.x,worldScale.y,worldScale.z);
  };
}
