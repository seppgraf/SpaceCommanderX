const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let keys = {};
let lasers = [];
let rockets = [];
let asteroids = [];
let ship, score, playing;

const WIDTH = 800, HEIGHT = 600;
const SHIP_SIZE = 36, ASTEROID_SIZE = 48;
const LASER_SPEED = 12, ROCKET_SPEED = 6;
const ASTEROID_NUM = 6;

// --- Hintergrund: Stars und Moon ---
const NUM_STARS = 60;
let stars = [];
let moonImage = new Image();
moonImage.src = "https://upload.wikimedia.org/wikipedia/commons/9/99/FullMoon2010.jpg"; // CC0 NASA

function initStars() {
  stars = [];
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      r: 0.6 + Math.random() * 1.2,
      speed: 0.15 + Math.random() * 0.4
    });
  }
}

// --- Hintergrund: Sterne und Mond ---
function drawBackgroundWithStars() {
  let grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, "#0a0c1c");
  grad.addColorStop(1, "#18203a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let s of stars) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI);
    ctx.globalAlpha = 0.7 + Math.sin(performance.now()/600 + s.x) * 0.15;
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 6 * s.r;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}

function drawMoon() {
  let moonW = 120, moonH = 120;
  let moonX = 60, moonY = HEIGHT - moonH/2 - 24;
  if (moonImage.complete && moonImage.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonW/2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(moonImage, moonX - moonW/2, moonY - moonH/2, moonW, moonH);
    ctx.restore();

    let moonGrad = ctx.createRadialGradient(moonX, moonY, moonW/2-10, moonX, moonY, moonW/2+25);
    moonGrad.addColorStop(0, "rgba(255,255,255,0.08)");
    moonGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonW/2+25, 0, 2*Math.PI);
    ctx.fillStyle = moonGrad;
    ctx.fill();
  }
}

// Asteroid Speed Control
let asteroidBaseSpeed = 2;
let asteroidSpeedMultiplier = 1;
const asteroidSpeedRange = document.getElementById('asteroidSpeedRange');
const asteroidSpeedValue = document.getElementById('asteroidSpeedValue');
function updateAsteroidSpeedValueDisplay() {
  asteroidSpeedValue.textContent = (asteroidBaseSpeed * asteroidSpeedMultiplier).toFixed(1);
}
if (asteroidSpeedRange) {
  asteroidSpeedRange.addEventListener('input', function() {
    asteroidSpeedMultiplier = Number(asteroidSpeedRange.value) / asteroidBaseSpeed;
    updateAsteroidSpeedValueDisplay();
    asteroids.forEach(a => a.updateSpeed());
  });
}
asteroidSpeedMultiplier = Number(asteroidSpeedRange?.value || 2) / asteroidBaseSpeed;
updateAsteroidSpeedValueDisplay();

// Multi-Rocket Timer
let lastMultiRocketTime = 0;
const multiRocketCooldown = 10000;
let rocketOnScreen = false;

// --- Game Objects ---
class Ship {
  constructor() {
    this.x = WIDTH/2;
    this.y = HEIGHT/2;
    this.angle = 0;
    this.flame = 0;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle * Math.PI/180);
    ctx.beginPath();
    ctx.moveTo(22,0);
    ctx.bezierCurveTo(10, 16, -19, 13, -15, 0);
    ctx.bezierCurveTo(-19, -13, 10, -16, 22, 0);
    ctx.closePath();
    ctx.fillStyle = '#fff8db';
    ctx.strokeStyle = '#3a2a00';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "#fe0";
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(8, 0, 7, 10, 0, 0, Math.PI*2);
    ctx.fillStyle = "#88d8ff";
    ctx.globalAlpha = 0.81;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = "#1a5280";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5,-14);
    ctx.lineTo(-22,-22);
    ctx.lineTo(-11,0);
    ctx.lineTo(-22,22);
    ctx.lineTo(-5,13);
    ctx.strokeStyle = "#a34";
    ctx.lineWidth = 4;
    ctx.stroke();
    if(keys['ArrowUp'] && Math.random()<0.9) {
      ctx.save();
      ctx.translate(-18, 0);
      ctx.rotate(Math.PI/10*(Math.random()-0.5));
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-15, 3*(Math.random()-0.5), -20-Math.random()*8, 0);
      ctx.quadraticCurveTo(-15, 3*(Math.random()-0.5), -6, 0);
      ctx.closePath();
      ctx.fillStyle = "#fffb";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-10, 2*(Math.random()-0.5), -14-Math.random()*5, 0);
      ctx.quadraticCurveTo(-10, 2*(Math.random()-0.5), -6, 0);
      ctx.closePath();
      ctx.fillStyle = "#ff9c2a";
      ctx.globalAlpha = 0.8+0.2*Math.random();
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
    ctx.restore();
  }
  update() {
    if(keys['ArrowLeft']) this.angle -= 4;
    if(keys['ArrowRight']) this.angle += 4;
    if(keys['ArrowUp']) {
      this.x += 7 * Math.cos(this.angle * Math.PI/180);
      this.y += 7 * Math.sin(this.angle * Math.PI/180);
    }
    if(keys['ArrowDown']) {
      this.x -= 4 * Math.cos(this.angle * Math.PI/180);
      this.y -= 4 * Math.sin(this.angle * Math.PI/180);
    }
    if(this.x < 0) this.x += WIDTH;
    if(this.x > WIDTH) this.x -= WIDTH;
    if(this.y < 0) this.y += HEIGHT;
    if(this.y > HEIGHT) this.y -= HEIGHT;
  }
}

class Laser {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.active = true;
  }
  update() {
    this.x += LASER_SPEED * Math.cos(this.angle * Math.PI/180);
    this.y += LASER_SPEED * Math.sin(this.angle * Math.PI/180);
    if(this.x < 0 || this.x > WIDTH || this.y < 0 || this.y > HEIGHT)
      this.active = false;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, 2*Math.PI);
    ctx.fillStyle = '#7cffae';
    ctx.fill();
  }
}

class Rocket {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.active = true;
    this.trail = [];
    this.manualFired = false;
  }
  update() {
    this.trail.push([this.x, this.y]);
    if(this.trail.length > 14) this.trail.shift();
    this.x += ROCKET_SPEED * Math.cos(this.angle * Math.PI/180);
    this.y += ROCKET_SPEED * Math.sin(this.angle * Math.PI/180);
    if(this.x < 0 || this.x > WIDTH || this.y < 0 || this.y > HEIGHT)
      this.active = false;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle * Math.PI/180);
    for(let i=0; i<this.trail.length; i++){
      ctx.save();
      ctx.globalAlpha = (i/this.trail.length)*0.7;
      ctx.beginPath();
      ctx.arc(-12-i*2, (Math.random()-0.5)*2, 4, 0, 2*Math.PI);
      ctx.fillStyle = `#ffb347`;
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI*2);
    ctx.fillStyle = "#f6e3d3";
    ctx.strokeStyle = "#c95d2a";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ffb347";
    ctx.shadowBlur = 7;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(13,0);
    ctx.lineTo(20,0);
    ctx.lineTo(11,-5);
    ctx.lineTo(11,5);
    ctx.closePath();
    ctx.fillStyle = "#b9eaff";
    ctx.fill();
    ctx.strokeStyle = "#388";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8,6);
    ctx.lineTo(-15,12);
    ctx.lineTo(-6,2);
    ctx.closePath();
    ctx.fillStyle = "#fa8";
    ctx.strokeStyle = "#b62";
    ctx.stroke();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8,-6);
    ctx.lineTo(-15,-12);
    ctx.lineTo(-6,-2);
    ctx.closePath();
    ctx.fillStyle = "#fa8";
    ctx.strokeStyle = "#b62";
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}

// --- Comic Style Asteroid ---
class Asteroid {
  constructor() {
    this.x = Math.random() * WIDTH;
    this.y = Math.random() * HEIGHT;
    this.angle = Math.random() * 360;
    this.baseSpeed = asteroidBaseSpeed + Math.random() * 2;
    this.speed = this.baseSpeed * asteroidSpeedMultiplier;
    this.active = true;
    this.exploding = false;
    this.explodeTime = 0;
    this.size = 36 + Math.random() * 44;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 1;
    this.points = this.generateComicOutline();
    this.color = this.randomComicColor();
    this.outlineColor = "#222";
    this.shadowColor = "#ecd85f";
  }

  generateComicOutline() {
    const points = [];
    const verts = 9 + Math.floor(Math.random() * 3);
    const r = this.size / 2;
    for (let i = 0; i < verts; i++) {
      const angle = (Math.PI * 2 * i) / verts;
      const mag = r * (0.75 + Math.random() * 0.5);
      points.push({
        x: Math.cos(angle) * mag,
        y: Math.sin(angle) * mag,
      });
    }
    return points;
  }

  randomComicColor() {
    const colors = [
      "#e6c363", // yellow-orange
      "#b7d5e5", // light blue
      "#d188c6", // pink-purple
      "#d5e5b7", // pale green
      "#f9bb7c", // orange
      "#f6e6b7", // beige
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  updateSpeed() {
    this.speed = this.baseSpeed * asteroidSpeedMultiplier;
  }
  update() {
    if (!this.exploding) {
      this.x += this.speed * Math.cos(this.angle * Math.PI / 180);
      this.y += this.speed * Math.sin(this.angle * Math.PI / 180);
      this.rotation += this.rotationSpeed;
      if (this.x < 0) this.x += WIDTH;
      if (this.x > WIDTH) this.x -= WIDTH;
      if (this.y < 0) this.y += HEIGHT;
      if (this.y > HEIGHT) this.y -= HEIGHT;
    } else {
      this.explodeTime++;
      if (this.explodeTime > 18) this.active = false;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    if (!this.exploding) {
      // Draw shadow for comic look
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.translate(8, 6);
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let p of this.points) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fillStyle = this.shadowColor;
      ctx.fill();
      ctx.restore();

      // Draw asteroid body
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let p of this.points) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fillStyle = this.color;
      ctx.shadowColor = "#222";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = this.outlineColor;
      ctx.stroke();
      ctx.restore();

      // Draw comic dots ("craters")
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = (this.size / 2.7) * Math.random();
        ctx.save();
        ctx.translate(
          Math.cos(angle) * dist,
          Math.sin(angle) * dist
        );
        ctx.beginPath();
        ctx.arc(0, 0, 2.3 + Math.random() * 3, 0, 2 * Math.PI);
        ctx.fillStyle = "#fff8";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#eee";
        ctx.stroke();
        ctx.restore();
      }

      // Draw a couple of black "crater" lines
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = (this.size / 3) * Math.random();
        ctx.save();
        ctx.translate(
          Math.cos(angle) * dist,
          Math.sin(angle) * dist
        );
        ctx.rotate(Math.random() * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.quadraticCurveTo(0, -2, 3, 0);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "#222";
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2 + this.explodeTime * 2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ff5050';
      ctx.lineWidth = 5;
      ctx.globalAlpha = 1.2 - this.explodeTime / 18;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
  }

  hit() {
    this.exploding = true;
    this.explodeTime = 0;
  }
}

// --- Utility ---
function collide(obj1, obj2, r) {
  let dx = obj1.x - obj2.x, dy = obj1.y - obj2.y;
  return dx*dx + dy*dy < r*r;
}

// --- Game Loop ---
function gameLoop() {
  if(!playing) return;

  drawBackgroundWithStars();

  for (let s of stars) {
    s.x += s.speed;
    if (s.x > WIDTH+4) s.x = -4;
  }

  drawMoon();

  ship.update();
  lasers.forEach(l=>l.update());
  rockets.forEach(r=>r.update());
  asteroids.forEach(a=>a.update());

  asteroids.forEach(a=>{
    if(a.active && !a.exploding){
      lasers.forEach(l=>{
        if(l.active && collide(a,l,a.size/2)){
          a.hit(); l.active=false; score+=10;
        }
      });
      rockets.forEach(r=>{
        if(r.active && collide(a,r,a.size/2+12)){
          a.hit(); r.active=false; score+=30;
        }
      });
      if(collide(a,ship,a.size/2+SHIP_SIZE/3)){
        endGame();
      }
    }
  });
  lasers = lasers.filter(l=>l.active);
  rockets = rockets.filter(r=>r.active);
  asteroids = asteroids.filter(a=>a.active);

  rocketOnScreen = rockets.some(r => r.manualFired);

  while(asteroids.length < ASTEROID_NUM)
    asteroids.push(new Asteroid());

  ship.draw();
  lasers.forEach(l=>l.draw());
  rockets.forEach(r=>r.draw());
  asteroids.forEach(a=>a.draw());

  document.getElementById('scoreDisplay').textContent = 'Punkte: ' + score;

  requestAnimationFrame(gameLoop);
}

function fireMultiRockets() {
  let now = performance.now();
  if (now - lastMultiRocketTime < multiRocketCooldown) {
    return;
  }
  lastMultiRocketTime = now;
  let baseAngle = ship.angle;
  for(let i=0; i<10; i++) {
    let angle = baseAngle + (i * 36);
    let rx = ship.x + SHIP_SIZE*Math.cos(angle * Math.PI/180);
    let ry = ship.y + SHIP_SIZE*Math.sin(angle * Math.PI/180);
    let rocket = new Rocket(rx, ry, angle);
    rocket.manualFired = false;
    rockets.push(rocket);
  }
}

function startGame() {
  document.getElementById('startscreen').style.display = 'none';
  document.getElementById('scoreDisplay').style.display = '';
  document.getElementById('asteroidSpeedControl').style.display = '';
  document.getElementById('gameover').style.display = 'none';
  ship = new Ship();
  lasers = [];
  rockets = [];
  asteroids = [];
  for(let i=0;i<ASTEROID_NUM;i++) asteroids.push(new Asteroid());
  score = 0;
  playing = true;
  lastMultiRocketTime = performance.now() - multiRocketCooldown;
  rocketOnScreen = false;
  initStars();
  gameLoop();
}
function endGame() {
  playing = false;
  setTimeout(() => {
    document.getElementById('gameover').style.display = '';
    document.getElementById('finalScore').textContent = "Punkte: "+score;
    document.getElementById('scoreDisplay').style.display = 'none';
    document.getElementById('asteroidSpeedControl').style.display = 'none';
  }, 600);
}
function restartGame() {
  startGame();
}
window.addEventListener('keydown', e=>{
  if(!playing) return;
  keys[e.key] = true;
  if(e.key === " "){
    let lx = ship.x + SHIP_SIZE*Math.cos(ship.angle*Math.PI/180);
    let ly = ship.y + SHIP_SIZE*Math.sin(ship.angle*Math.PI/180);
    lasers.push(new Laser(lx,ly,ship.angle));
    e.preventDefault();
  }
  if((e.key === "m" || e.key === "M")){
    if(!rocketOnScreen) {
      let rx = ship.x + SHIP_SIZE*Math.cos(ship.angle*Math.PI/180);
      let ry = ship.y + SHIP_SIZE*Math.sin(ship.angle*Math.PI/180);
      let rocket = new Rocket(rx,ry,ship.angle);
      rocket.manualFired = true;
      rockets.push(rocket);
      rocketOnScreen = true;
    }
    e.preventDefault();
  }
  if((e.key === "n" || e.key === "N")) {
    fireMultiRockets();
    e.preventDefault();
  }
});
window.addEventListener('keyup', e=>{
  keys[e.key] = false;
});
window.addEventListener('keydown', function(e){
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","n","N","m","M"].includes(e.key))
    e.preventDefault();
}, false);
window.onload = ()=>{
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.font = "32px Arial";
  ctx.textAlign="center";
  ctx.fillText("Willkommen bei Spacecommander!", WIDTH/2, HEIGHT/2-40);
  ctx.font = "20px Arial";
  ctx.fillText("Drücke 'Start' zum Spielen.", WIDTH/2, HEIGHT/2+10);
  initStars();
  document.getElementById('startBtn').onclick = startGame;
};