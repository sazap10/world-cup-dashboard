import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
}

const home = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20h14V9.5" />
  </svg>
);
const fixtures = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18" />
    <path d="M8 2v4" />
    <path d="M16 2v4" />
  </svg>
);
const results = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 5h16" />
    <path d="M4 12h16" />
    <path d="M4 19h16" />
    <circle cx="8" cy="5" r="0.6" fill="currentColor" />
    <circle cx="8" cy="12" r="0.6" fill="currentColor" />
    <circle cx="8" cy="19" r="0.6" fill="currentColor" />
  </svg>
);
const tables = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 9v11" />
  </svg>
);
const knockout = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 5v4a3 3 0 0 0 3 3h4" />
    <path d="M4 19v-4a3 3 0 0 1 3-3h4" />
    <path d="M11 12h5" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: home },
  { to: '/fixtures', label: 'Fixtures', icon: fixtures },
  { to: '/results', label: 'Results', icon: results },
  { to: '/tables', label: 'Tables', icon: tables },
  { to: '/knockout', label: 'Knockout', icon: knockout },
];

export function NavTabs() {
  return (
    <nav className="nav-tabs" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `nav-tab${isActive ? ' is-active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `mobile-nav__item${isActive ? ' is-active' : ''}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
