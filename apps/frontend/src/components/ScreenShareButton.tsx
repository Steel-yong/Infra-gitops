// 화면공유 시작/중지 버튼 컴포넌트
interface ScreenShareButtonProps {
  isCapturing: boolean;
  onStart: () => Promise<void>;
  onStop: () => void;
}

/** 캡처 상태에 따라 시작/중지 텍스트를 전환한다. */
export function ScreenShareButton({ isCapturing, onStart, onStop }: ScreenShareButtonProps) {
  return (
    <button onClick={isCapturing ? onStop : onStart} aria-pressed={isCapturing}>
      {isCapturing ? '화면공유 중지' : '화면공유 시작'}
    </button>
  );
}
