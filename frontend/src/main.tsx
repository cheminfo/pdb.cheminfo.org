import { OverlaysProvider } from '@blueprintjs/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import AboutRoute from './pages/about/AboutRoute.tsx';
import ApiPage from './pages/api/ApiPage.tsx';
import BrowsePage from './pages/browse/BrowsePage.tsx';
import HomePage from './pages/home/HomePage.tsx';
import MoleculesPage from './pages/molecules/MoleculesPage.tsx';
import ScriptingPage from './pages/scripting/ScriptingPage.tsx';
import SettingsPage from './pages/settings/SettingsPage.tsx';
import StatsPage from './pages/stats/StatsPage.tsx';
import Layout from './shared/Layout.tsx';

import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import './styles.css';

const container = document.querySelector('#root');
if (!container) {
  throw new Error('Missing #root element in index.html.');
}

createRoot(container).render(
  <StrictMode>
    <OverlaysProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/scripting" element={<ScriptingPage />} />
            <Route path="/scripting/:pdbId" element={<ScriptingPage />} />
            <Route path="/molecules" element={<MoleculesPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/api" element={<ApiPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutRoute />} />
            {/* An unknown address opens the home page, which is also how the
                server indexes it (backend/src/api/pageMeta.js). */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </OverlaysProvider>
  </StrictMode>,
);
