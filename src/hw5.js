import { OrbitControls } from "./OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x000000);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi / 180);
}

// task 1
function createCourtLines() {
  const yPos = 0.11;
  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });

  // Center Line (X = 0, full depth of court)
  const centerLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 15),
    lineMaterial
  );
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.set(0, yPos, 0);
  scene.add(centerLine);

  // Center Circle radius 1.8
  const centerCircle = new THREE.Mesh(
    new THREE.RingGeometry(1.75, 1.8, 64),
    lineMaterial
  );
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.set(0, yPos, 0);
  scene.add(centerCircle);

  function createThreePointArc(radius, xCenter, horizontalStretch = 1.2) {
    const points = [];
    const step = 0.02;

    for (let angle = -Math.PI / 2; angle <= Math.PI / 2; angle += step) {
      const x = xCenter + radius * Math.cos(angle) * horizontalStretch;
      const z = radius * Math.sin(angle);
      points.push(new THREE.Vector3(x, yPos, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    return new THREE.Line(geometry, material);
  }

  scene.add(createThreePointArc(6.75, -15)); // left hoop
  scene.add(createThreePointArc(-6.75, 15)); // right hoop
}

// task 2
function createHoop(xPosition) {
  const rimHeight = 3.05;
  const isRight = xPosition > 0;
  const direction = isRight ? -1 : 1;

  const group = new THREE.Group();

  // Backboard
  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.05, 0.05),
    new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
    })
  );
  backboard.rotation.y = Math.PI / 2;
  backboard.position.set(0, 0, 0);
  backboard.castShadow = true;
  backboard.receiveShadow = true;
  group.add(backboard);

  // Rim (slightly in front of backboard)
  const rimRadius = 0.45;
  const rimOffset = direction * 0.5; // 0.5m in front of center (just beyond backboard)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(rimRadius, 0.03, 16, 100),
    new THREE.MeshPhongMaterial({ color: 0xff6600 })
  );
  rim.position.set(rimOffset, 0, 0);
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  rim.receiveShadow = true;
  group.add(rim);

  // Net (attached to rim)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * 2 * Math.PI;
    const x = Math.cos(angle) * rimRadius;
    const z = Math.sin(angle) * rimRadius;

    const top = new THREE.Vector3(rimOffset + x, 0, z);
    const bottom = new THREE.Vector3(rimOffset + x * 0.5, -0.5, z * 0.5);
    const netGeom = new THREE.BufferGeometry().setFromPoints([top, bottom]);
    const net = new THREE.Line(
      netGeom,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    group.add(net);
  }

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 3.2, 16),
    new THREE.MeshPhongMaterial({ color: 0x444444 })
  );
  pole.position.set(-1 * direction, -1.6, 0);
  pole.castShadow = true;
  pole.receiveShadow = true;
  group.add(pole);

  // Arm (connects pole to backboard)
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.05, 0.05),
    new THREE.MeshPhongMaterial({ color: 0x444444 })
  );
  arm.position.set(-0.5 * direction, 0, 0); // from pole to backboard
  group.add(arm);

  // Final position
  group.position.set(xPosition, rimHeight, 0);
  scene.add(group);
}

//task 3
function createBasketball() {
  const ballRadius = 0.24;
  const seamLift = 0.001; // how far the seams float above the surface

  // Basketball mesh
  const ballGeometry = new THREE.SphereGeometry(ballRadius, 64, 64);
  const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xff8c00 });
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.position.set(0, ballRadius + 0.1, 0);
  ball.castShadow = true;
  ball.receiveShadow = true;

  // Horizontal seam (equator)
  const equatorPoints = [];
  for (let a = 0; a <= Math.PI * 2; a += 0.05) {
    const x = Math.cos(a) * (ballRadius + seamLift);
    const z = Math.sin(a) * (ballRadius + seamLift);
    equatorPoints.push(new THREE.Vector3(x, 0, z));
  }

  const equatorGeometry = new THREE.BufferGeometry().setFromPoints(
    equatorPoints
  );
  const equatorLine = new THREE.Line(
    equatorGeometry,
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
  ball.add(equatorLine);

  // 8 vertical seams
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const verticalPoints = [];

    for (let a = -Math.PI / 2; a <= Math.PI / 2; a += 0.05) {
      const y = Math.sin(a) * (ballRadius + seamLift);
      const r = Math.cos(a) * (ballRadius + seamLift);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      verticalPoints.push(new THREE.Vector3(x, y, z));
    }

    const verticalGeom = new THREE.BufferGeometry().setFromPoints(
      verticalPoints
    );
    const verticalLine = new THREE.Line(
      verticalGeom,
      new THREE.LineBasicMaterial({ color: 0x000000 })
    );
    ball.add(verticalLine);
  }

  // Add to scene
  scene.add(ball);
}

// Create basketball court
function createBasketballCourt() {
  // Court floor - just a simple brown surface
  const courtGeometry = new THREE.BoxGeometry(30, 0.2, 15);
  const courtMaterial = new THREE.MeshPhongMaterial({
    color: 0xc68642, // Brown wood color
    shininess: 50,
  });
  const court = new THREE.Mesh(courtGeometry, courtMaterial);
  court.receiveShadow = true;
  scene.add(court);

  createCourtLines();

  // Note: All court lines, hoops, and other elements have been removed
  // Students will need to implement these features
}

// Create all elements
createBasketballCourt(); //task 1

// task 2
createHoop(-13); // left hoop
createHoop(13); // right hoop

createBasketball(); //task 3

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Container for future score display
const scoreContainer = document.createElement("div");
scoreContainer.id = "score-container";
scoreContainer.style.position = "absolute";
scoreContainer.style.top = "20px";
scoreContainer.style.left = "20px";
scoreContainer.style.color = "white";
scoreContainer.style.fontSize = "24px";
scoreContainer.style.fontFamily = "Arial, sans-serif";
scoreContainer.textContent = "Score: --";
document.body.appendChild(scoreContainer);

// Instructions display
const instructionsElement = document.createElement("div");
instructionsElement.style.position = "absolute";
instructionsElement.style.bottom = "20px";
instructionsElement.style.left = "20px";
instructionsElement.style.color = "white";
instructionsElement.style.fontSize = "16px";
instructionsElement.style.fontFamily = "Arial, sans-serif";
instructionsElement.style.textAlign = "left";
instructionsElement.innerHTML = `
  <h3>Controls:</h3>
  <p>O - Toggle orbit camera</p>
`;
document.body.appendChild(instructionsElement);

// Handle key events
function handleKeyDown(e) {
  if (e.key === "o") {
    isOrbitEnabled = !isOrbitEnabled;
  }
}

document.addEventListener("keydown", handleKeyDown);

// Animation function
function animate() {
  requestAnimationFrame(animate);

  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();

  renderer.render(scene, camera);
}

animate();
