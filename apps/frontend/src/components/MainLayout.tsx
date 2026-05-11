// 좌측 지도 영역 + 우측 패널 영역 레이아웃 컴포넌트
interface MainLayoutProps {
  map: React.ReactNode;
  panel: React.ReactNode;
}

/** 좌측 flex:1 지도 + 우측 고정 패널. overflow hidden으로 지도가 header 아래 꽉 찬다. */
export function MainLayout({ map, panel }: MainLayoutProps) {
  return (
    <div
      data-testid="main-layout"
      style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
    >
      <div style={{ flex: 1, position: 'relative' }}>{map}</div>
      {panel}
    </div>
  );
}
