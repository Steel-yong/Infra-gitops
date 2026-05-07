// 루트 레이아웃 — 전체 앱 공통 HTML 구조
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PUBG Helper',
  description: '배틀그라운드 자기장 분석 + 프로 위치 추천',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
