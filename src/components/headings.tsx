import type { ReactNode } from 'react';
import { useNow, useTimezone } from '../app/providers';
import { zoneLabelWithAbbr } from '../lib/time';

interface PageHeaderProps {
  title: string;
  lede?: string;
  /** Show the active timezone as context on the right. */
  showZone?: boolean;
}

export function PageHeader({ title, lede, showZone }: PageHeaderProps) {
  const { tz } = useTimezone();
  const nowMs = useNow();
  return (
    <header className="page-header">
      <div className="page-header__text">
        <h1 className="page-header__title">{title}</h1>
        {lede && <p className="page-header__lede">{lede}</p>}
      </div>
      {showZone && (
        <span className="page-header__zone">
          Times in <strong>{zoneLabelWithAbbr(tz, nowMs)}</strong>
        </span>
      )}
    </header>
  );
}

export function SectionLabel({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="section-label">
      {children}
      {count !== undefined && <span className="section-label__count">{count}</span>}
    </h2>
  );
}
