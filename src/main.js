import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import React, { useEffect, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";

const app = document.getElementById("app");
let uiRoot = document.getElementById("ui");
if (!uiRoot) {
  uiRoot = document.createElement("div");
  uiRoot.id = "ui";
  uiRoot.className = "panel";
  document.body.appendChild(uiRoot);
}

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

// Equatorial plane helper
function addEquatorialPlane(scene, size = 4, color = 0x88ccee, opacity = 0.35, y = 0) {
  const geom = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2; // rotate to XZ plane (horizontal)
  mesh.position.y = y; // through sphere center by default
  mesh.name = "equator";
  scene.add(mesh);
  return mesh;
}

const equator = addEquatorialPlane(scene, 4, 0x88ccee, 0.35, 0);

// First Point of Aries reference: radial line + marker on equatorial plane
function addFirstPointOfAries(scene, radius = 4.0, y = 0.003, color = 0xffdd33) {
  const group = new THREE.Group();

  const lineMat = new THREE.LineBasicMaterial({ color });
  const linePositions = new Float32Array([0, y, 0, radius, y, 0]);
  const lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const line = new THREE.Line(lineGeom, lineMat);
  line.name = "firstPointLine";
  group.add(line);

  group.name = "firstPointGroup";

  scene.add(group);
  return group;
}

// add the reference to the scene
addFirstPointOfAries(scene, 4.0, 0.003, 0xffdd33);

const grid = new THREE.GridHelper(20, 20, 0x2b3a55, 0x1a2233);
grid.position.y = -1.5;
scene.add(grid);

function buildOrbitPositions(semiMajorAxis, eccentricity, segments) {
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const r =
      (semiMajorAxis * (1 - eccentricity * eccentricity)) /
      (1 + eccentricity * Math.cos(t));
    const x = r * Math.cos(t);
    const z = r * Math.sin(t);
    const y = 0;
    const idx = i * 3;
    pts[idx] = x;
    pts[idx + 1] = y;
    pts[idx + 2] = z;
  }
  return pts;
}

// Create an orbit line at given semi-major axis, eccentricity, and inclination (degrees)
function createOrbit(
  semiMajorAxis = 2,
  eccentricity = 0,
  inclinationDeg = 0,
  segments = 128,
  color = 0xffffff
) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.BufferAttribute(buildOrbitPositions(semiMajorAxis, eccentricity, segments), 3)
  );
  const mat = new THREE.LineBasicMaterial({ color: color });
  const orbitLine = new THREE.LineLoop(geom, mat);
  orbitLine.rotation.x = THREE.MathUtils.degToRad(inclinationDeg);
  orbitLine.position.y = 0.002; // slight offset above equator to avoid z-fighting
  orbitLine.name = `orbit_${semiMajorAxis}_${eccentricity}_${inclinationDeg}`;
  return orbitLine;
}

function updateOrbitLine(line, semiMajorAxis, eccentricity, segments) {
  line.geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(buildOrbitPositions(semiMajorAxis, eccentricity, segments), 3)
  );
  line.geometry.attributes.position.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}

// Create a square orbital plane centered at origin with given side length and inclination
function createOrbitPlane(side = 4, inclinationDeg = 0, color = 0xffffff, opacity = 0.18) {
  const geom = new THREE.PlaneGeometry(side, side);
  const mat = new THREE.MeshStandardMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const plane = new THREE.Mesh(geom, mat);
  // make plane lie in XZ then incline
  plane.rotation.x = -Math.PI / 2 + THREE.MathUtils.degToRad(inclinationDeg);
  plane.position.y = 0.001; // slight offset

  // add an edge outline to make the plane more visible when transparent
  const edges = new THREE.EdgesGeometry(geom);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x223344, linewidth: 1 });
  const edgeLines = new THREE.LineSegments(edges, edgeMat);
  edgeLines.rotation.copy(plane.rotation);
  edgeLines.position.copy(plane.position);

  const group = new THREE.Group();
  group.add(plane);
  group.add(edgeLines);
  group.name = `orbitPlane_${side}_${inclinationDeg}`;
  return group;
}

// Example: add an inclined orbit (elliptical) and separate square orbital plane at 30 degrees
const orbitSemiMajorAxis = 2;
const orbitEccentricity = 0.6;
const orbitInclination = 40;
const orbitRaanDeg = 0;
const orbitSegments = 256;
const orbitPlaneBaseSize = orbitSemiMajorAxis * 2.0;
let currentEccentricity = orbitEccentricity;
let currentSemiMajorAxis = orbitSemiMajorAxis;
let currentRaanDeg = orbitRaanDeg;
const inclinedOrbitLine = createOrbit(
  currentSemiMajorAxis,
  currentEccentricity,
  orbitInclination,
  orbitSegments,
  0x44ff88
);
inclinedOrbitLine.rotation.y = THREE.MathUtils.degToRad(currentRaanDeg);
scene.add(inclinedOrbitLine);
const inclinedOrbitPlane = createOrbitPlane(
  orbitPlaneBaseSize,
  orbitInclination,
  0x44ff88,
  0.12
);
inclinedOrbitPlane.rotation.y = THREE.MathUtils.degToRad(currentRaanDeg);
scene.add(inclinedOrbitPlane);

// Orbiting satellite along the inclined orbit
const satInclinationDeg = orbitInclination;
const satSpeed = 0.9; // radians per second
let satAngle = 0;
const satelliteGeom = new THREE.SphereGeometry(0.06, 12, 10);
const satelliteMat = new THREE.MeshStandardMaterial({ color: 0xff6644, emissive: 0x220000 });
const satellite = new THREE.Mesh(satelliteGeom, satelliteMat);
satellite.name = "satellite";
scene.add(satellite);

function setEccentricity(value) {
  const clamped = Math.min(0.9, Math.max(0, value));
  currentEccentricity = clamped;
  updateOrbitLine(inclinedOrbitLine, currentSemiMajorAxis, currentEccentricity, orbitSegments);
}

function setSemiMajorAxis(value) {
  const clamped = Math.min(6, Math.max(0.5, value));
  currentSemiMajorAxis = clamped;
  updateOrbitLine(inclinedOrbitLine, currentSemiMajorAxis, currentEccentricity, orbitSegments);
  const planeScale = currentSemiMajorAxis / orbitSemiMajorAxis;
  inclinedOrbitPlane.scale.set(planeScale, planeScale, planeScale);
}

function setRaanDeg(value) {
  const normalized = ((value % 360) + 360) % 360;
  currentRaanDeg = normalized;
  const raanRad = THREE.MathUtils.degToRad(currentRaanDeg);
  inclinedOrbitLine.rotation.y = raanRad;
  inclinedOrbitPlane.rotation.y = raanRad;
}

function OrbitControlsPanel({
  initialEcc,
  initialAxis,
  initialRaan,
  onEccChange,
  onAxisChange,
  onRaanChange,
}) {
  const [eccentricity, setEccentricityState] = useState(initialEcc);
  const [semiMajorAxis, setSemiMajorAxisState] = useState(initialAxis);
  const [raanDeg, setRaanDegState] = useState(initialRaan);

  useEffect(() => {
    onEccChange(eccentricity);
  }, [eccentricity, onEccChange]);

  useEffect(() => {
    onAxisChange(semiMajorAxis);
  }, [semiMajorAxis, onAxisChange]);

  useEffect(() => {
    onRaanChange(raanDeg);
  }, [raanDeg, onRaanChange]);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "label",
      { htmlFor: "eccentricity" },
      "Eccentricity",
      React.createElement("span", null, eccentricity.toFixed(2))
    ),
    React.createElement("input", {
      id: "eccentricity",
      type: "range",
      min: 0,
      max: 0.9,
      step: 0.01,
      value: eccentricity,
      onChange: (event) => setEccentricityState(parseFloat(event.target.value)),
    }),
    React.createElement(
      "label",
      { htmlFor: "semiMajorAxis" },
      "Semi-Major Axis",
      React.createElement("span", null, semiMajorAxis.toFixed(2))
    ),
    React.createElement("input", {
      id: "semiMajorAxis",
      type: "range",
      min: 0.5,
      max: 6,
      step: 0.05,
      value: semiMajorAxis,
      onChange: (event) => setSemiMajorAxisState(parseFloat(event.target.value)),
    })
    ,
    React.createElement(
      "label",
      { htmlFor: "raan" },
      "RAAN (deg)",
      React.createElement("span", null, raanDeg.toFixed(0))
    ),
    React.createElement("input", {
      id: "raan",
      type: "range",
      min: 0,
      max: 360,
      step: 1,
      value: raanDeg,
      onChange: (event) => setRaanDegState(parseFloat(event.target.value)),
    })
  );
}

if (uiRoot) {
  const root = createRoot(uiRoot);
  root.render(
    React.createElement(OrbitControlsPanel, {
      initialEcc: currentEccentricity,
      initialAxis: currentSemiMajorAxis,
      initialRaan: currentRaanDeg,
      onEccChange: setEccentricity,
      onAxisChange: setSemiMajorAxis,
      onRaanChange: setRaanDeg,
    })
  );
}

// clock for consistent motion
const clock = new THREE.Clock();

const onResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
window.addEventListener("resize", onResize);

const animate = () => {
  const dt = clock.getDelta();

  // update satellite angle and position
  satAngle += satSpeed * dt;
  const sr =
    (currentSemiMajorAxis * (1 - currentEccentricity * currentEccentricity)) /
    (1 + currentEccentricity * Math.cos(satAngle));
  const sx = sr * Math.cos(satAngle);
  const sz = sr * Math.sin(satAngle);
  const spos = new THREE.Vector3(sx, 0, sz);
  // apply RAAN rotation about Y, then inclination rotation about X axis
  spos.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(currentRaanDeg));
  spos.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(satInclinationDeg));
  // slight offset in Y to avoid z-fighting with orbit plane
  satellite.position.copy(spos).add(new THREE.Vector3(0, 0.005, 0));

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();
