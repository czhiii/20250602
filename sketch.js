let video;
let handpose;
let predictions = [];

// 教育科技詞彙與分類
let vocabList = [
  { word: "Kahoot", category: "工具" },
  { word: "AI", category: "數位科技" },
  { word: "翻轉教室", category: "學習理論" },
  { word: "Padlet", category: "工具" },
  { word: "大數據", category: "數位科技" },
  { word: "建構主義", category: "學習理論" }
];
let currentVocab;
let dragging = false;
let dragX, dragY;
let offsetX, offsetY;

// 分類區塊
let categories = [
  { name: "工具", x: 50, y: 320, w: 80, h: 60 },
  { name: "數位科技", x: 160, y: 320, w: 80, h: 60 },
  { name: "學習理論", x: 270, y: 320, w: 80, h: 60 }
];
let resultMsg = "";
let handDragging = false;
let prevOK = false;
let correctCount = 0;
let remainingCount = vocabList.length;

function setup() {
  createCanvas(400, 400);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = ml5.handpose(video, modelReady);
  handpose.on("predict", gotHands);

  pickVocab();
}

function pickVocab() {
  if (vocabList.length === 0) {
    resultMsg = "遊戲結束！";
    currentVocab = { word: "", category: "" };
    return;
  }
  let idx = floor(random(vocabList.length));
  currentVocab = vocabList[idx];
  dragX = width / 2;
  dragY = 60;
  resultMsg = "";
  remainingCount = vocabList.length;
}

function modelReady() {
  console.log("Handpose model loaded!");
}

function gotHands(results) {
  predictions = results;
}

function draw() {
  background(220);
  image(video, 0, 0, width, height);

  drawKeypoints();

  // 左上角顯示答對數與剩餘題目數
  fill(0);
  textSize(18);
  textAlign(LEFT, TOP);
  text(`答對：${correctCount}  剩餘：${remainingCount}`, 10, 10);

  // 手勢拖曳詞彙
  let handOK = false;
  let fingerX, fingerY;
  if (predictions.length > 0) {
    let hand = predictions[0];
    let gesture = classifyGesture(hand);
    fingerX = hand.landmarks[8][0];
    fingerY = hand.landmarks[8][1];
    handOK = (gesture === "OK");

    // 檢查是否開始拖曳
    if (
      handOK &&
      !prevOK &&
      fingerX > dragX - 50 &&
      fingerX < dragX + 50 &&
      fingerY > dragY - 25 &&
      fingerY < dragY + 25
    ) {
      handDragging = true;
      offsetX = dragX - fingerX;
      offsetY = dragY - fingerY;
    }

    // 拖曳中
    if (handDragging && handOK) {
      dragX = fingerX + offsetX;
      dragY = fingerY + offsetY;
    }

    // 放開（OK手勢結束）
    if (handDragging && !handOK && prevOK) {
      for (let c of categories) {
        if (
          dragX > c.x &&
          dragX < c.x + c.w &&
          dragY > c.y &&
          dragY < c.y + c.h
        ) {
          if (c.name === currentVocab.category) {
            resultMsg = "答對了！";
            correctCount++;
            // 移除已答題目
            vocabList = vocabList.filter(v => v.word !== currentVocab.word);
          } else {
            resultMsg = "再試一次！";
          }
          setTimeout(pickVocab, 1200);
        }
      }
      handDragging = false;
      dragX = width / 2;
      dragY = 60;
    }
    prevOK = handOK;
  }

  // 顯示詞彙
  fill(255, 200, 0);
  stroke(0);
  rect(dragX - 50, dragY - 25, 100, 50, 10);
  fill(0);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(currentVocab.word, dragX, dragY);

  // 顯示分類區塊
  for (let c of categories) {
    fill(200);
    rect(c.x, c.y, c.w, c.h, 10);
    fill(0);
    textSize(18);
    textAlign(CENTER, CENTER);
    text(c.name, c.x + c.w / 2, c.y + c.h / 2);
  }

  // 顯示結果
  fill(0);
  textSize(24);
  text(resultMsg, width / 2, height - 30);
}

// 畫出手部關鍵點
function drawKeypoints() {
  for (let i = 0; i < predictions.length; i++) {
    let prediction = predictions[i];
    for (let j = 0; j < prediction.landmarks.length; j++) {
      let [x, y, z] = prediction.landmarks[j];
      fill(0, 255, 0);
      noStroke();
      ellipse(x, y, 10, 10);
    }
  }
}

// 簡單手勢分類（以大拇指和食指距離為例）
function classifyGesture(hand) {
  // 4: 拇指指尖, 8: 食指指尖
  let thumbTip = hand.landmarks[4];
  let indexTip = hand.landmarks[8];
  let middleTip = hand.landmarks[12];

  // 比讚：拇指向上且遠離其他手指
  if (thumbTip[1] < indexTip[1] && thumbTip[1] < middleTip[1]) {
    return "Thumbs Up";
  }
  // OK：拇指和食指靠近
  let d = dist(thumbTip[0], thumbTip[1], indexTip[0], indexTip[1]);
  if (d < 40) {
    return "OK";
  }
  return "偵測中...";
}
