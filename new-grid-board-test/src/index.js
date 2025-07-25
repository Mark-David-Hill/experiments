import React from "react";
import ReactDOM from "react-dom";
import ContextProvider from "./components/context/ContextProvider";
import App from "./App";

ReactDOM.render(
  <React.StrictMode>
    <ContextProvider>
      <App />
    </ContextProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
