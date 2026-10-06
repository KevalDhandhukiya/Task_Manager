import { useState, useEffect } from "react";
import {
  FolderKanban,
  CheckSquare,
  Bell,
  Search,
  Plus,
  LogOut,
  ChevronDown,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { NotificationPanel } from "@/components/NotificationPanel";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { useAppStore } from "@/store/appStore";
import type { Page } from "@/App";

interface MainLayoutProps {
  children: React.ReactNode;
  onNavigate: (page: Page, task?: any) => void;
}

export function MainLayout({ children, onNavigate }: MainLayoutProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close any open dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const close = () => {
      setUserMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [userMenuOpen]);

  const {
    currentPage,
    currentUser,
    logout,
    getUnreadCount,
    tasks,
    projects,
    setActiveProjectId,
    isCreateTaskOpen,
    setCreateTaskOpen,
    setCreateTaskProjectId,
    lastSeenCount,
    setLastSeenCount,
  } = useAppStore();

  const unreadCount = getUnreadCount();
  const [hasNewPulse, setHasNewPulse] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);

  // Strategic Persistent Pulse Hub
  useEffect(() => {
    // Authority: If no unread missions exist, absolute visual silence is required
    if (unreadCount === 0) {
      setHasNewPulse(false);
      setAlertVisible(false);
      return;
    }

    // Mission Logic: Identify if COMPLETELY NEW missions have arrived since the last seen count
    if (unreadCount > lastSeenCount) {
      setHasNewPulse(true);
      setAlertVisible(true);
    } else {
      // Unread count exists but was already acknowledged in current mission view
      setHasNewPulse(false);
      setAlertVisible(false);
    }
  }, [unreadCount, lastSeenCount]);

  const handleOpenNotifications = (open: boolean) => {
    setNotificationsOpen(open);
    if (open) {
      setHasNewPulse(false);
      setAlertVisible(false);
      setLastSeenCount(unreadCount);
    }
  };

  const isAdmin = currentUser?.role === "Administrator";

  // Count only the current user's active (non-archived) tasks
  const myTaskCount = currentUser
    ? tasks.filter(
        (t) => !t.archived && t.assignees.some((a) => a.id === currentUser.id),
      ).length
    : 0;

  const filteredTasks = tasks
    .filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5);
  const filteredProjects = projects
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 3);
  const hasResults =
    searchQuery.length > 0 &&
    (filteredTasks.length > 0 || filteredProjects.length > 0);

  const handleNavClick = (id: string) => {
    onNavigate(id as Page);
  };

  const handleLogout = () => {
    logout();
  };

  if (!currentUser) return null;

  // Nav items adapted to our project
  type NavItem = { id: Page; label: string };
  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "my-tasks", label: "My Tasks" },
    { id: "projects", label: "Projects" },
    ...(isAdmin ? [{ id: "tasks" as Page, label: "All Tasks" }] : []),
    { id: "team", label: "Team" },
    { id: "reports", label: "Reports" },
    { id: "archived", label: "Archive" },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#F9FAFB] dark:bg-[#030712] overflow-hidden">
      {/* ─── TOP NAVIGATION BAR ─── */}
      <header className="h-11 min-h-[44px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-2 z-30 shrink-0 shadow-sm">
        {/* Logo - Dashboard Icon version */}
        <button
          onClick={() => handleNavClick("dashboard")}
          className="flex items-center justify-center w-8 h-8 shrink-0 hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo-icon.svg"
            alt="Dashboard"
            className="w-7 h-7 object-contain"
          />
        </button>

        {/* Nav Items */}
        <nav className="hidden md:flex items-center gap-0.5 ml-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3 h-8 rounded text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900"
                }`}
              >
                {item.label}
                {item.id === "dashboard" && myTaskCount > 0 && (
                  <span className="ml-1.5 bg-gray-200/50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {myTaskCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-1.5">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              autoComplete="off"
              className="pl-8 h-7 w-44 text-[12px] border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:w-56 transition-all focus:ring-1 focus:ring-gray-300"
            />
            {isSearchFocused && hasResults && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50">
                <div className="p-3 space-y-3">
                  {filteredProjects.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Projects
                      </p>
                      {filteredProjects.map((p) => (
                        <button
                          key={p.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setActiveProjectId(p.id);
                            onNavigate("projects");
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[12px] font-medium text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <FolderKanban className="w-3.5 h-3.5 text-gray-400" />
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredTasks.length > 0 && (
                    <div>
                      <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Tasks
                      </p>
                      {filteredTasks.map((t) => (
                        <button
                          key={t.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onNavigate("task-workspace", t);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[12px] font-medium text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate">{t.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New Task */}
          <Button
            onClick={() => setCreateTaskOpen(true)}
            className="h-7 w-7 p-0 rounded-lg bg-gray-900 hover:bg-black text-white shadow-none border-0 active:scale-95 transition-all"
            title="New Task"
          >
            <Plus className="w-4 h-4" />
          </Button>

          {/* Notifications */}
          <Sheet
            open={notificationsOpen}
            onOpenChange={handleOpenNotifications}
          >
            <SheetTrigger asChild>
              <button className="relative w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && alertVisible && (
                  <span
                    key={`alert-dot-${unreadCount}-${hasNewPulse}`}
                    className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white dark:border-gray-900 shadow-sm ${hasNewPulse ? "animate-pulse" : ""}`}
                  />
                )}
              </button>
            </SheetTrigger>
            <SheetContent className="w-full max-w-[450px] p-0 border-none shadow-2xl">
              <SheetHeader className="sr-only">
                <VisuallyHidden.Root>
                  <SheetTitle>Activity Feed</SheetTitle>
                  <SheetDescription>
                    Stay updated with real-time mission updates and task assignments.
                  </SheetDescription>
                </VisuallyHidden.Root>
              </SheetHeader>
              <NotificationPanel onClose={() => setNotificationsOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* User Avatar + Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUserMenuOpen(!userMenuOpen);
              }}
              className="flex items-center gap-1.5 h-7 px-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <Avatar className="w-6 h-6 border border-gray-200">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback className="bg-[#7B68EE] text-white font-bold text-[10px]">
                  {currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-[12px] font-semibold text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                {currentUser.name.split(" ")[0]}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {currentUser.email}
                  </p>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => {
                      onNavigate("profile");
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-400" />
                    Profile & Settings
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-[#F9FAFB] dark:bg-[#030712]">
        {children}
      </main>

      {/* Autofill Trap */}
      <div
        className="absolute opacity-0 pointer-events-none -top-40 h-0 overflow-hidden"
        aria-hidden="true"
      >
        <input
          type="text"
          name="chrome-trap-user"
          autoComplete="username"
          tabIndex={-1}
        />
        <input
          type="password"
          name="chrome-trap-pass"
          autoComplete="current-password"
          tabIndex={-1}
        />
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateTaskOpen}
        onOpenChange={(val) => {
          setCreateTaskOpen(val);
          if (!val) setCreateTaskProjectId(null);
        }}
      />
    </div>
  );
}
