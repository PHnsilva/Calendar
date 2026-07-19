import { lazy, Suspense, type ReactElement } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import SitePreparationPage from "../../components/screens/SitePreparationPage";
import PublicLayout from "../../layouts/PublicLayout";
import LandingPage from "../../pages/landing/LandingPage";
import { isSiteHoldingPageEnabled } from "../../lib/holding-mode";
import { AdminRouteGuard } from "./guards";
import RouteObserver from "../route-observer";

const AdminLayout = lazy(() => import("../../layouts/AdminLayout"));
const MyBookingsPage = lazy(() => import("../../pages/my/MyBookingsPage"));
const RecoverPage = lazy(() => import("../../pages/recover/RecoverPage"));
const AdminGatePage = lazy(() => import("../../pages/admin/AdminGatePage"));
const AdminDashboardPage = lazy(() => import("../../pages/admin/AdminDashboardPage"));
const AdminBookingPage = lazy(() => import("../../pages/admin/AdminBookingPage"));
const NotFoundPage = lazy(() => import("../../pages/shared/NotFoundPage"));
const ForbiddenPage = lazy(() => import("../../pages/shared/ForbiddenPage"));
const ServerErrorPage = lazy(() => import("../../pages/shared/ServerErrorPage"));
const DeferredAppProvidersLayout = lazy(() => import("../providers/deferred-app-providers-layout"));

function deferred(element: ReactElement) {
  return <Suspense fallback={<main aria-busy="true" aria-live="polite" className="route-loading">Carregando…</main>}>{element}</Suspense>;
}

const holdingRoutes: RouteObject[] = [
  { path: "*", element: <SitePreparationPage /> },
];

const applicationRoutes: RouteObject[] = [{
  element: <RouteObserver />,
  children: [
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
    ],
  },
  {
    element: deferred(<DeferredAppProvidersLayout />),
    children: [
      {
        path: "/",
        element: <PublicLayout />,
        children: [
      { path: "meus-agendamentos", element: deferred(<MyBookingsPage />) },
      { path: "my", element: <Navigate to="/meus-agendamentos" replace /> },
      { path: "recover", element: deferred(<RecoverPage />) },
      { path: "403", element: deferred(<ForbiddenPage />) },
      { path: "500", element: deferred(<ServerErrorPage />) },
        ],
      },
      {
        path: "/admin",
        element: <AdminRouteGuard requiredWorkspace="ADMIN" />,
        children: [
          {
            element: deferred(<AdminLayout />),
            children: [
              { index: true, element: deferred(<AdminGatePage />) },
              { path: "dashboard", element: deferred(<AdminDashboardPage />) },
              { path: "booking/:eventId", element: deferred(<AdminBookingPage />) },
            ],
          },
        ],
      },
      {
        path: "/prestador",
        element: <AdminRouteGuard requiredWorkspace="PROVIDER" />,
        children: [
          {
            element: deferred(<AdminLayout />),
            children: [
              { index: true, element: deferred(<AdminDashboardPage />) },
              { path: "dashboard", element: deferred(<AdminDashboardPage />) },
              { path: "booking/:eventId", element: deferred(<AdminBookingPage />) },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: deferred(<NotFoundPage />),
  },
  ],
}];

export const routes = isSiteHoldingPageEnabled() ? holdingRoutes : applicationRoutes;
