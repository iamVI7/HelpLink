import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const WarningContext = createContext();

export const WarningProvider = ({ children }) => {
  const [warnings, setWarnings] = useState([]);

  const fetchWarnings = useCallback(async () => {
    try {
      const res = await api.get('/auth/me/warnings');
      setWarnings(res.data.warnings || []);
    } catch (err) {
      console.error('Failed to fetch warnings:', err);
    }
  }, []);

  const markAsRead = useCallback(async (warningId) => {
    try {
      await api.patch(`/auth/warnings/${warningId}/read`);
      setWarnings((prev) => prev.filter((w) => w._id !== warningId));
    } catch (err) {
      console.error('Failed to mark warning as read:', err);
    }
  }, []);

  return (
    <WarningContext.Provider value={{ warnings, fetchWarnings, markAsRead }}>
      {children}
    </WarningContext.Provider>
  );
};

export const useWarning = () => useContext(WarningContext);