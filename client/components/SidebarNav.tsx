// client/components/SidebarNav.tsx
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CheckSquare,
  Trophy,
  FileText,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Members",
    href: "/members",
    icon: Users,
  },
  {
    name: "Events",
    href: "/events",
    icon: BookOpen,
  },
  {
    name: "Attendance",
    href: "/attendance",
    icon: CheckSquare,
  },
  {
    name: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function SidebarNav() {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        "h-screen sticky top-0", // Membuat tinggi penuh halaman dan sticky
        isExpanded ? "w-64" : "w-20"
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border flex-shrink-0">
        {isExpanded && (
          <div className="flex items-center gap-2 min-w-0"> {/* min-w-0 untuk mengatasi overflow */}
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
              VA
            </div>
            <span className="font-bold text-lg truncate">VISIATTEND</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0",
            !isExpanded && "mx-auto" // Tengahin icon saat collapsed
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ChevronDown 
            className={cn(
              "w-4 h-4 transition-transform", 
              !isExpanded ? "rotate-90" : "-rotate-90" // Sesuaikan arah panah
            )} 
          />
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto min-h-0"> {/* min-h-0 untuk flex child */}
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground",
                !isExpanded && "justify-center px-2" // Center content saat collapsed
              )}
              title={!isExpanded ? item.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer - selalu tampil */}
      <div className={cn(
        "p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60 flex-shrink-0",
        !isExpanded && "text-center" // Center text saat collapsed
      )}>
        {isExpanded ? (
          <p>© 2026 VISIATTEND</p>
        ) : (
          <p>©</p> // Versi singkat saat collapsed
        )}
      </div>
    </div>
  );
}