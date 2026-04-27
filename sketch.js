let video;
let handPose;
let hands = [];
let smoothHands = [];

let startButton;
let cameraStarted = false;

let videoX = 0;
let videoY = 0;
let displayW = 0;
let displayH = 0;

let bubbles = [];

const fingerGroups = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20]
];

const tipIndices = [4, 8, 12, 16, 20];

function preload() {
  // 不使用 flipped:true，避免節點左右判斷混亂
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("sans-serif");
  textAlign(CENTER, CENTER);

  startButton = createButton("啟動攝影機");
  startButton.style("font-size", "20px");
  startButton.style("padding", "12px 24px");
  startButton.style("border-radius", "12px");
  startButton.style("border", "none");
  startButton.style("background", "#ffffff");
  startButton.style("cursor", "pointer");
  startButton.mousePressed(startCamera);

  updateButtonPosition();
}

function startCamera() {
  video = createCapture(
    {
      video: {
        facingMode: "user"
      },
      audio: false
    },
    () => {
      console.log("攝影機已啟動");
    }
  );

  // 手機上比較穩定
  video.elt.setAttribute("playsinline", "");
  video.elt.muted = true;

  // 設定基礎尺寸，實際顯示時仍會依原始比例縮放
  video.size(640, 480);
  video.hide();

  handPose.detectStart(video, gotHands);

  cameraStarted = true;
  startButton.hide();
}

function gotHands(results) {
  hands = results;
}

function draw() {
  background("#C4E1FF");

  if (!cameraStarted || !video || !video.elt || !video.elt.videoWidth) {
    drawCenterTitle();
    drawStartHint();
    return;
  }

  calculateVideoDisplaySize();
  updateSmoothHands();

  drawMirroredVideo();
  spawnBubblesFromTips();
  updateAndDrawBubbles();
  drawHands();
  drawTopTitle();
}

function drawCenterTitle() {
  push();
  fill(40, 40, 40, 180);
  noStroke();
  textStyle(BOLD);
  textSize(min(width, height) * 0.05);
  text("414736529王家興", width / 2, height / 2 - 50);
  pop();
}

function drawStartHint() {
  push();
  fill(60, 60, 60, 170);
  noStroke();
  textStyle(NORMAL);
  textSize(20);
  text("請點擊按鈕啟動攝影機", width / 2, height / 2 + 20);
  pop();
}

function drawTopTitle() {
  // 啟動後移到上方中間，且避免壓到鏡頭
  let titleY = constrain(videoY * 0.45, 35, 70);

  push();
  fill(40, 40, 40, 190);
  noStroke();
  textStyle(BOLD);
  textSize(min(width, height) * 0.032);
  text("414736529王家興", width / 2, titleY);
  pop();
}

function calculateVideoDisplaySize() {
  let maxW = width * 0.6;
  let maxH = height * 0.6;

  let sourceW = video.elt.videoWidth;
  let sourceH = video.elt.videoHeight;

  let scaleFactor = min(maxW / sourceW, maxH / sourceH);

  displayW = sourceW * scaleFactor;
  displayH = sourceH * scaleFactor;

  videoX = (width - displayW) / 2;
  videoY = (height - displayH) / 2;
}

function drawMirroredVideo() {
  push();
  translate(videoX + displayW, videoY);
  scale(-1, 1);
  image(video, 0, 0, displayW, displayH);
  pop();
}

function updateSmoothHands() {
  if (hands.length === 0) {
    smoothHands = [];
    return;
  }

  let newSmoothHands = [];

  for (let h = 0; h < hands.length; h++) {
    let hand = hands[h];
    let prevHand = smoothHands[h];

    let smoothed = {
      handedness: hand.handedness,
      confidence: hand.confidence,
      keypoints: []
    };

    for (let i = 0; i < hand.keypoints.length; i++) {
      let kp = hand.keypoints[i];
      let prev = prevHand && prevHand.keypoints[i];

      let smoothX = prev ? lerp(prev.x, kp.x, 0.35) : kp.x;
      let smoothY = prev ? lerp(prev.y, kp.y, 0.35) : kp.y;

      smoothed.keypoints.push({
        x: smoothX,
        y: smoothY
      });
    }

    newSmoothHands.push(smoothed);
  }

  smoothHands = newSmoothHands;
}

function drawHands() {
  if (smoothHands.length === 0) return;

  for (let hand of smoothHands) {
    if (hand.confidence < 0.1) continue;

    // 顏色區分左右手（這裡是依模型判定）
    if (hand.handedness === "Left") {
      stroke(255, 0, 255);
      fill(255, 0, 255);
    } else {
      stroke(255, 255, 0);
      fill(255, 255, 0);
    }

    strokeWeight(4);

    // 畫手指線條
    for (let group of fingerGroups) {
      for (let i = 0; i < group.length - 1; i++) {
        let p1 = mapKeypointToCanvas(hand.keypoints[group[i]]);
        let p2 = mapKeypointToCanvas(hand.keypoints[group[i + 1]]);
        line(p1.x, p1.y, p2.x, p2.y);
      }
    }

    // 畫節點
    noStroke();
    for (let i = 0; i < hand.keypoints.length; i++) {
      let p = mapKeypointToCanvas(hand.keypoints[i]);
      circle(p.x, p.y, 12);
    }
  }
}

function mapKeypointToCanvas(kp) {
  let sourceW = video.elt.videoWidth;
  let sourceH = video.elt.videoHeight;

  let scaleX = displayW / sourceW;
  let scaleY = displayH / sourceH;

  // 因為畫面是鏡像顯示，所以 X 座標要同步鏡像
  let x = videoX + (sourceW - kp.x) * scaleX;
  let y = videoY + kp.y * scaleY;

  return { x, y };
}

function spawnBubblesFromTips() {
  if (smoothHands.length === 0) return;

  // 控制生成頻率，避免太多
  if (frameCount % 8 !== 0) return;

  for (let hand of smoothHands) {
    if (hand.confidence < 0.1) continue;

    for (let tipIndex of tipIndices) {
      let tip = hand.keypoints[tipIndex];
      let p = mapKeypointToCanvas(tip);

      bubbles.push({
        x: p.x + random(-3, 3),
        y: p.y + random(-3, 3),
        size: random(12, 24),
        vx: random(-0.4, 0.4),
        vy: random(-2.0, -0.8),
        alpha: 180,
        life: 0,
        maxLife: int(random(35, 85)),
        popped: false,
        popFrame: 0
      });
    }
  }

  // 控制水泡總量
  if (bubbles.length > 180) {
    bubbles.splice(0, bubbles.length - 180);
  }
}

function updateAndDrawBubbles() {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];

    if (!b.popped) {
      b.life++;
      b.x += b.vx + sin(frameCount * 0.05 + i) * 0.15;
      b.y += b.vy;
      b.alpha -= 1.2;

      // 適當位置破掉
      if (
        b.life > b.maxLife ||
        b.y < videoY - 15 ||
        b.alpha <= 20
      ) {
        b.popped = true;
      }

      drawBubble(b);
    } else {
      b.popFrame++;
      drawBubblePop(b);

      if (b.popFrame > 8) {
        bubbles.splice(i, 1);
      }
    }
  }
}

function drawBubble(b) {
  push();
  noFill();
  stroke(255, 255, 255, b.alpha);
  strokeWeight(2);
  circle(b.x, b.y, b.size);

  // 水泡高光
  noStroke();
  fill(255, 255, 255, b.alpha * 0.7);
  circle(b.x - b.size * 0.18, b.y - b.size * 0.18, b.size * 0.18);
  pop();
}

function drawBubblePop(b) {
  push();
  noFill();
  stroke(255, 255, 255, 160 - b.popFrame * 18);
  strokeWeight(2);

  let popSize = b.size + b.popFrame * 4;
  circle(b.x, b.y, popSize);

  // 小破裂線
  for (let a = 0; a < TWO_PI; a += PI / 4) {
    let x1 = b.x + cos(a) * (popSize * 0.35);
    let y1 = b.y + sin(a) * (popSize * 0.35);
    let x2 = b.x + cos(a) * (popSize * 0.55);
    let y2 = b.y + sin(a) * (popSize * 0.55);
    line(x1, y1, x2, y2);
  }
  pop();
}

function updateButtonPosition() {
  startButton.position(width / 2 - 70, height / 2 + 50);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateButtonPosition();
}
