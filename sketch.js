let video;
let handPose;
let hands = [];
let smoothHands = [];

let startButton;
let cameraStarted = false;
let modelStarted = false;

let videoX = 0;
let videoY = 0;
let displayW = 0;
let displayH = 0;

let bubbles = [];
let sparkles = [];

const fingerGroups = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20]
];

const tipIndices = [4, 8, 12, 16, 20];

function preload() {
  // 重點：HandPose 使用 flipped:true
  // 讓模型偵測座標和自拍鏡像畫面一致
  handPose = ml5.handPose({
    flipped: true
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("sans-serif");
  textAlign(CENTER, CENTER);

  createStartButton();
}

function draw() {
  drawBackground();

  if (!cameraStarted) {
    drawCenterIntro();
    return;
  }

  if (!video || !video.elt || !video.elt.videoWidth || !modelStarted) {
    drawLoadingText();
    return;
  }

  calculateVideoDisplaySize();

  drawVideoFrame();
  drawVideo();

  updateSmoothHands();
  spawnBubblesFromTips();
  updateAndDrawBubbles();
  updateAndDrawSparkles();

  drawHands();
  drawTopTitle();
}

/* =========================
   啟動畫面與按鈕
========================= */

function createStartButton() {
  startButton = createButton("啟動攝影機");
  startButton.style("font-size", "20px");
  startButton.style("padding", "14px 28px");
  startButton.style("border-radius", "999px");
  startButton.style("border", "none");
  startButton.style("background", "rgba(255,255,255,0.9)");
  startButton.style("box-shadow", "0 8px 24px rgba(0,0,0,0.18)");
  startButton.style("cursor", "pointer");
  startButton.style("font-weight", "bold");
  startButton.mousePressed(startCamera);

  updateButtonPosition();
}

function startCamera() {
  video = createCapture(
    {
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    },
    () => {
      console.log("攝影機已啟動");
    }
  );

  video.elt.setAttribute("playsinline", "");
  video.elt.muted = true;

  // 重點：鏡像顯示交給 p5 的 flipped:true
  // 不再自己用 scale(-1,1)，避免節點和影像不同步
  video = createCapture(VIDEO, {
    flipped: true
  });

  video.elt.setAttribute("playsinline", "");
  video.elt.muted = true;
  video.hide();

  // 等攝影機真正取得原始尺寸後，再啟動模型
  video.elt.onloadedmetadata = () => {
    let sourceW = video.elt.videoWidth;
    let sourceH = video.elt.videoHeight;

    // 重點：不要固定 640x480
    // 讓 video 本身保留真實比例，節點才不會飄移
    video.size(sourceW, sourceH);

    handPose.detectStart(video, gotHands);

    modelStarted = true;
    console.log("原始攝影機尺寸：", sourceW, sourceH);
  };

  cameraStarted = true;
  startButton.hide();
}

function drawCenterIntro() {
  push();

  fill(255, 255, 255, 160);
  noStroke();
  rectMode(CENTER);
  rect(width / 2, height / 2 - 40, min(width * 0.85, 520), 130, 28);

  fill(40, 60, 90);
  textStyle(BOLD);
  textSize(min(width, height) * 0.048);
  text("414736529王家興", width / 2, height / 2 - 65);

  textStyle(NORMAL);
  textSize(18);
  fill(60, 80, 110, 190);
  text("請點擊下方按鈕啟動攝影機", width / 2, height / 2 - 20);

  pop();
}

function drawLoadingText() {
  push();
  fill(40, 60, 90, 180);
  noStroke();
  textStyle(BOLD);
  textSize(22);
  text("攝影機與手部模型載入中…", width / 2, height / 2);
  pop();
}

/* =========================
   背景與標題
========================= */

function drawBackground() {
  background("#C4E1FF");

  // 柔和泡泡背景
  noStroke();

  for (let i = 0; i < 16; i++) {
    let x = (i * 127 + frameCount * 0.18) % (width + 160) - 80;
    let y = (i * 89 + sin(frameCount * 0.01 + i) * 30) % height;
    let s = 60 + (i % 5) * 22;

    fill(255, 255, 255, 30);
    circle(x, y, s);
  }
}

function drawTopTitle() {
  let titleY = 42;

  push();
  rectMode(CENTER);

  fill(255, 255, 255, 175);
  noStroke();
  rect(width / 2, titleY, min(width * 0.7, 420), 48, 24);

  fill(40, 60, 90, 220);
  textStyle(BOLD);
  textSize(min(width, height) * 0.032);
  text("414736529王家興", width / 2, titleY + 1);

  pop();
}

/* =========================
   攝影機比例與顯示
========================= */

function calculateVideoDisplaySize() {
  let maxW = width * 0.6;
  let maxH = height * 0.6;

  let sourceW = video.width;
  let sourceH = video.height;

  let scaleFactor = min(maxW / sourceW, maxH / sourceH);

  displayW = sourceW * scaleFactor;
  displayH = sourceH * scaleFactor;

  videoX = (width - displayW) / 2;
  videoY = (height - displayH) / 2 + 18;
}

function drawVideoFrame() {
  push();
  rectMode(CORNER);

  // 外框陰影
  noStroke();
  fill(60, 80, 120, 45);
  rect(videoX - 14, videoY - 10, displayW + 28, displayH + 28, 28);

  // 白色相框
  fill(255, 255, 255, 210);
  rect(videoX - 8, videoY - 8, displayW + 16, displayH + 16, 24);

  pop();
}

function drawVideo() {
  push();

  // 直接畫 video，不再手動 scale(-1,1)
  // 因為 createCapture 已使用 flipped:true
  image(video, videoX, videoY, displayW, displayH);

  pop();
}

/* =========================
   手部偵測與節點
========================= */

function gotHands(results) {
  hands = results;
}

function updateSmoothHands() {
  if (hands.length === 0) {
    smoothHands = [];
    return;
  }

  let nextHands = [];

  for (let h = 0; h < hands.length; h++) {
    let hand = hands[h];
    let oldHand = smoothHands[h];

    let newHand = {
      confidence: hand.confidence,
      handedness: hand.handedness,
      keypoints: []
    };

    for (let i = 0; i < hand.keypoints.length; i++) {
      let kp = hand.keypoints[i];
      let oldKp = oldHand && oldHand.keypoints[i];

      let x = oldKp ? lerp(oldKp.x, kp.x, 0.45) : kp.x;
      let y = oldKp ? lerp(oldKp.y, kp.y, 0.45) : kp.y;

      newHand.keypoints.push({ x, y });
    }

    nextHands.push(newHand);
  }

  smoothHands = nextHands;
}

function mapKeypointToCanvas(kp) {
  let scaleX = displayW / video.width;
  let scaleY = displayH / video.height;

  // 重點：這版不再手動鏡像 X
  // 因為 video 和 ml5 都已經使用 flipped:true
  let x = videoX + kp.x * scaleX;
  let y = videoY + kp.y * scaleY;

  return { x, y };
}

function drawHands() {
  if (smoothHands.length === 0) return;

  for (let hand of smoothHands) {
    if (hand.confidence < 0.15) continue;

    let isLeft = hand.handedness === "Left";

    let lineColor = isLeft
      ? color(255, 80, 210, 230)
      : color(255, 230, 80, 230);

    let glowColor = isLeft
      ? color(255, 80, 210, 65)
      : color(255, 230, 80, 65);

    // 發光底線
    stroke(glowColor);
    strokeWeight(12);
    drawFingerLines(hand);

    // 主線
    stroke(lineColor);
    strokeWeight(4);
    drawFingerLines(hand);

    // 節點外光
    noStroke();
    for (let i = 0; i < hand.keypoints.length; i++) {
      let p = mapKeypointToCanvas(hand.keypoints[i]);

      fill(255, 255, 255, 90);
      circle(p.x, p.y, 22);
    }

    // 節點本體
    for (let i = 0; i < hand.keypoints.length; i++) {
      let p = mapKeypointToCanvas(hand.keypoints[i]);

      fill(lineColor);
      circle(p.x, p.y, 11);

      fill(30, 50, 80, 220);
      textSize(10);
      textStyle(BOLD);
      text(i, p.x, p.y - 16);
    }

    // 手腕節點加強
    let wrist = mapKeypointToCanvas(hand.keypoints[0]);
    fill(255, 255, 255, 180);
    circle(wrist.x, wrist.y, 18);
    fill(lineColor);
    circle(wrist.x, wrist.y, 10);
  }
}

function drawFingerLines(hand) {
  for (let group of fingerGroups) {
    for (let i = 0; i < group.length - 1; i++) {
      let p1 = mapKeypointToCanvas(hand.keypoints[group[i]]);
      let p2 = mapKeypointToCanvas(hand.keypoints[group[i + 1]]);

      line(p1.x, p1.y, p2.x, p2.y);
    }
  }
}

/* =========================
   指尖水泡
========================= */

function spawnBubblesFromTips() {
  if (smoothHands.length === 0) return;
  if (frameCount % 6 !== 0) return;

  for (let hand of smoothHands) {
    if (hand.confidence < 0.15) continue;

    for (let tipIndex of tipIndices) {
      let tip = hand.keypoints[tipIndex];
      let p = mapKeypointToCanvas(tip);

      bubbles.push({
        x: p.x + random(-4, 4),
        y: p.y + random(-4, 4),
        size: random(12, 26),
        vx: random(-0.45, 0.45),
        vy: random(-2.4, -1.1),
        alpha: random(150, 220),
        life: 0,
        maxLife: int(random(38, 85)),
        popped: false,
        popFrame: 0
      });
    }
  }

  if (bubbles.length > 220) {
    bubbles.splice(0, bubbles.length - 220);
  }
}

function updateAndDrawBubbles() {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];

    if (!b.popped) {
      b.life++;
      b.x += b.vx + sin(frameCount * 0.06 + i) * 0.18;
      b.y += b.vy;
      b.alpha -= 1.1;

      if (b.life > b.maxLife || b.y < videoY - 20 || b.alpha <= 20) {
        b.popped = true;

        for (let s = 0; s < 5; s++) {
          sparkles.push({
            x: b.x,
            y: b.y,
            vx: random(-1.8, 1.8),
            vy: random(-1.8, 1.8),
            life: 0,
            maxLife: random(12, 24),
            size: random(3, 7)
          });
        }
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

  stroke(180, 230, 255, b.alpha * 0.7);
  strokeWeight(1);
  circle(b.x, b.y, b.size * 0.72);

  noStroke();
  fill(255, 255, 255, b.alpha * 0.8);
  circle(b.x - b.size * 0.18, b.y - b.size * 0.2, b.size * 0.2);

  pop();
}

function drawBubblePop(b) {
  push();

  let alpha = 160 - b.popFrame * 18;
  let popSize = b.size + b.popFrame * 4;

  noFill();
  stroke(255, 255, 255, alpha);
  strokeWeight(2);
  circle(b.x, b.y, popSize);

  for (let a = 0; a < TWO_PI; a += PI / 4) {
    let x1 = b.x + cos(a) * popSize * 0.35;
    let y1 = b.y + sin(a) * popSize * 0.35;
    let x2 = b.x + cos(a) * popSize * 0.55;
    let y2 = b.y + sin(a) * popSize * 0.55;
    line(x1, y1, x2, y2);
  }

  pop();
}

function updateAndDrawSparkles() {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    let s = sparkles[i];

    s.life++;
    s.x += s.vx;
    s.y += s.vy;

    let alpha = map(s.life, 0, s.maxLife, 180, 0);

    noStroke();
    fill(255, 255, 255, alpha);
    circle(s.x, s.y, s.size);

    if (s.life > s.maxLife) {
      sparkles.splice(i, 1);
    }
  }
}

/* =========================
   視窗調整
========================= */

function updateButtonPosition() {
  if (startButton) {
    startButton.position(width / 2 - 75, height / 2 + 45);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateButtonPosition();
}
