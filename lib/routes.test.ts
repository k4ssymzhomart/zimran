import { describe, expect, it } from 'vitest';
import { APP_TABS, ROUTES, tabAt } from './routes';

describe('tabAt', () => {
  it('finds each of the four tab roots', () => {
    expect(tabAt('/today')?.id).toBe('today');
    expect(tabAt('/practice')?.id).toBe('practice');
    expect(tabAt('/progress')?.id).toBe('progress');
    expect(tabAt('/profile')?.id).toBe('profile');
  });

  it('returns the tab the bar draws: its label, its link and its icon pair', () => {
    expect(tabAt(ROUTES.today)).toEqual({ id: 'today', label: 'Today', href: '/today', art: 'home' });
    for (const tab of APP_TABS) expect(tabAt(tab.href)).toBe(tab);
  });

  it('ignores trailing slashes', () => {
    expect(tabAt('/today/')?.id).toBe('today');
    expect(tabAt('/progress//')?.id).toBe('progress');
  });

  it('is null below a tab root: a session review is a pushed screen with its own way back', () => {
    expect(tabAt('/progress/abc')).toBeNull();
    expect(tabAt('/progress/abc/')).toBeNull();
    expect(tabAt(ROUTES.session('abc'))).toBeNull();
  });

  it('is null everywhere else', () => {
    expect(tabAt(ROUTES.home)).toBeNull();
    expect(tabAt('')).toBeNull();
    expect(tabAt(ROUTES.play)).toBeNull();
    expect(tabAt(ROUTES.pricing)).toBeNull();
    expect(tabAt(ROUTES.kit)).toBeNull();
    expect(tabAt('/todays')).toBeNull();
    expect(tabAt('/app/today')).toBeNull();
  });
});

describe('APP_TABS', () => {
  it('lists the tabs in bar order, each on its own route', () => {
    expect(APP_TABS.map((tab) => tab.id)).toEqual(['today', 'practice', 'progress', 'profile']);
    expect(APP_TABS.map((tab) => tab.href)).toEqual([ROUTES.today, ROUTES.practice, ROUTES.progress, ROUTES.profile]);
  });
});

describe('ROUTES.session', () => {
  it('puts the review of a session under Progress', () => {
    expect(ROUTES.session('s-2026-11-10')).toBe('/progress/s-2026-11-10');
    expect(ROUTES.session('abc').startsWith(`${ROUTES.progress}/`)).toBe(true);
  });

  it('escapes an id, so it stays one path segment and reads back unchanged', () => {
    const id = 'a b/c?d#e&f=ж';
    const path = ROUTES.session(id);
    expect(path).toBe('/progress/a%20b%2Fc%3Fd%23e%26f%3D%D0%B6');
    expect(path.split('/')).toHaveLength(3);
    expect(decodeURIComponent(path.slice(`${ROUTES.progress}/`.length))).toBe(id);
  });

  it('leaves a plain id as it is', () => {
    expect(ROUTES.session('k3J9_x-1.z~')).toBe('/progress/k3J9_x-1.z~');
  });
});
