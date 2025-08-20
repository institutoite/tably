import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TestProvider } from "./contexts/TestContext";
import './index.css'; // o './main.css' según tu proyecto

ReactDOM.createRoot(document.getElementById("root")).render(
  <TestProvider>
    <App />
  </TestProvider>
);
