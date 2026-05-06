import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers";
import router from "./router";
import "./styles.css";
import "./calendar-shell-refresh.css";
import "./admin-dashboard-client-copy.css";
import "./admin-final-fixes.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
