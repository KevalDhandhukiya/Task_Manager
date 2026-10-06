import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { io } from "socket.io-client";
import { useAppStore } from "@/store/appStore";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

// Keep other imports
import { LoginPage } from "@/pages/LoginPage";
import { MainLayout } from "@/layouts/MainLayout";
import { Dashboard } from "@/pages/Dashboard";
import { TaskBoard } from "@/pages/TaskBoard";
import { TaskWorkspace } from "@/pages/TaskWorkspace";
import { TeamChat } from "@/pages/TeamChat";
import { ProfilePage } from "@/pages/ProfilePage";
import { TeamDirectory } from "@/pages/TeamDirectory";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { AllTasksPage } from "@/pages/AllTasksPage";
import { MyTasksSplitView } from "@/pages/MyTasksSplitView";
import { Toaster, toast } from "sonner";
import type { Task } from "@/types";

export type Page =
  | "dashboard"
  | "tasks"
  | "my-tasks"
  | "projects"
  | "reports"
  | "task-workspace"
  | "chat"
  | "profile"
  | "team"
  | "archived";

function App() {
  const {
    isAuthenticated,
    currentPage,
    selectedTask,
    setPage,
    setSelectedTask,
    fetchInitialData,
    receiveNewComment,
  } = useAppStore();

  const [lastBoardPage, setLastBoardPage] = useState<Page>("tasks");

  useEffect(() => {
    fetchInitialData();

    // Live synchronization listeners
    socket.on("task:created", (data: any) => {
      const { currentUser, users } = useAppStore.getState();
      console.log("TACTICAL DEBUG: New Mission Payload Received", data);

      const task = data.task || data;
      const assignees = task.assignees || [];

      // Authority Check: Only toast if the current user is an assignee
      const isTargeted = assignees.some((a: any) => {
        const aid = typeof a === "object" ? a.id : a;
        return String(aid) === String(currentUser?.id);
      });

      if (isTargeted) {
        const creatorId = task.createdBy?.id || task.createdBy;
        const creator = users.find((u) => String(u.id) === String(creatorId));

        // Data Inflation Hub: Map raw IDs to full user objects before navigation
        const hydratedTask: Task = {
          ...task,
          id: String(task.id),
          assignees: (task.assignees || [])
            .map((aid: any) =>
              users.find(
                (u) =>
                  String(u.id) ===
                  String(typeof aid === "object" ? aid.id : aid),
              ),
            )
            .filter(Boolean),
          createdBy: creator || users[0],
          updatedBy:
            users.find((u) => String(u.id) === String(task.updatedBy)) ||
            creator ||
            users[0],
          comments: task.comments || [],
          attachments: task.attachments || [],
        };

        toast.success(`${creator?.name || "Mission Control"} assigned you a new task`, {
          description: `Task: ${task.title}`,
          action: {
            label: "View Mission",
            onClick: () => {
              // Tactical Enforcement: Ensure task is in the main store list before selection
              const existing = useAppStore.getState().tasks.find(t => String(t.id) === String(task.id));
              navigateTo("task-workspace", existing || hydratedTask);
            },
          },
          duration: 5000,
        });
      }
      fetchInitialData();
    });
    socket.on("task:updated", () => {
      fetchInitialData();
    });
    socket.on("task:deleted", (deletedId) => {
      if (selectedTask && String(selectedTask.id) === String(deletedId)) {
        setSelectedTask(null);
      }
      fetchInitialData();
    });
    socket.on("comment:new", (data) => {
      const { currentUser, users } = useAppStore.getState();
      // Focus Enforcement: Alert user when a mission update occurs, unless they are the author
      const authorId = data.comment?.author?.id || data.comment?.author;
      if (String(authorId) !== String(currentUser?.id)) {
        const author = users.find((u) => String(u.id) === String(authorId));
        toast(`${author?.name || "Operative"} sent a message`, {
          description:
            data.comment.content.substring(0, 50) +
            (data.comment.content.length > 50 ? "..." : ""),
          icon: <MessageSquare className="w-4 h-4 text-indigo-600" />,
          action: {
            label: "Analyze",
            onClick: () => {
              const targetTask = useAppStore
                .getState()
                .tasks.find((t) => String(t.id) === String(data.taskId));
              if (targetTask) navigateTo("task-workspace", targetTask);
            },
          },
          duration: 5000,
        });
      }
      receiveNewComment(data.taskId, data.comment);
    });

    return () => {
      socket.off("task:created");
      socket.off("task:updated");
      socket.off("task:deleted");
      socket.off("comment:new");
    };
  }, [fetchInitialData, isAuthenticated]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const pathMap: Record<string, Page> = {
        "/": "dashboard",
        "/projects": "projects",
        "/tasks": "tasks",
        "/my-tasks": "my-tasks",
        "/chat": "chat",
        "/profile": "profile",
        "/team": "team",
        "/reports": "reports",
        "/archived": "archived",
        "/task-workspace": "task-workspace",
      };
      const page = pathMap[path] || "dashboard";
      if (currentPage !== page) {
        setPage(page);
      }
    };

    if (isAuthenticated) {
      handlePopState();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setPage, isAuthenticated, currentPage]);

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        useAppStore.getState().fetchNotifications();
      }, 5000); // High-Precision Polling: Synchronize every 5 mission-seconds (WhatsApp-like speed)
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const navigateTo = (page: Page, task?: Task) => {
    if (
      page === "task-workspace" &&
      (currentPage === "tasks" ||
        currentPage === "my-tasks" ||
        currentPage === "projects")
    ) {
      setLastBoardPage(currentPage);
    }
    setPage(page);
    if (task) {
      setSelectedTask(task);
    }
  };

  // Tactical Hash-Based Routing: Guaranteed to work on all servers
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={navigateTo} />;
      case "tasks": {
        const { currentUser } = useAppStore.getState();
        if (currentUser?.role !== "Administrator")
          return <Dashboard onNavigate={navigateTo} />;
        return <AllTasksPage key="all-tasks" onNavigate={navigateTo} />;
      }
      case "projects":
        return <ProjectsPage onNavigate={navigateTo} />;
      case "reports":
        return <ReportsPage />;
      case "my-tasks":
        return <MyTasksSplitView onNavigate={navigateTo} />;
      case "task-workspace":
        return selectedTask ? (
          <TaskWorkspace
            key={`workspace-${selectedTask.id}`}
            task={selectedTask}
            onNavigate={(page) =>
              navigateTo(
                page === "tasks" ? (lastBoardPage as Page) : (page as Page),
              )
            }
          />
        ) : (
          <TaskBoard key="fallback-tasks" onNavigate={navigateTo} />
        );
      case "chat":
        return <TeamChat />;
      case "profile":
        return <ProfilePage />;
      case "team":
        return <TeamDirectory />;
      case "archived":
        return (
          <TaskBoard
            key="archived-tasks"
            onNavigate={navigateTo}
            archiveModeOnly
            filterByCurrentUser
          />
        );
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <>
      <Toaster position="top-right" expand={false} richColors closeButton duration={5000} />
      <MainLayout onNavigate={navigateTo}>{renderPage()}</MainLayout>
    </>
  );
}

export default App;
