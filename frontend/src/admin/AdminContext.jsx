import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveEventToHistory, updateEventTitle } from '../utils/eventHistory.js';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('adminToken') || null);
  const [eventId, setEventId] = useState(() => sessionStorage.getItem('adminEventId') || null);
  const [eventData, setEventData] = useState(null); // { meta, stories, characters }
  const [liveState, setLiveState] = useState(null);

  useEffect(() => {
    if (eventId && eventData?.meta?.title) {
      updateEventTitle(eventId, eventData.meta.title);
    }
  }, [eventId, eventData]);

  function login(newToken) {
    sessionStorage.setItem('adminToken', newToken);
    setToken(newToken);
  }

  function selectEvent(id) {
    sessionStorage.setItem('adminEventId', id);
    setEventId(id);
    setEventData(null);
    setLiveState(null);
    saveEventToHistory(id, '');
  }

  function logout() {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminEventId');
    setToken(null);
    setEventId(null);
    setEventData(null);
    setLiveState(null);
  }

  return (
    <AdminContext.Provider value={{ token, eventId, eventData, liveState, setEventData, setLiveState, login, selectEvent, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
