// 확대(줌인) 화면에서 AKAZE 호모그래피로 자기장 원을 복원하는 서비스 (PUB-39)
// 전체맵 검출(circle.service) 실패 시 폴백. 화면 지형을 erangel/taego 기준맵에 매칭 →
// 호모그래피로 화면 좌표를 게임 좌표(0~1)로 변환 → 흰 자기장 호 픽셀 피팅 → 원 복원.
// 주의: opencv.js(WASM)는 비동기 초기화 + cv.Mat 수동 delete 필요. PoC(.local/sift_zone_prototype.py)와 동일 로직.
import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import sharp from 'sharp';
import cvDefault from '@techstark/opencv-js';
import type { CvMat, CvKeyPointVector, CvAkaze, OpenCv } from '../types/techstark-opencv-js';
import type { CircleData } from '@pubg-helper/shared';

// @techstark/opencv-js의 자체 타입이 이 프로젝트 사용부와 안 맞아, 로컬 OpenCv 타입으로 한 번만 단언한다(any 미사용).
const cv = cvDefault as unknown as OpenCv;

/** PUBG 페이즈별 자기장 반경 (circle.service와 동일). */
const PUBG_PHASE_RADII = [0.24474, 0.13461, 0.07403, 0.04072, 0.02036, 0.01018, 0.00509, 0.00254];
const MAPN = 1200; // 기준맵 해상도
const FRAME_MAX = 1280; // 프레임 분석 해상도 (긴 변)
// 줌인 전체맵(②)의 강한 매칭만 통과시켜 게임플레이·관전(③)의 약한 가짜 매칭(inlier 수십)을 차단.
// 줌인된 실제 전체맵은 지형 특징이 풍부해 inlier 수백이 나온다. (단독 게이트로는 한계 — 후속: 공간분산·reproj 추가.)
const MIN_STRONG_INLIERS = 120;

type MapName = 'erangel' | 'taego';

// opencv 타입은 src/types/techstark-opencv-js.d.ts 의 로컬 타입 모듈에서 제공된다.
interface RefDesc {
  name: MapName;
  kp: CvKeyPointVector;
  des: CvMat;
}

@Injectable()
export class SiftZoneService {
  private readonly logger = new Logger(SiftZoneService.name);
  private readyPromise: Promise<void> | null = null;
  private akaze!: CvAkaze;
  private refs: RefDesc[] = [];

  /** opencv WASM 준비 + 기준맵 디스크립터 사전계산 (최초 1회). */
  private ensureReady(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = (async () => {
      await new Promise<void>((resolve) => {
        const c = cv;
        if (c.Mat) resolve();
        else c.onRuntimeInitialized = () => resolve();
      });
      const c = cv;
      this.akaze = new c.AKAZE();
      for (const name of ['erangel', 'taego'] as MapName[]) {
        const path = join(__dirname, '..', '..', 'assets', 'maps', `${name}.jpg`);
        const mat = await this.grayMatFromFile(path, MAPN, MAPN);
        const kp = new c.KeyPointVector();
        const des = new c.Mat();
        const noMask = new c.Mat();
        this.akaze.detectAndCompute(mat, noMask, kp, des);
        noMask.delete();
        mat.delete();
        this.refs.push({ name, kp, des });
        this.logger.log(`기준맵 디스크립터 계산: ${name} (kp ${kp.size()})`);
      }
    })();
    return this.readyPromise;
  }

  /** 파일 → 그레이스케일 cv.Mat (CV_8UC1). */
  private async grayMatFromFile(path: string, w: number, h: number): Promise<CvMat> {
    const { data } = await sharp(path)
      .resize(w, h, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return cv.matFromArray(h, w, cv.CV_8UC1, data);
  }

  /**
   * 줌인 프레임에서 자기장 복원. 매칭/검출 실패 시 null.
   * @param base64 화면 프레임 (RGB jpeg/png base64)
   */
  async detectZone(base64: string, hintPhase?: number): Promise<CircleData | null> {
    await this.ensureReady();
    const c = cv;
    const buf = Buffer.from(base64, 'base64');

    // 분석 해상도로 축소 (긴 변 FRAME_MAX), 그레이 + 컬러 둘 다 확보.
    const meta = await sharp(buf).metadata();
    const ow = meta.width ?? 0;
    const oh = meta.height ?? 0;
    if (!ow || !oh) return null;
    const scale = Math.min(1, FRAME_MAX / Math.max(ow, oh));
    const fw = Math.round(ow * scale);
    const fh = Math.round(oh * scale);

    const gray = await sharp(buf).resize(fw, fh, { fit: 'fill' }).grayscale().raw().toBuffer();
    const color = await sharp(buf).resize(fw, fh, { fit: 'fill' }).removeAlpha().raw().toBuffer();

    const frameMat = c.matFromArray(fh, fw, c.CV_8UC1, gray);
    const kpF = new c.KeyPointVector();
    const desF = new c.Mat();
    const noMask = new c.Mat();
    this.akaze.detectAndCompute(frameMat, noMask, kpF, desF);
    noMask.delete();

    let best: { name: MapName; H: CvMat; inliers: number } | null = null;
    try {
      for (const ref of this.refs) {
        const matcher = new c.BFMatcher(c.NORM_HAMMING);
        const knn = new c.DMatchVectorVector();
        matcher.knnMatch(desF, ref.des, knn, 2);
        const srcPts: number[] = [];
        const dstPts: number[] = [];
        for (let i = 0; i < knn.size(); i++) {
          const pair = knn.get(i);
          if (pair.size() < 2) continue;
          const m = pair.get(0);
          const n = pair.get(1);
          if (m.distance < 0.75 * n.distance) {
            const p = kpF.get(m.queryIdx).pt;
            const q = ref.kp.get(m.trainIdx).pt;
            srcPts.push(p.x, p.y);
            dstPts.push(q.x, q.y);
          }
        }
        matcher.delete();
        knn.delete();
        const nGood = srcPts.length / 2;
        if (nGood < 15) continue;
        const src = c.matFromArray(nGood, 1, c.CV_32FC2, srcPts);
        const dst = c.matFromArray(nGood, 1, c.CV_32FC2, dstPts);
        const mask = new c.Mat();
        const H = c.findHomography(src, dst, c.RANSAC, 5, mask);
        const inliers = c.countNonZero(mask);
        src.delete();
        dst.delete();
        mask.delete();
        if (!H.empty() && inliers > (best?.inliers ?? 0)) {
          best?.H.delete();
          best = { name: ref.name, H, inliers };
        } else {
          H.delete();
        }
      }
    } finally {
      frameMat.delete();
      kpF.delete();
      desF.delete();
    }

    if (!best || best.inliers < MIN_STRONG_INLIERS) {
      best?.H.delete();
      this.logger.debug('SIFT-zone 매칭 실패 (지형 특징 부족/줌 과도)');
      return null;
    }

    // 흰 자기장 호 픽셀 (프레임 좌표) → 게임 좌표 변환 → RANSAC 원 피팅.
    const arc = this.collectWhiteArc(color, fw, fh);
    const minArc = isValidPhase(hintPhase) ? 12 : 30; // 페이즈 알면 중심만 찾으므로 호 점 적어도 됨
    const result = arc.length >= minArc ? this.fitZone(arc, best.H, c, hintPhase) : null;
    best.H.delete();
    if (result) {
      this.logger.log(
        `SIFT-zone 복원 [${best.name}] inlier ${best.inliers}: ` +
          `center=(${result.x.toFixed(3)},${result.y.toFixed(3)}) r=${result.r.toFixed(3)} phase ${result.phase}`,
      );
    }
    return result;
  }

  /** 흰 픽셀(자기장 경계 후보) 프레임 좌표 수집 (stride 샘플). */
  private collectWhiteArc(color: Buffer, w: number, h: number): Array<[number, number]> {
    const pts: Array<[number, number]> = [];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 3;
        if (color[i] >= 210 && color[i + 1] >= 210 && color[i + 2] >= 210) pts.push([x, y]);
      }
    }
    return pts;
  }

  /** 호 픽셀을 호모그래피로 게임좌표(0~1)로 변환 후 RANSAC 원 피팅 → 페이즈 매칭. */
  private fitZone(arc: Array<[number, number]>, H: CvMat, c: OpenCv, hintPhase?: number): CircleData | null {
    const flat: number[] = [];
    for (const [x, y] of arc) flat.push(x, y);
    const srcMat = c.matFromArray(arc.length, 1, c.CV_32FC2, flat);
    const dstMat = new c.Mat();
    const game: Array<[number, number]> = [];
    try {
      c.perspectiveTransform(srcMat, dstMat, H);
      for (let i = 0; i < arc.length; i++) {
        const gx = dstMat.data32F[i * 2] / MAPN;
        const gy = dstMat.data32F[i * 2 + 1] / MAPN;
        if (gx > -0.1 && gx < 1.1 && gy > -0.1 && gy < 1.1) game.push([gx, gy]);
      }
    } finally {
      srcMat.delete();
      dstMat.delete();
    }
    const minPts = isValidPhase(hintPhase) ? 12 : 30;
    if (game.length < minPts) return null;

    // OCR로 페이즈(=반경)를 알면 중심만 찾는다 — 작은 호·부분 잘림에 견고.
    if (isValidPhase(hintPhase)) {
      const r = PUBG_PHASE_RADII[hintPhase - 1];
      const center = this.fitCenterFixedRadius(game, r);
      return center ? { x: center.cx, y: center.cy, r, phase: hintPhase } : null;
    }

    let best: { cx: number; cy: number; r: number; score: number } | null = null;
    for (let t = 0; t < 3000; t++) {
      const a = game[(Math.random() * game.length) | 0];
      const b = game[(Math.random() * game.length) | 0];
      const d = game[(Math.random() * game.length) | 0];
      const cir = circleFromThree(a, b, d);
      if (!cir) continue;
      if (cir.r < 0.01 || cir.r > 0.6) continue;
      let score = 0;
      for (const [px, py] of game) {
        if (Math.abs(Math.hypot(px - cir.cx, py - cir.cy) - cir.r) < 0.004) score++;
      }
      if (!best || score > best.score) best = { ...cir, score };
    }
    if (!best || best.score < 30) return null;

    // 반경 → 가장 가까운 페이즈
    let phase = 1;
    let bestDiff = Infinity;
    for (let p = 0; p < PUBG_PHASE_RADII.length; p++) {
      const diff = Math.abs(PUBG_PHASE_RADII[p] - best.r);
      if (diff < bestDiff) {
        bestDiff = diff;
        phase = p + 1;
      }
    }
    return { x: best.cx, y: best.cy, r: PUBG_PHASE_RADII[phase - 1], phase };
  }

  /** 반경 고정 시 호 점들로 중심만 RANSAC (페이즈 힌트가 있을 때, 작은 호에 견고). */
  private fitCenterFixedRadius(
    pts: Array<[number, number]>,
    r: number,
  ): { cx: number; cy: number } | null {
    let best: { cx: number; cy: number; score: number } | null = null;
    for (let t = 0; t < 2000; t++) {
      const a = pts[(Math.random() * pts.length) | 0];
      const b = pts[(Math.random() * pts.length) | 0];
      for (const cen of centersFromTwoAndRadius(a, b, r)) {
        if (cen.cx < -0.1 || cen.cx > 1.1 || cen.cy < -0.1 || cen.cy > 1.1) continue;
        let score = 0;
        for (const [px, py] of pts) {
          if (Math.abs(Math.hypot(px - cen.cx, py - cen.cy) - r) < 0.006) score++;
        }
        if (!best || score > best.score) best = { cx: cen.cx, cy: cen.cy, score };
      }
    }
    if (!best || best.score < 12) return null;
    return { cx: best.cx, cy: best.cy };
  }
}

function circleFromThree(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
): { cx: number; cy: number; r: number } | null {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;
  const a = x2 - x1;
  const b = y2 - y1;
  const cc = x3 - x1;
  const d = y3 - y1;
  const e = a * (x1 + x2) + b * (y1 + y2);
  const f = cc * (x1 + x3) + d * (y1 + y3);
  const g = 2 * (a * (y3 - y2) - b * (x3 - x2));
  if (Math.abs(g) < 1e-9) return null;
  const cx = (d * e - b * f) / g;
  const cy = (a * f - cc * e) / g;
  return { cx, cy, r: Math.hypot(x1 - cx, y1 - cy) };
}

/** hintPhase가 유효한 페이즈 번호(1~N 정수)인지. */
function isValidPhase(p: number | undefined): p is number {
  return p != null && Number.isInteger(p) && p >= 1 && p <= PUBG_PHASE_RADII.length;
}

/** 두 점과 고정 반경 r로 가능한 원 중심 후보 (최대 2개). */
function centersFromTwoAndRadius(
  p1: [number, number],
  p2: [number, number],
  r: number,
): Array<{ cx: number; cy: number }> {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  if (d < 1e-9 || d > 2 * r) return [];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const h = Math.sqrt(Math.max(0, r * r - (d * d) / 4));
  const ux = -dy / d;
  const uy = dx / d;
  return [
    { cx: mx + h * ux, cy: my + h * uy },
    { cx: mx - h * ux, cy: my - h * uy },
  ];
}
