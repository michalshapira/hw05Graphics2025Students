// Lahav Kaiser - 207766916
// Michal Shapira - 211468400

import { OrbitControls } from "./OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
let basketball;

const keyStates = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  w: false,
  s: false,
};

const moveSpeed = 0.15;
const courtBounds = {
  xMin: -14.5,
  xMax: 14.5,
  zMin: -7,
  zMax: 7,
};

let shotPower = 50;
const minPower = 0;
const maxPower = 100;
const powerStep = 5;

let ballVelocity = new THREE.Vector3(0, 0, 0);
let isBallInMotion = false;
let bounceCount = 0;
const maxBounces = 5;
let rimCenters = [];
let score = 0;
let shotsAttempted = 0;
let shotsMade = 0;
let messageTimer = 0;

renderer.setPixelRatio(window.devicePixelRatio);

// Add resize listener
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x000000);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
directionalLight.target.position.set(0, 0, 0); // court center
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

directionalLight.shadow.camera.left = -40;
directionalLight.shadow.camera.right = 40;
directionalLight.shadow.camera.top = 40;
directionalLight.shadow.camera.bottom = -40;

directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;

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
const rimHeight = 3.05;

function createHoop(xPosition) {
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

  rimCenters.push({
    rimX: rimOffset + xPosition,
    rimY: rimHeight,
    rimZ: 0,
    rimRadius,
  });

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
    net.castShadow = true;
    net.receiveShadow = true;
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
  arm.castShadow = true;
  arm.receiveShadow = true;
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
  basketball = new THREE.Mesh(ballGeometry, ballMaterial);
  basketball.position.set(0, ballRadius + 0.1, 0);
  basketball.castShadow = true;
  basketball.receiveShadow = true;

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
  basketball.add(equatorLine);

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
    basketball.add(verticalLine);
  }

  // Add to scene
  scene.add(basketball);
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

const hoopXPos = 13;
// task 2
createHoop(-hoopXPos); // left hoop
createHoop(hoopXPos); // right hoop

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
document.body.appendChild(scoreContainer);
function updateScoreDisplay() {
  const shootingPercentage =
    shotsAttempted === 0 ? 0 : ((shotsMade / shotsAttempted) * 100).toFixed(1);
  scoreContainer.textContent = `Score: ${score} | Attempts: ${shotsAttempted} | Made: ${shotsMade} | Accuracy: ${shootingPercentage}%`;
}

const messageElement = document.createElement("div");
messageElement.style.position = "absolute";
messageElement.style.top = "100px";
messageElement.style.left = "20px";
messageElement.style.color = "yellow";
messageElement.style.fontSize = "28px";
messageElement.style.fontFamily = "Arial, sans-serif";
messageElement.style.fontWeight = "bold";
document.body.appendChild(messageElement);

function showMessage(msg) {
  messageElement.textContent = msg;
  messageTimer = 60;
}

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
  <p>Arrow Keys - Move ball</p>
  <p>W/S - Increase/Decrease shot power</p>
`;
document.body.appendChild(instructionsElement);

const powerDisplay = document.createElement("div");
powerDisplay.id = "power-display";
powerDisplay.style.position = "absolute";
powerDisplay.style.top = "60px";
powerDisplay.style.left = "20px";
powerDisplay.style.color = "white";
powerDisplay.style.fontSize = "20px";
powerDisplay.style.fontFamily = "Arial, sans-serif";
powerDisplay.textContent = `Shot Power: ${shotPower}%`;
document.body.appendChild(powerDisplay);

function updatePowerDisplay() {
  powerDisplay.textContent = `Shot Power: ${shotPower}%`;
}

function shootBall() {
  const targetX = basketball.position.x < 0 ? -hoopXPos : hoopXPos; // bonus - multiple hoops
  const targetY = rimHeight;
  const targetZ = 0;

  const origin = basketball.position.clone();
  const target = new THREE.Vector3(targetX, targetY, targetZ);

  const direction = new THREE.Vector3().subVectors(target, origin);
  const horizontalDistance = Math.sqrt(direction.x ** 2 + direction.z ** 2);
  const angle = THREE.MathUtils.degToRad(50);

  const speed = 0.7 + (shotPower / 100) * 1.8;

  // Set initial velocity
  ballVelocity.x = (direction.x / horizontalDistance) * Math.cos(angle) * speed;
  ballVelocity.z = (direction.z / horizontalDistance) * Math.cos(angle) * speed;
  ballVelocity.y = Math.sin(angle) * speed;

  isBallInMotion = true;
  shotsAttempted++;
  updateScoreDisplay();
}

// Handle key events
function handleKeyDown(e) {
  if (e.key === "o") {
    isOrbitEnabled = !isOrbitEnabled;
  }

  if (e.key in keyStates) {
    keyStates[e.key] = true;
  }

  if (e.key === "w") {
    shotPower = Math.min(maxPower, shotPower + powerStep);
    updatePowerDisplay();
  } else if (e.key === "s") {
    shotPower = Math.max(minPower, shotPower - powerStep);
    updatePowerDisplay();
  }

  if (e.key === " ") {
    shootBall();
  }
}

function handleKeyUp(e) {
  if (e.key in keyStates) {
    keyStates[e.key] = false;
  }
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

function moveBasketball() {
  if (isBallInMotion) {
    // Score detection (downward motion + center pass)
    if (ballVelocity.y < 0) {
      for (const rim of rimCenters) {
        const dx = basketball.position.x - rim.rimX;
        const dz = basketball.position.z - rim.rimZ;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);

        if (horizontalDist < rim.rimRadius * 0.8) {
          shotsMade++;
          score += 2;
          updateScoreDisplay();
          showMessage("SHOT MADE!");
          isBallInMotion = false;
          ballVelocity.set(0, 0, 0);
          bounceCount = 0;
          break;
        } else {
          showMessage("MISSED SHOT");
        }
      }
    }

    // Apply gravity per frame (for 60 FPS)
    ballVelocity.y += -0.25;

    // Move ball by velocity
    basketball.position.add(ballVelocity);

    // update rotation by speed and velocity
    basketball.rotation.x += ballVelocity.z * 0.1;
    basketball.rotation.z -= ballVelocity.x * 0.1;

    // check for rim collision
    for (const rim of rimCenters) {
      const dx = basketball.position.x - rim.rimX;
      const dy = basketball.position.y - rim.rimY;
      const dz = basketball.position.z - rim.rimZ;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDistance = 0.24 + rim.rimRadius;

      if (distance < minDistance) {
        const normal = new THREE.Vector3(dx, dy, dz).normalize();
        const velocityDot = ballVelocity.dot(normal);
        const reflection = normal.multiplyScalar(2 * velocityDot);
        ballVelocity.sub(reflection).multiplyScalar(0.7); // deflect & dampen

        break; // one collision per frame
      }
    }

    // handle bounce
    const groundY = 0.24 + 0.1;

    if (basketball.position.y < 1 && ballVelocity.y < 0) {
      basketball.position.y = groundY;

      // Add bounce with energy loss
      if (bounceCount < maxBounces) {
        ballVelocity.y *= -0.7; // reverse and reduce vertical speed
        ballVelocity.x *= 0.9; // optional: reduce horizontal drift
        ballVelocity.z *= 0.9;
        bounceCount++;
      } else {
        isBallInMotion = false;
        ballVelocity.set(0, 0, 0);
        bounceCount = 0;
      }
    }
  } else {
    // Only allow movement if ball is NOT in motion
    if (basketball) {
      const delta = new THREE.Vector3();

      if (keyStates.ArrowLeft) delta.x -= moveSpeed;
      if (keyStates.ArrowRight) delta.x += moveSpeed;
      if (keyStates.ArrowUp) delta.z -= moveSpeed;
      if (keyStates.ArrowDown) delta.z += moveSpeed;

      basketball.position.add(delta);

      // within court bounds
      basketball.position.x = Math.max(
        courtBounds.xMin,
        Math.min(courtBounds.xMax, basketball.position.x)
      );
      basketball.position.z = Math.max(
        courtBounds.zMin,
        Math.min(courtBounds.zMax, basketball.position.z)
      );
    }
  }
}

// Animation function
function animate() {
  setTimeout(function () {
    requestAnimationFrame(animate);
  }, 1000 / 40);

  if (messageTimer > 0) {
    messageTimer--;
    if (messageTimer === 0) {
      messageElement.textContent = "";
    }
  }
  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();

  moveBasketball();
  renderer.render(scene, camera);
}

animate();
