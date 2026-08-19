import type { ReactNode } from 'react';
import {
  CiteButton,
  EcosystemButton,
  SiteFooter,
  SiteHeader,
} from 'react-cheminfo/ui';
import { NavLink, useNavigate } from 'react-router';

import SeedingBanner from './SeedingBanner.tsx';
import { PAPER } from './paper.ts';

interface LayoutProps {
  children: ReactNode;
}

const PAGES = [
  { to: '/', label: 'Home' },
  { to: '/browse', label: 'Browse' },
  { to: '/scripting', label: 'Scripting' },
  { to: '/molecules', label: 'Molecules' },
  { to: '/stats', label: 'Stats' },
  { to: '/api', label: 'API' },
  { to: '/settings', label: 'Settings' },
] as const;

/**
 * Application shell: the header every *.cheminfo.org site carries — the brand
 * linking home, the pages next to it, and the utilities pushed right — with
 * the routed page below it.
 * @param props - Component props.
 * @param props.children - Page content rendered below the header.
 * @returns The shell element wrapping the active route.
 */
export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <SiteHeader
        siteId="pdb"
        nav={PAGES.map((page) => ({ id: page.to, label: page.label }))}
        onHome={() => void navigate('/')}
        renderNavItem={(item) => (
          <NavLink
            to={item.id}
            end={item.id === '/'}
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link--active' : 'nav-link'
            }
          >
            {item.label}
          </NavLink>
        )}
        actions={
          <>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link--active' : 'nav-link'
              }
            >
              About
            </NavLink>
            <CiteButton reference={PAPER} />
            <EcosystemButton currentSiteId="pdb" />
          </>
        }
      />
      <SeedingBanner />
      <main className="app-main">{children}</main>
      <SiteFooter siteId="pdb" />
    </div>
  );
}
