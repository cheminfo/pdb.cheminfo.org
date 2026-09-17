import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  CiteButton,
  EcosystemButton,
  HiddenPartsProvider,
  NavLink as HeaderLink,
  ShareButton,
  ShareDialog,
  SiteFooter,
  SiteHeader,
  SiteMark,
  SiteTheme,
} from 'react-cheminfo/ui';
import { NavLink, useLocation, useNavigate } from 'react-router';

import { ABOUT } from '../about.ts';
import {
  DEFAULT_SHARE_PRESET,
  SHARE_PRESETS,
  SHARE_VOCABULARY,
  readShareConfig,
} from '../state/shareConfig.ts';

import SeedingBanner from './SeedingBanner.tsx';

interface LayoutProps {
  children: ReactNode;
}

const SITE_NAME = 'pdb.cheminfo.org';

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
 * the routed page below it. A link carrying `?embed` renders the page alone,
 * with neither the header nor the footer.
 * @param props - Component props.
 * @param props.children - Page content rendered below the header.
 * @returns The shell element wrapping the active route.
 */
export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const share = readShareConfig(search);
  const [isSharing, setIsSharing] = useState(false);
  const pageLabel =
    PAGES.find((page) => page.to === pathname)?.label ??
    (pathname === '/about' ? 'About' : 'Home');

  return (
    <HiddenPartsProvider hidden={share.hidden}>
      <SiteTheme siteId="pdb" />
      <div className="app-shell">
        <SiteHeader
          siteId="pdb"
          embedded={share.embed}
          width="full"
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
              {/* The icon is what About keeps once a narrow bar drops the labels. */}
              <HeaderLink
                item={{
                  id: '/about',
                  label: 'About',
                  icon: <SiteMark siteId="pdb" size={14} />,
                  href: '/about',
                  title: 'About pdb.cheminfo.org',
                  onSelect: () => void navigate('/about'),
                }}
                active={pathname === '/about'}
              />
              <CiteButton works={ABOUT.cite ?? []} />
              <EcosystemButton currentSiteId="pdb" />
              <ShareButton
                onClick={() => {
                  setIsSharing(true);
                }}
              />
            </>
          }
        />
        <SeedingBanner />
        <main className="app-main">{children}</main>
      </div>
      <SiteFooter siteId="pdb" embedded={share.embed} width="full" />
      <ShareDialog
        isOpen={isSharing}
        onClose={() => {
          setIsSharing(false);
        }}
        vocabulary={SHARE_VOCABULARY}
        presets={SHARE_PRESETS}
        defaultPreset={DEFAULT_SHARE_PRESET}
        title={`${pageLabel} — ${SITE_NAME}`}
        frameTitle={`${pageLabel} — ${SITE_NAME}`}
      />
    </HiddenPartsProvider>
  );
}
