import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const app = document.getElementById("app");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.minDistance = 2;
controls.maxDistance = 50;

// Ensure mouse interactions are explicitly mapped:
controls.enableZoom = true;
controls.enableRotate = true;
controls.enablePan = true;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 1.0;
controls.panSpeed = 1.0;
controls.screenSpacePanning = false;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};
controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
};

// Prevent the context menu so right-click + drag can pan smoothly
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(5, 8, 5);
scene.add(directionalLight);

const earthGeometry = new THREE.SphereGeometry(1, 48, 48);
const earthMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a6df4,
  roughness: 0.75,
  metalness: 0.05,
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// Equatorial plane through the middle of the earth
const equatorGeometry = new THREE.PlaneGeometry(4, 4);
const equatorMaterial = new THREE.MeshStandardMaterial({
  color: 0x88ccee,
  transparent: true,
  opacity: 0.35,
  side: THREE.DoubleSide,
});
const equator = new THREE.Mesh(equatorGeometry, equatorMaterial);
equator.rotation.x = -Math.PI / 2; // rotate to XZ plane (horizontal)
equator.position.y = 0; // through sphere center
equator.name = "equator";
scene.add(equator);

// First Point of Aries reference: radial line + marker on equatorial plane
const fpaRadius = 4.0;
const fpaY = 0.003; // slight offset above plane to avoid z-fighting
const fpaLineMaterial = new THREE.LineBasicMaterial({ color: 0xffdd33 });
const fpaLinePositions = new Float32Array([0, fpaY, 0, fpaRadius, fpaY, 0]);
const fpaLineGeometry = new THREE.BufferGeometry();
fpaLineGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(fpaLinePositions, 3)
);
const fpaLine = new THREE.Line(fpaLineGeometry, fpaLineMaterial);
fpaLine.name = "firstPointLine";
scene.add(fpaLine);

const grid = new THREE.GridHelper(20, 20, 0x2b3a55, 0x1a2233);
grid.position.y = -1.5;
scene.add(grid);

// Create a circular orbit at given radius and inclination (degrees)
function createOrbit(radius = 2, inclinationDeg = 0, segments = 128, color = 0xffffff) {
  // create line points for circular orbit in XZ plane
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = radius * Math.cos(t);
    const z = radius * Math.sin(t);
    const y = 0;
    const idx = i * 3;
    pts[idx] = x;
    pts[idx + 1] = y;
    pts[idx + 2] = z;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color: color });
  const orbitLine = new THREE.LineLoop(geom, mat);

  // create a transparent orbital plane (filled circle) slightly below/above the line
  const planeGeom = new THREE.CircleGeometry(radius, Math.max(32, segments));
  const planeMat = new THREE.MeshStandardMaterial({
    color: color,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const orbitPlane = new THREE.Mesh(planeGeom, planeMat);
  orbitPlane.rotation.x = -Math.PI / 2; // make circle lie in XZ plane

  // group the plane and line and apply inclination to the group
  const group = new THREE.Group();
  group.add(orbitPlane);
  orbitLine.position.y = 0.002;
  orbitPlane.position.y = 0.001;
  group.add(orbitLine);
  group.rotation.x = THREE.MathUtils.degToRad(inclinationDeg);
  group.name = `orbit_${radius}_${inclinationDeg}`;
  return group;
}

// Example: add an inclined orbit at 30 degrees
const inclinedOrbit = createOrbit(2.2, 30, 256, 0x44ff88);
scene.add(inclinedOrbit);

const onResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
window.addEventListener("resize", onResize);

const animate = () => {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();
