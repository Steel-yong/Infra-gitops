// @techstark/opencv-js(타입 정의가 없는 WASM 모듈)의 최소 타입 선언 — 이 프로젝트가 쓰는 부분만.
declare module '@techstark/opencv-js' {
  export interface CvMat {
    delete(): void;
    empty(): boolean;
    data32F: Float32Array;
  }
  export interface CvKeyPoint {
    pt: { x: number; y: number };
  }
  export interface CvKeyPointVector {
    size(): number;
    get(i: number): CvKeyPoint;
    delete(): void;
  }
  export interface CvDMatch {
    distance: number;
    queryIdx: number;
    trainIdx: number;
  }
  export interface CvDMatchVector {
    size(): number;
    get(i: number): CvDMatch;
  }
  export interface CvDMatchVectorVector {
    size(): number;
    get(i: number): CvDMatchVector;
    delete(): void;
  }
  export interface CvAkaze {
    detectAndCompute(img: CvMat, mask: CvMat, kp: CvKeyPointVector, des: CvMat): void;
  }
  export interface CvBFMatcher {
    knnMatch(q: CvMat, t: CvMat, out: CvDMatchVectorVector, k: number): void;
    delete(): void;
  }
  export interface OpenCv {
    Mat: new () => CvMat;
    AKAZE: new () => CvAkaze;
    KeyPointVector: new () => CvKeyPointVector;
    DMatchVectorVector: new () => CvDMatchVectorVector;
    BFMatcher: new (normType: number) => CvBFMatcher;
    matFromArray(rows: number, cols: number, type: number, data: ArrayLike<number>): CvMat;
    findHomography(src: CvMat, dst: CvMat, method: number, ransacReprojThreshold: number, mask: CvMat): CvMat;
    perspectiveTransform(src: CvMat, dst: CvMat, m: CvMat): void;
    countNonZero(src: CvMat): number;
    onRuntimeInitialized?: () => void;
    NORM_HAMMING: number;
    RANSAC: number;
    CV_8UC1: number;
    CV_32FC2: number;
  }
  const cv: OpenCv;
  export default cv;
}
