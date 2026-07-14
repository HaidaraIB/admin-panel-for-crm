import React from 'react';
import type { CSSProperties } from 'react';

export type ChartTheme = {
  isDark: boolean;
  grid: string;
  axis: string;
  legend: string;
  primary: string;
  primaryLight: string;
  muted: string;
  tooltipContent: CSSProperties;
  tooltipLabel: CSSProperties;
  tooltipItem: CSSProperties;
};

export function getChartTheme(isDark: boolean): ChartTheme {
  return {
    isDark,
    grid: isDark ? '#4b5563' : '#e5e7eb',
    axis: isDark ? '#9ca3af' : '#6b7280',
    legend: isDark ? '#f3f4f6' : '#374151',
    primary: isDark ? '#a5b4fc' : '#6366f1',
    primaryLight: isDark ? '#c7d2fe' : '#818cf8',
    muted: isDark ? '#d1d5db' : '#6b7280',
    tooltipContent: isDark
      ? {
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          border: 'none',
          borderRadius: '8px',
          color: '#f3f4f6',
        }
      : {
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          color: '#111827',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
    tooltipLabel: isDark ? { color: '#d1d5db' } : { color: '#6b7280' },
    tooltipItem: isDark ? { color: '#f9fafb' } : { color: '#111827' },
  };
}

type LegendPayloadItem = {
  value?: string;
  color?: string;
};

export function renderChartLegend(theme: ChartTheme, language: string) {
  return ({ payload }: { payload?: LegendPayloadItem[] }) => (
    <ul
      className="recharts-default-legend"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '12px 20px',
        padding: 0,
        margin: '8px 0 0',
        listStyle: 'none',
        direction: language === 'ar' ? 'rtl' : 'ltr',
      }}
    >
      {(payload ?? []).map((entry, index) => (
        <li
          key={`legend-${entry.value ?? index}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: theme.legend,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: entry.color || theme.primary,
              flexShrink: 0,
            }}
          />
          <span style={{ color: theme.legend }}>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function useIsDarkMode(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.documentElement.classList.contains('dark');
}
