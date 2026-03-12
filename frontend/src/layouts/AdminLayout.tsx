import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Outlet />
    </div>
  );
}
