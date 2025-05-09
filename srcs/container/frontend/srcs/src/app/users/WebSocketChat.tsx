import React, { useState, createContext, useContext } from 'react';
import Chat from './Chat';

// === Theme Context ===
export const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({
  dark: false,
  toggle: () => {},
});
export const useTheme = () => useContext(ThemeContext);

// Point d’entrée
export default function WebSocketChat() {
  const [dark, setDark] = useState(false);
  const toggle = () => setDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div className={`${dark ? 'dark bg-gray-900' : 'bg-gray-50'} h-screen`}>
        <Chat />
      </div>
    </ThemeContext.Provider>
  );
}
