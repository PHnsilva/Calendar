import { Outlet } from "react-router-dom";
import { AppProviders } from "./app-providers";

export default function DeferredAppProvidersLayout() {
  return <AppProviders><Outlet /></AppProviders>;
}
