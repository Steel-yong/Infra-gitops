// 자기장 알림 임계값(30/20/10초) 체크박스 UI 컴포넌트
const THRESHOLDS = [30, 20, 10] as const;

interface AlertSettingsProps {
  /** 현재 활성화된 임계값 목록 (예: [30, 10]) */
  enabled: number[];
  onChange: (enabled: number[]) => void;
  /** true이면 권한 거부 경고 배너를 표시한다 */
  permissionDenied: boolean;
}

/**
 * 30/20/10초 체크박스 3개는 독립적으로 선택 가능하다.
 * 권한이 거부된 경우 경고 배너를 표시한다.
 */
export function AlertSettings({ enabled, onChange, permissionDenied }: AlertSettingsProps) {
  function handleChange(seconds: number, checked: boolean) {
    if (checked) {
      onChange([...enabled, seconds]);
    } else {
      onChange(enabled.filter((s) => s !== seconds));
    }
  }

  return (
    <div aria-label="알림 설정">
      {permissionDenied && (
        <p role="alert">브라우저 알림 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.</p>
      )}
      <fieldset>
        <legend>자기장 알림 시간</legend>
        {THRESHOLDS.map((seconds) => (
          <label key={seconds}>
            <input
              type="checkbox"
              checked={enabled.includes(seconds)}
              onChange={(e) => handleChange(seconds, e.target.checked)}
              aria-label={`${seconds}초 알림`}
            />
            {seconds}초
          </label>
        ))}
      </fieldset>
    </div>
  );
}
