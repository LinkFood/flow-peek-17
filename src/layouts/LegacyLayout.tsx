import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

export const LegacyLayout = () => (
  <div className="flex min-h-screen w-full">
    <Sidebar />
    <Outlet />
  </div>
);
