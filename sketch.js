let video;
let bodyPose;
let poses = [];
let particles = [];
let connections;
let smoothedKeypoints = []; 

function preload() {
  bodyPose = ml5.bodyPose("MoveNet", { flipped: true });
}

function setup() {
  createCanvas(640, 480);

  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();

  // 初始化 BodyPose 模型
  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getSkeleton();

  noStroke();

  // 初始化粒子，满屏随机分布
  for (let i = 0; i < 5000; i++) {
    particles.push(new Particle(random(width), random(height)));
  }
}

function gotPoses(results) {
  poses = results;

  if (poses.length > 0) {
    const pose = poses[0];

    // 初始化 smoothedKeypoints
    if (smoothedKeypoints.length === 0) {
      smoothedKeypoints = pose.keypoints.map(k => ({ x: k.x, y: k.y, confidence: k.confidence }));
    }

    // 使用 lerp 平滑关键点位置
    for (let i = 0; i < pose.keypoints.length; i++) {
      smoothedKeypoints[i].x = lerp(smoothedKeypoints[i].x, pose.keypoints[i].x, 0.3);
      smoothedKeypoints[i].y = lerp(smoothedKeypoints[i].y, pose.keypoints[i].y, 0.3);
      smoothedKeypoints[i].confidence = pose.keypoints[i].confidence;
    }
  }
}

function draw() {
  background(0);

  // 显示视频
  push();
  //translate(width, 0);
  //scale(-1, 1); // 镜像翻转视频
  image(video, 0, 0, width, height);
  pop();

  // 更新并绘制粒子
  for (let particle of particles) {
    applyBodyForce(particle); // 对粒子应用身体关键点交互力
    particle.update();
    particle.show();
  }

  // 绘制身体关键点和骨架
  if (smoothedKeypoints.length > 0) {
    for (let i = 0; i < smoothedKeypoints.length; i++) {
      let keypoint = smoothedKeypoints[i];
      if (keypoint.confidence > 0.1) {
        fill(255, 192, 203);
        noStroke();
        circle(keypoint.x, keypoint.y, 12);
      }
    }

    for (let i = 0; i < connections.length; i++) {
      let connection = connections[i];
      let a = connection[0];
      let b = connection[1];
      let keyPointA = smoothedKeypoints[a];
      let keyPointB = smoothedKeypoints[b];

      if (keyPointA.confidence > 0.1 && keyPointB.confidence > 0.1) {
        stroke(255, 192, 203);
        strokeWeight(8);
        line(keyPointA.x, keyPointA.y, keyPointB.x, keyPointB.y);
      }
    }
  }
}

// 对粒子施加身体关键点交互力
function applyBodyForce(particle) {
  if (smoothedKeypoints.length > 0) {
    for (let keypoint of smoothedKeypoints) {
      if (keypoint.confidence > 0.1) {
        const d = dist(keypoint.x, keypoint.y, particle.x, particle.y);

        if (d < 50) {
          // 如果粒子靠近关键点，施加推力
          let forceX = (particle.x - keypoint.x) / d;
          let forceY = (particle.y - keypoint.y) / d;
          particle.vx += forceX * 2; // 放大推力
          particle.vy += forceY * 2;

          // 重置计时器
          particle.timer = 0;
        }
      }
    }
  }
}

// 粒子类
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-1, 1); // 随机水平速度
    this.vy = random(-1, 1); // 随机垂直速度
    this.alpha = 255; // 透明度
    this.size = random(3, 10); // 粒子大小
    this.color = color(random(255), random(255), random(255)); // 随机颜色
    this.initialVx = this.vx; // 保存初始速度
    this.initialVy = this.vy;
    this.timer = 120; // 计时器，默认 2 秒（60 帧 * 2）
  }

  // 更新粒子属性
  update() {
    this.x += this.vx;
    this.y += this.vy;

    // 边界检测
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    // 计时器递增
    if (this.timer < 120) {
      this.timer++;
    } else {
      // 粒子恢复到初始速度
      this.vx += (this.initialVx - this.vx) * 0.05;
      this.vy += (this.initialVy - this.vy) * 0.05;
    }

    // 摩擦力，模拟自然漂浮效果
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  // 显示粒子
  show() {
    fill(this.color);
    noStroke();
    ellipse(this.x, this.y, this.size);
  }
}
