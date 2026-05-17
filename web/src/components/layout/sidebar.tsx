"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  MessageSquareText,
  Users,
  ClipboardList,
  NotebookPen,
  Mail,
  Settings,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Upload,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/avatar";
import { api } from "../../../convex/_generated/api";

const navGroups = [
  {
    label: "Workspace",
    items: [
      { href: "/comments", label: "Comments", icon: MessageSquareText },
      { href: "/roster", label: "Roster", icon: Users },
      { href: "/lessons", label: "Lessons", icon: ClipboardList },
      { href: "/lessons/agenda", label: "Agenda", icon: NotebookPen },
      { href: "/email", label: "Email Digest", icon: Mail },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/import", label: "Bulk import", icon: Upload },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.currentUser);

  useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon =
    !mounted ? Monitor : theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel =
    !mounted ? "Theme" : theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  if (pathname?.startsWith("/sign-in")) return null;

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">ClassroomSuite</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pt-5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href + "/"));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "border-l-2 border-primary bg-primary/5 pl-[10px] text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t px-3 py-3">
        <button
          onClick={cycleTheme}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ThemeIcon className="h-4 w-4 shrink-0" />
          <span>{themeLabel}</span>
        </button>
        <div className="flex w-full items-center gap-2.5 rounded-md px-3 py-2">
          {currentUser?.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUser.picture}
              alt=""
              className="h-7 w-7 rounded-full shrink-0 ring-1 ring-inset ring-foreground/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Avatar name={currentUser?.name || currentUser?.email || "User"} size="sm" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {currentUser?.name || "User"}
            </p>
            {currentUser?.email && (
              <p className="truncate text-[11px] text-muted-foreground">
                {currentUser.email}
              </p>
            )}
          </div>
          <button
            onClick={() => void signOut()}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
