import { createBrowserRouter } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import AdminLayout from "../layouts/AdminLayout";
import HomePage from "../pages/home/HomePage";
import MyBookingsPage from "../pages/my/MyBookingsPage";
import RecoverPage from "../pages/recover/RecoverPage";
import AdminGatePage from "../pages/admin/AdminGatePage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminBookingPage from "../pages/admin/AdminBookingPage";
import NotFoundPage from "../pages/shared/NotFoundPage";
import ForbiddenPage from "../pages/shared/ForbiddenPage";
import ServerErrorPage from "../pages/shared/ServerErrorPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "my", element: <MyBookingsPage /> },
      { path: "recover", element: <RecoverPage /> },
      { path: "403", element: <ForbiddenPage /> },
      { path: "500", element: <ServerErrorPage /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminGatePage /> },
      { path: "dashboard", element: <AdminDashboardPage /> },
      { path: "booking/:eventId", element: <AdminBookingPage /> },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;