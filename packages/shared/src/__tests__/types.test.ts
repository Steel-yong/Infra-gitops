// packages/shared 타입 및 유틸리티 단위 테스트

import { describe, it, expect } from 'vitest';
import { MAP_TYPES, isMapType, SocketEvents } from '../index';
import type { CircleData, LocationData, TimerState, MapType } from '../index';

describe('CircleData', () => {
  it('0~1 정규화 좌표로 객체를 생성할 수 있다', () => {
    const circle: CircleData = { x: 0.5, y: 0.3, r: 0.2 };
    expect(circle.x).toBe(0.5);
    expect(circle.y).toBe(0.3);
    expect(circle.r).toBe(0.2);
  });

  it('x, y, r이 모두 number 타입이다', () => {
    const circle: CircleData = { x: 0, y: 1, r: 0.5 };
    expect(typeof circle.x).toBe('number');
    expect(typeof circle.y).toBe('number');
    expect(typeof circle.r).toBe('number');
  });
});

describe('MapType / MAP_TYPES / isMapType', () => {
  it('v1 지원 맵은 erangel과 taego 2종이다', () => {
    expect(MAP_TYPES).toEqual(['erangel', 'taego']);
  });

  it('isMapType: 유효한 맵 문자열은 true를 반환한다', () => {
    expect(isMapType('erangel')).toBe(true);
    expect(isMapType('taego')).toBe(true);
  });

  it('isMapType: 미지원 맵 문자열은 false를 반환한다', () => {
    expect(isMapType('miramar')).toBe(false);
    expect(isMapType('rondo')).toBe(false);
    expect(isMapType('')).toBe(false);
    expect(isMapType('ERANGEL')).toBe(false);
  });

  it('MapType 변수에 유효한 값을 할당할 수 있다', () => {
    const map: MapType = 'erangel';
    expect(isMapType(map)).toBe(true);
  });
});

describe('LocationData', () => {
  it('S/A/B 등급과 맵 타입을 포함한 위치 데이터를 생성할 수 있다', () => {
    const location: LocationData = {
      id: 'loc-001',
      coordX: 0.45,
      coordY: 0.62,
      tier: 'S',
      proTeamNames: ['Team A', 'Team B'],
      usageCount: 42,
      mapType: 'erangel',
    };
    expect(location.tier).toBe('S');
    expect(location.mapType).toBe('erangel');
    expect(location.proTeamNames).toHaveLength(2);
  });
});

describe('TimerState', () => {
  it('자기장이 줄어드는 중인 상태를 표현할 수 있다', () => {
    const state: TimerState = { remainingSeconds: 30, isShrinking: true, phase: 2 };
    expect(state.isShrinking).toBe(true);
    expect(state.remainingSeconds).toBe(30);
  });

  it('다음 자기장 대기 중인 상태를 표현할 수 있다', () => {
    const state: TimerState = { remainingSeconds: 120, isShrinking: false, phase: 1 };
    expect(state.isShrinking).toBe(false);
  });
});

describe('SocketEvents', () => {
  it('FRAME_UPLOAD 이벤트 키가 올바른 문자열 값을 가진다', () => {
    expect(SocketEvents.FRAME_UPLOAD).toBe('frame:upload');
  });

  it('CIRCLE_RESULT 이벤트 키가 올바른 문자열 값을 가진다', () => {
    expect(SocketEvents.CIRCLE_RESULT).toBe('circle:result');
  });

  it('NO_MAP 이벤트 키가 올바른 문자열 값을 가진다', () => {
    expect(SocketEvents.NO_MAP).toBe('map:none');
  });

  it('TIMER_UPDATE 이벤트 키가 올바른 문자열 값을 가진다', () => {
    expect(SocketEvents.TIMER_UPDATE).toBe('timer:update');
  });

  it('4개의 소켓 이벤트가 정의되어 있다', () => {
    expect(Object.keys(SocketEvents)).toHaveLength(4);
  });
});
