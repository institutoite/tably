import { createContext, useContext, useState } from "react";

const TestContext = createContext();

export function TestProvider({ children }) {
  const [isTestActive, setIsTestActive] = useState(false);
  return (
    <TestContext.Provider value={{ isTestActive, setIsTestActive }}>
      {children}
    </TestContext.Provider>
  );
}

export function useTest() {
  return useContext(TestContext);
}