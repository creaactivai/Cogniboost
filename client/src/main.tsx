import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeMonitoring, ErrorBoundary, ErrorFallback } from "./lib/monitoring";

// Initialize Sentry before rendering
initializeMonitoring();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallback={ErrorFallback}>
    <App />
  </ErrorBoundary>
);
