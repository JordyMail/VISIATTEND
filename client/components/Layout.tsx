// client/components/Layout.tsx
import { ReactNode, useState } from "react";
import { SidebarNav } from "./SidebarNav";
import { HeaderNav } from "./HeaderNav";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

export function Layout({
  children,
  userName = "Admin User",
  userRole = "Administrator",
  userAvatar,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <SidebarNav />
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 z-50">
            <SidebarNav />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <HeaderNav
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          userName={userName}
          userRole={userRole}
          userAvatar={userAvatar}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
