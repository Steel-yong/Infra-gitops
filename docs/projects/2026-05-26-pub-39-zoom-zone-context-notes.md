# PUB-39 컨텍스트 노트 — 확대 자기장

## 핵심 결정과 이유

### SIFT/AKAZE 호모그래피로 좌표 복원
확대 화면은 전체맵 검출(청록 비율·맵영역)이 실패한다. 화면 지형을 erangel/taego 기준맵에 AKAZE로 매칭 → 호모그래피로 화면좌표→게임좌표 변환. 이러면 화면 어디가 보이든(잘려도) 게임좌표를 안다. PoC(.local/sift_zone_prototype.py)에서 줌.png로 erangel inlier 808 확인.

### WASM opencv (Python SIFT 불가)
런타임은 Node(NestJS)라 Python cv2.SIFT를 못 쓴다. `@techstark/opencv-js`(WASM)는 SIFT가 없어 **AKAZE** 사용(PUBG 맵에서 AKAZE inlier가 SIFT보다 많았음). 비동기 초기화 + Mat 수동 delete 필요. (이 lib는 타입 정의가 없어 현재 any 사용 — 별도 정리 과제.)

### v2: OCR 페이즈 힌트로 중심만 찾기 (이번)
사용자 의도 = "크기는 페이즈로 이미 정해뒀으니 그에 맞게." OCR 타이머가 현재 페이즈를 안다.
- hintPhase → 반경 = PUBG_PHASE_RADII[hintPhase-1] 확정.
- 반경이 고정이면 원 피팅이 3-파라미터(cx,cy,r)에서 **2-파라미터(cx,cy)** 로 줄어 → 필요한 호 점이 적어짐 → 작은 호·부분 잘림에 견고.
- 중심 후보 생성: 호 점 2개 + 고정 반경 r → 수직이등분선 위 거리 √(r²-(d/2)²)에 중심 2개 후보. RANSAC으로 inlier 최다 중심 채택.
- hintPhase 없으면(자기장 추출은 됐는데 OCR 페이즈 모름) 기존 3-파라미터 피팅 + 반경→페이즈 추정 폴백.

### 좌표 변환 주의
호 픽셀(프레임) → perspectiveTransform(H) → 기준맵 1200px → /MAPN(1200) → 게임좌표 0~1. CircleData는 게임좌표(이미지계). 프론트 Leaflet은 [1-y, x] 변환은 기존 렌더가 처리.

## 한계 / 후속
- 흰 픽셀 오염(글자·UI·밝은 지형선)·단색 지형 호모그래피 실패 = v3.
- 페이즈를 모를 때(OCR 실패)는 v1 추정 경로라 여전히 약함.
