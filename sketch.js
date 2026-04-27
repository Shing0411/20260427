let video;
let handPose;
let hands = [];

let startButton;
let cameraStarted = false;

let videoX = 0;
let videoY = 0;
let displayW = 0;
let displayH = 0;

let fingerGroups = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20]
];

function preload() {
  // 使用 flipped:true，讓 ml5 的偵測座標與鏡像畫面一致
  handPose = ml5.handPose({
    flipped: true
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  textFont("sans-serif");

  startButton = createButton("啟動攝影機");
  startButton.position(width / 2 - 70, height / 2 + 60);
  startButton.style("font-size", "20px");
  startButton.style("padding", "12px 24px");
  startButton.style("border-radius", "12px");
  startButton.style("border", "none");
  startButton.style("background", "#ffffff");
  startButton.style("cursor", "pointer");

  startButton.mousePressed(startCamera);
}

function startCamera() {
  video = createCapture({
    video: {
      facingMode: "user"
    },
    audio: false
  });

  // 設定基礎解析度，但實際顯示時會依照原始比例等比例縮放
  video.size(640, 480);
  video.hide();

  handPose.detectStart(video, gotHands);

  cameraStarted = true;
  startButton.hide();
}

function draw() {
  background("#C4E1FF");

  drawCenterText();

  if (!cameraStarted || !video || video.width === 0 || video.height === 0) {
    return;
  }

  calculateVideoDisplaySize();

  drawMirroredVideo();

  drawHands();
}

function drawCenterText() {
  push();
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.045);
  textStyle(BOLD);
  fill(40, 40, 40, 170);
  noStroke();
  text("414736529王家興", width / 2, height / 2);
  pop();
}

function calculateVideoDisplaySize() {
  let maxW = width * 0.6;
  let maxH = height * 0.6;

  // 使用 video.elt.videoWidth / video.elt.videoHeight 取得真正攝影機比例
  let sourceW = video.elt.videoWidth || video.width;
  let sourceH = video.elt.videoHeight || video.height;

  let scale = min(maxW / sourceW, maxH / sourceH);

  displayW = sourceW * scale;
  displayH = sourceH * scale;

  videoX = (width - displayW) / 2;
  videoY = (height - displayH) / 2;
}

function drawMirroredVideo() {
  push();

  // 自拍鏡像顯示
  translate(videoX + displayW, videoY);
  scale(-1, 1);

  image(video, 0, 0, displayW, displayH);

  pop();
}

function drawHands() {
  let sourceW = video.elt.videoWidth || video.width;
  let sourceH = video.elt.videoHeight || video.height;

  let scaleX = displayW / sourceW;
  let scaleY = displayH / sourceH;

  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {

        // flipped:true 後，handedness 需要反向判斷，才會符合畫面中的左右手
        let displayHandedness = hand.handedness === "Left" ? "Right" : "Left";

        if (displayHandedness === "Left") {
          stroke(255, 0, 255);
          fill(255, 0, 255);
        } else {
          stroke(255, 255, 0);
          fill(255, 255, 0);
        }

        strokeWeight(4);

        for (let group of fingerGroups) {
          for (let i = 0; i < group.length - 1; i++) {
            let indexA = group[i];
            let indexB = group[i + 1];

            let pointA = hand.keypoints[indexA];
            let pointB = hand.keypoints[indexB];

            if (pointA && pointB) {
              let x1 = videoX + pointA.x * scaleX;
              let y1 = videoY + pointA.y * scaleY;
              let x2 = videoX + pointB.x * scaleX;
              let y2 = videoY + pointB.y * scaleY;

              line(x1, y1, x2, y2);
            }
          }
        }

        noStroke();

        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];

          let x = videoX + keypoint.x * scaleX;
          let y = videoY + keypoint.y * scaleY;

          circle(x, y, 12);

          fill(0);
          textSize(12);
          textAlign(CENTER, CENTER);
          text(i, x, y - 16);

          if (displayHandedness === "Left") {
            fill(255, 0, 255);
          } else {
            fill(255, 255, 0);
          }
        }
      }
    }
  }
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  if (startButton) {
    startButton.position(width / 2 - 70, height / 2 + 60);
  }
}
