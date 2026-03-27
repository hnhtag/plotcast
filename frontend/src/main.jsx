import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminRoot from './admin/AdminRoot.jsx';
import PlayRoot from './play/PlayRoot.jsx';
import ScreenRoot from './screen/ScreenRoot.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminRoot />} />
        <Route path="/play/*" element={<PlayRoot />} />
        <Route path="/screen/:eventId/*" element={<ScreenRoot />} />
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
