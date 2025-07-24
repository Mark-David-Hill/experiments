import { useState, createContext } from "react";
export const GridBoardContext = createContext();

export default function CartProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const contextState = {
    isDarkMode,
    setIsDarkMode,
  };

  return (
    <GridBoardContext.Provider value={contextState}>
      {children}
    </GridBoardContext.Provider>
  );
}
