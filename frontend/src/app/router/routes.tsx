import { Navigate, type RouteObject } from "react-router-dom";
import SitePreparationPage from "../../components/screens/SitePreparationPage";
import PublicLayout from "../../layouts/PublicLayout";
import AdminLayout from "../../layouts/AdminLayout";
import LandingPage from "../../pages/landing/LandingPage";
import MyBookingsPage from "../../pages/my/MyBookingsPage";
import RecoverPage from "../../pages/recover/RecoverPage";
import AdminGatePage from "../../pages/admin/AdminGatePage";
import AdminDashboardPage from "../../pages/admin/AdminDashboardPage";
import AdminBookingPage from "../../pages/admin/AdminBookingPage";
import NotFoundPage from "../../pages/shared/NotFoundPage";
import ForbiddenPage from "../../pages/shared/ForbiddenPage";
import ServerErrorPage from "../../pages/shared/ServerErrorPage";
import { isSiteHoldingPageEnabled } from "../../lib/holding-mode";
import { AdminRouteGuard } from "./guards";

const holdingRoutes: RouteObject[] = [
  { path: "*", element: <SitePreparationPage /> },
];

const applicationRoutes: RouteObject[] = [
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "meus-agendamentos", element: <MyBookingsPage /> },
      { path: "my", element: <Navigate to="/meus-agendamentos" replace /> },
      { path: "recover", element: <RecoverPage /> },
      { path: "403", element: <ForbiddenPage /> },
      { path: "500", element: <ServerErrorPage /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminRouteGuard requiredWorkspace="ADMIN" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminGatePage /> },
          { path: "dashboard", element: <AdminDashboardPage /> },
          { path: "booking/:eventId", element: <AdminBookingPage /> },
        ],
      },
    ],
  },
  {
    path: "/prestador",
    element: <AdminRouteGuard requiredWorkspace="PROVIDER" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "dashboard", element: <AdminDashboardPage /> },
          { path: "booking/:eventId", element: <AdminBookingPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export const routes = isSiteHoldingPageEnabled() ? holdingRoutes : applicationRoutes;
