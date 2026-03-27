import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PlayProvider } from './PlayContext.jsx';
import JoinPage from './pages/JoinPage.jsx';
import WaitingPage from './pages/WaitingPage.jsx';
import StoryPage from './pages/StoryPage.jsx';
import KeyTakeawayPage from './pages/KeyTakeawayPage.jsx';
import WaitNextPage from './pages/WaitNextPage.jsx';
import FinishedPage from './pages/FinishedPage.jsx';

export default function PlayRoot() {
  return (
    <PlayProvider>
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="waiting" element={<WaitingPage />} />
        <Route path="story" element={<StoryPage />} />
        <Route path="takeaway" element={<KeyTakeawayPage />} />
        <Route path="wait-next" element={<WaitNextPage />} />
        <Route path="finished" element={<FinishedPage />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </PlayProvider>
  );
}
