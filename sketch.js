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

let canvasW, canvasH;

function setup() {
  canvasW = windowWidth;
  canvasH = windowHeight;
  createCanvas(canvasW, canvasH);
  video = createCapture(VIDEO, videoReady);
  video.size(canvasW, canvasH);
  video.hide();

  // 動態設定分類區塊位置
  let blockW = 120, blockH = 80, gap = 40;
  let totalW = blockW * 3 + gap * 2;
  let startX = (canvasW - totalW) / 2;
  categories = [
    { name: "工具", x: startX, y: canvasH - blockH - 60, w: blockW, h: blockH },
    { name: "數位科技", x: startX + blockW + gap, y: canvasH - blockH - 60, w: blockW, h: blockH },
    { name: "學習理論", x: startX + (blockW + gap) * 2, y: canvasH - blockH - 60, w: blockW, h: blockH }
  ];

  pickVocab();
}

function videoReady() {
  console.log("Camera ready!");
}

function pickVocab() {
  if (vocabList.length === 0) {
    resultMsg = "遊戲結束！";
    currentVocab = { word: "", category: "" };
    return;
  }
  let idx = floor(random(vocabList.length));
  currentVocab = vocabList[idx];
  dragX = canvasW / 2;
  dragY = 100;
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
  if (video.loadedmetadata) {
    image(video, 0, 0, canvasW, canvasH);
  } else {
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("正在開啟相機...", canvasW / 2, canvasH / 2);
    return;
  }

  drawKeypoints();

  // 左上角顯示答對數與剩餘題目數
  fill(0);
  textSize(22);
  textAlign(LEFT, TOP);
  text(`答對：${correctCount}  剩餘：${remainingCount}`, 20, 20);

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
            vocabList = vocabList.filter(v => v.word !== currentVocab.word);
          } else {
            resultMsg = "再試一次！";
          }
          setTimeout(pickVocab, 1200);
        }
      }
      handDragging = false;
      dragX = canvasW / 2;
      dragY = 100;
    }
    prevOK = handOK;
  }

  // 顯示詞彙（正中央上方）
  fill(255, 200, 0);
  stroke(0);
  rect(dragX - 80, dragY - 40, 160, 80, 16);
  fill(0);
  textSize(36);
  textAlign(CENTER, CENTER);
  text(currentVocab.word, dragX, dragY);

  // 顯示分類區塊
  textSize(28);
  for (let c of categories) {
    fill(200);
    rect(c.x, c.y, c.w, c.h, 16);
    fill(0);
    textAlign(CENTER, CENTER);
    text(c.name, c.x + c.w / 2, c.y + c.h / 2);
  }

  // 顯示結果
  fill(0);
  textSize(32);
  textAlign(CENTER, CENTER);
  text(resultMsg, canvasW / 2, canvasH - 30);
}

function windowResized() {
  canvasW = windowWidth;
  canvasH = windowHeight;
  resizeCanvas(canvasW, canvasH);
  // 重新計算分類區塊位置
  let blockW = 120, blockH = 80, gap = 40;
  let totalW = blockW * 3 + gap * 2;
  let startX = (canvasW - totalW) / 2;
  categories = [
    { name: "工具", x: startX, y: canvasH - blockH - 60, w: blockW, h: blockH },
    { name: "數位科技", x: startX + blockW + gap, y: canvasH - blockH - 60, w: blockW, h: blockH },
    { name: "學習理論", x: startX + (blockW + gap) * 2, y: canvasH - blockH - 60, w: blockW, h: blockH }
  ];
  dragX = canvasW / 2;
  dragY = 100;
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
