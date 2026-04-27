let video;
let handPose;
let hands = [];

let videoW;
let videoH;
let videoX;
let videoY;

function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function mousePressed() {
  console.log(hands);
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();

  handPose.detectStart(video, gotHands);
}

function draw() {
  background("#C4E1FF");

  videoW = width * 0.5;
  videoH = height * 0.5;

  videoX = (width - videoW) / 2;
  videoY = (height - videoH) / 2;

  image(video, videoX, videoY, videoW, videoH);

  let scaleX = videoW / video.width;
  let scaleY = videoH / video.height;

  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];

          let x = videoX + keypoint.x * scaleX;
          let y = videoY + keypoint.y * scaleY;

          if (hand.handedness == "Left") {
            fill(255, 0, 255);
          } else {
            fill(255, 255, 0);
          }

          noStroke();
          circle(x, y, 16);
        }
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}