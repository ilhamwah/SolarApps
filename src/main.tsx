import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Register a minimal service worker so supported browsers can install Solar Apps as a PWA.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Solar Apps service worker registration failed:", error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
