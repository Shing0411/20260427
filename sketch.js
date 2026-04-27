// Hand Pose Detection with ml5.js
// p5.js + ml5.js
// 全螢幕畫布、鏡像攝影機、等比例置中顯示、手指線條串接

let video;
let handPose;
let hands = [];

// 攝影機畫面顯示位置與大小
let videoX = 0;
let videoY = 0;
let displayW = 0;
let displayH = 0;

// 手指節點分組
let fingerGroups = [
  [0, 1, 2, 3, 4],      // 拇指
  [5, 6, 7, 8],         // 食指
  [9, 10, 11, 12],      // 中指
  [13, 14, 15, 16],     // 無名指
  [17, 18, 19, 20]      // 小指
];

function preload() {
  // 啟用 HandPose，並設定鏡像
  handPose = ml5.handPose({
    flipped: true
  });
}

function setup() {
  // 全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 擷取攝影機影像，設定鏡像
  video = createCapture(VIDEO, {
    flipped: true
  });

  // 給一個基礎尺寸，電腦與手機都可用
  video.size(640, 480);
  video.hide();

  // 開始偵測手部
  handPose.detectStart(video, gotHands);
}

function draw() {
  background("#e7c6ff");

  // 計算等比例攝影機顯示大小
  calculateVideoDisplaySize();

  // 將攝影機畫面顯示在中間
  image(video, videoX, videoY, displayW, displayH);

  // 畫出手部偵測線條與節點
  drawHands();
}

function calculateVideoDisplaySize() {
  // 螢幕可使用範圍為寬高的 60%
  let maxW = width * 0.6;
  let maxH = height * 0.6;

  // 攝影機原始比例
  let videoRatio = video.width / video.height;
  let screenRatio = maxW / maxH;

  // 等比例縮放，不讓畫面變形
  if (videoRatio > screenRatio) {
    displayW = maxW;
    displayH = displayW / videoRatio;
  } else {
    displayH = maxH;
    displayW = displayH * videoRatio;
  }

  // 置中
  videoX = (width - displayW) / 2;
  videoY = (height - displayH) / 2;
}

function drawHands() {
  // 計算偵測座標轉換到畫面上的比例
  let scaleX = displayW / video.width;
  let scaleY = displayH / video.height;

  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {

        // 左右手不同顏色
        if (hand.handedness == "Left") {
          stroke(255, 0, 255);
          fill(255, 0, 255);
        } else {
          stroke(255, 255, 0);
          fill(255, 255, 0);
        }

        strokeWeight(4);

        // 將 0-4、5-8、9-12、13-16、17-20 分別用 line 串起來
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

        // 畫出 0 到 20 的節點
        noStroke();
        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];

          let x = videoX + keypoint.x * scaleX;
          let y = videoY + keypoint.y * scaleY;

          circle(x, y, 12);
        }
      }
    }
  }
}

// 接收 HandPose 偵測結果
function gotHands(results) {
  hands = results;
}

// 滑鼠點擊時，可查看手部資料
function mousePressed() {
  console.log(hands);
}

// 視窗大小改變時，畫布自動調整
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
