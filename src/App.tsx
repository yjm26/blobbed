import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './Landing';
import GatePage from './pages/GatePage';
import DrivePage from './pages/DrivePage';
import ViewPage from './pages/ViewPage';
import DownloadPage from './pages/DownloadPage';
import LegacyPagesRedirect from './pages/LegacyPagesRedirect';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/gate" element={<GatePage />} />
      <Route path="/drive" element={<DrivePage />} />
      <Route path="/app" element={<Navigate to="/gate" replace />} />
      <Route path="/view" element={<ViewPage />} />
      <Route path="/download" element={<DownloadPage />} />
      {/* Old multi-page URLs */}
      <Route path="/pages/*" element={<LegacyPagesRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
