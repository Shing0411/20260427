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
  // 不要使用 flipped:true，避免鏡像錯亂
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  startButton = createButton("啟動攝影機");
  startButton.position(width / 2 - 70, height / 2);
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

  video.size(640, 480);
  video.hide();

  handPose.detectStart(video, gotHands);

  cameraStarted = true;
  startButton.hide();
}

function draw() {
  background("#e7c6ff");

  if (!cameraStarted || !video || video.width === 0 || video.height === 0) {
    fill(80);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(22);
    text("請點擊按鈕啟動攝影機", width / 2, height / 2 - 60);
    return;
  }

  calculateVideoDisplaySize();

  drawMirroredVideo();

  drawHands();
}

function calculateVideoDisplaySize() {
  // 攝影機顯示範圍最多為全螢幕寬高的 60%
  let maxW = width * 0.6;
  let maxH = height * 0.6;

  // 使用等比例縮放，避免畫面變形
  let scale = min(maxW / video.width, maxH / video.height);

  displayW = video.width * scale;
  displayH = video.height * scale;

  videoX = (width - displayW) / 2;
  videoY = (height - displayH) / 2;
}

function drawMirroredVideo() {
  push();

  // 移動到攝影機畫面右側
  translate(videoX + displayW, videoY);

  // 水平翻轉，形成正常自拍鏡像效果
  scale(-1, 1);

  // 繪製等比例縮放後的攝影機畫面
  image(video, 0, 0, displayW, displayH);

  pop();
}

function drawHands() {
  let scaleX = displayW / video.width;
  let scaleY = displayH / video.height;

  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {

        if (hand.handedness == "Left") {
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
              let x1 = mirrorX(pointA.x);
              let y1 = videoY + pointA.y * scaleY;

              let x2 = mirrorX(pointB.x);
              let y2 = videoY + pointB.y * scaleY;

              line(x1, y1, x2, y2);
            }
          }
        }

        noStroke();

        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];

          let x = mirrorX(keypoint.x);
          let y = videoY + keypoint.y * scaleY;

          circle(x, y, 12);
        }
      }
    }
  }
}

// 將手部偵測點的 X 座標同步鏡像
function mirrorX(x) {
  let scaleX = displayW / video.width;
  return videoX + displayW - x * scaleX;
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  if (startButton) {
    startButton.position(width / 2 - 70, height / 2);
  }
}
