import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Layout,
  Bell,
  MessageSquare,
  CheckCircle2,
  UserPlus,
  RefreshCw,
  ChevronDown,
  Archive,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { TaskWorkspace } from "./TaskWorkspace";
import type { Page } from "@/App";
import type { Task, Notification } from "@/types";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const statusBadgeColors = {
  todo: "bg-gray-100 text-gray-600",
  "in-progress": "bg-amber-100/80 text-amber-600",
  testing: "bg-blue-100/80 text-blue-600",
  completed: "bg-emerald-100/80 text-emerald-600",
};

const priorityBadgeColors = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-indigo-50 text-indigo-600",
  high: "bg-orange-50 text-orange-600",
};

interface MyTasksSplitViewProps {
  onNavigate: (page: Page, task?: Task) => void;
}

export function MyTasksSplitView({ onNavigate }: MyTasksSplitViewProps) {
  const { tasks, currentUser, projects, notifications, removeNotification } =
    useAppStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "updates">(
    "tasks",
  );
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedProjectFilter, setSelectedProjectFilter] =
    useState("All Projects");
  const [groupBy, setGroupBy] = useState<"project" | "status" | "priority">(
    "project",
  );

  const toggleGroup = (projectId: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const myTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        !t.archived &&
        (t.assignees.some((a) => String(a.id) === String(currentUser?.id)) ||
          String(t.createdBy?.id) === String(currentUser?.id)) &&
        (showCompleted || t.status !== "completed"),
    );
  }, [tasks, currentUser, showCompleted]);

  const filteredTasks = useMemo(() => {
    return myTasks.filter((t) => {
      const matchesProject =
        selectedProjectFilter === "All Projects" ||
        t.projectId === selectedProjectFilter;
      return matchesProject;
    });
  }, [myTasks, selectedProjectFilter]);

  // Group tasks dynamically
  const groupedTasks = useMemo(() => {
    const groups: Record<string, { id: string; name: string; tasks: Task[] }> =
      {};
    filteredTasks.forEach((task) => {
      let id = "unassigned";
      let name = "Unassigned";

      if (groupBy === "project") {
        const project = projects.find((p) => p.id === task.projectId);
        id = project ? project.id : "unassigned";
        name = project ? project.name : "Unassigned";
      } else if (groupBy === "status") {
        id = task.status;
        name = task.status.toUpperCase();
      } else if (groupBy === "priority") {
        id = task.priority;
        name = task.priority.toUpperCase() + " PRIORITY";
      }

      if (!groups[id]) {
        groups[id] = { id, name, tasks: [] };
      }
      groups[id].tasks.push(task);
    });

    Object.values(groups).forEach((group) => {
      group.tasks.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });

    // Sort groups by the most recently updated task they contain
    return Object.values(groups).sort((a, b) => {
      const aLatest = Math.max(
        ...a.tasks.map((t) => new Date(t.updatedAt).getTime()),
      );
      const bLatest = Math.max(
        ...b.tasks.map((t) => new Date(t.updatedAt).getTime()),
      );
      return bLatest - aLatest;
    });
  }, [filteredTasks, projects, groupBy]);

  const [visibleCount, setVisibleCount] = useState(20);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset visibleCount when filters/grouping changes
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedProjectFilter, groupBy, showCompleted]);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            visibleCount < filteredTasks.length
          ) {
            setVisibleCount((prev) => prev + 20);
          }
        },
        { threshold: 0.1 },
      );
      if (node) observerRef.current.observe(node);
    },
    [filteredTasks.length, visibleCount],
  );

  const displayedGroups = useMemo(() => {
    let count = 0;
    return groupedTasks
      .map((group) => {
        if (count >= visibleCount) return { ...group, tasks: [] };
        const tasksToShow = group.tasks.slice(0, visibleCount - count);
        count += tasksToShow.length;
        return { ...group, tasks: tasksToShow };
      })
      .filter((g) => g.tasks.length > 0);
  }, [groupedTasks, visibleCount]);

  // Group updates by project (Only Show Completed Task Updates)
  const groupedUpdates = useMemo(() => {
    const groups: Record<
      string,
      { project: any; notifications: Notification[] }
    > = {};

    notifications
      .filter((notif) => {
        const message = notif.message.toLowerCase();
        // Authority: Must be explicitly 'completed' update or 'task-done' signal
        const isCompletionSignal =
          message.includes("completed") ||
          message.includes("done") ||
          message.includes("finish") ||
          message.includes("modified") ||
          message.includes("updated");

        if (isCompletionSignal || notif.type === "task-update") return true;

        // Contextual: If taskId exists, check current status
        if (notif.targetId) {
          const task = tasks.find((t) => t.id === notif.targetId);
          return task?.status === "completed";
        }
        return false;
      })
      .forEach((notif) => {
        let projectId = "system";
        let projectName = "System Updates";

        if (notif.targetId) {
          const task = tasks.find((t) => t.id === notif.targetId);
          if (task) {
            const project = projects.find((p) => p.id === task.projectId);
            if (project) {
              projectId = project.id;
              projectName = project.name;
            }
          }
        }

        if (!groups[projectId]) {
          groups[projectId] = {
            project: { id: projectId, name: projectName },
            notifications: [],
          };
        }
        groups[projectId].notifications.push(notif);
      });

    // Sort notifications within each group by date (newest first)
    Object.values(groups).forEach((group) => {
      group.notifications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });

    // Sort groups by the date of their latest notification (newest first)
    return Object.values(groups).sort((a, b) => {
      const aLatest = Math.max(
        ...a.notifications.map((n) => new Date(n.createdAt).getTime()),
      );
      const bLatest = Math.max(
        ...b.notifications.map((n) => new Date(n.createdAt).getTime()),
      );
      return bLatest - aLatest;
    });
  }, [notifications, tasks, projects]);

  // Auto-select most recently updated task
  useEffect(() => {
    if (!selectedTaskId && filteredTasks.length > 0) {
      const mostRecent = [...filteredTasks].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setSelectedTaskId(mostRecent[0].id);
    }
  }, [filteredTasks, selectedTaskId]);

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Dynamic Greeting Header */}
      <div className="px-8 pt-6 pb-4">
        <h1 className="text-3xl font-medium text-gray-900 tracking-tight">
          {new Date().getHours() < 12
            ? "Good morning"
            : new Date().getHours() < 18
              ? "Good afternoon"
              : "Good evening"}
          , {currentUser?.name?.split(" ")[0] || "Operative"}
          <span className="text-sm font-normal text-neutral-400 ml-4">
            You have{" "}
            <span className="font-normal text-neutral-400">
              {myTasks.length}
            </span>{" "}
            tasks,{" "}
            <span className="font-normal text-neutral-400">
              {
                myTasks.filter(
                  (t) =>
                    t.dueDate &&
                    new Date(t.dueDate).toDateString() ===
                      new Date().toDateString(),
                ).length
              }
            </span>{" "}
            are due today.
          </span>
        </h1>

        <div className="mt-8 flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-4"></div>

          <div className="flex items-center gap-8 pr-4">
            <button
              onClick={() => setActiveSubTab("tasks")}
              className={`pb-3 text-xs font-semibold uppercase tracking-widest transition-all ${
                activeSubTab === "tasks"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setActiveSubTab("updates")}
              className={`pb-3 text-xs font-semibold uppercase tracking-widest transition-all ${
                activeSubTab === "updates"
                  ? "border-b-2 border-black text-black"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Updates
            </button>
          </div>

          <div className="pb-3 flex items-center gap-3 ml-auto">
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] font-semibold uppercase tracking-widest text-gray-500 shadow-sm outline-none cursor-pointer hover:border-gray-300"
            >
              <option value="All Projects">Filter: All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] font-semibold uppercase tracking-widest text-gray-500 shadow-sm outline-none cursor-pointer hover:border-gray-300"
            >
              <option value="project">Group By: Project</option>
              <option value="status">Group By: Status</option>
              <option value="priority">Group By: Priority</option>
            </select>

            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest transition-all border shadow-sm ${
                showCompleted
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
              }`}
            >
              <Archive className="w-2.5 h-2.5" />
              {showCompleted ? "Hide Completed" : "Show Completed"}
            </button>
          </div>
        </div>
      </div>

      {/* Split View Container */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[400px] border-r border-gray-100 flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {activeSubTab === "tasks" ? (
              displayedGroups.map((group, gIndex) => (
                <div key={group.id} className="mb-4">
                  <div
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer group/title transition-all"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 group-hover/title:text-black transition-transform duration-300 ${collapsedGroups.includes(group.id) ? "-rotate-90" : ""}`}
                      />
                      <span className="text-sm font-semibold text-[#2A2E34]">
                        {group.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {group.tasks.length}
                    </span>
                  </div>

                  {!collapsedGroups.includes(group.id) && (
                    <div className="space-y-1">
                      {group.tasks.map((task, tIndex) => {
                        const isSelected = selectedTaskId === task.id;
                        const isLast整体 =
                          gIndex === displayedGroups.length - 1 &&
                          tIndex === group.tasks.length - 1;
                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`mx-2 p-4 rounded-xl cursor-pointer transition-all border-l-4 relative ${
                              isSelected
                                ? "bg-[#6366F1] border-[#6366F1] text-white shadow-lg shadow-indigo-100"
                                : "bg-white border-transparent hover:bg-gray-50"
                            }`}
                          >
                            {isLast整体 && (
                              <div
                                ref={lastElementRef}
                                className="absolute bottom-0 h-10 w-full pointer-events-none"
                              />
                            )}
                            <div className="flex gap-2 mb-2 flex-wrap">
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : priorityBadgeColors[task.priority] ||
                                      "bg-gray-100"
                                }`}
                              >
                                {task.priority}
                              </span>
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : statusBadgeColors[task.status] ||
                                      "bg-gray-100"
                                }`}
                              >
                                {task.status}
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <h4
                                className={`text-sm font-semibold leading-tight ${
                                  isSelected ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {task.title}
                              </h4>
                            </div>
                            <div
                              className={`mt-3 flex items-center gap-2 text-[10px] font-medium ${
                                isSelected ? "text-white/70" : "text-gray-400"
                              }`}
                            >
                              {projects.find((p) => p.id === task.projectId)
                                ?.name || "Unassigned"}{" "}
                              » Tasks
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="space-y-6 pt-2">
                {groupedUpdates.map((group) => (
                  <div key={group.project.id} className="mb-2">
                    <div
                      className="px-4 py-2 border-l-4 border-black mb-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer group/title transition-all"
                      onClick={() => toggleGroup(group.project.id)}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={`w-3 h-3 text-black transition-transform duration-300 ${collapsedGroups.includes(group.project.id) ? "-rotate-90" : ""}`}
                        />
                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black">
                          {group.project.name}
                        </h3>
                      </div>
                    </div>

                    {!collapsedGroups.includes(group.project.id) && (
                      <div className="px-2 space-y-3">
                        {group.notifications.map((notif) => {
                          const getIcon = () => {
                            if (notif.type === "comment")
                              return <MessageSquare className="w-3 h-3" />;
                            if (notif.type === "status-change")
                              return <CheckCircle2 className="w-3 h-3" />;
                            if (notif.type === "task-assigned")
                              return <UserPlus className="w-3 h-3" />;
                            return <RefreshCw className="w-3 h-3" />;
                          };

                          const isCompletedUpdate =
                            notif.message.toLowerCase().includes("completed") ||
                            notif.message.toLowerCase().includes("done");

                          return (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (notif.targetId) {
                                  setSelectedTaskId(notif.targetId);
                                  setActiveSubTab("tasks");
                                }
                                removeNotification(notif.id);
                              }}
                              className={`p-4 rounded-2xl transition-all cursor-pointer group border ${
                                isCompletedUpdate
                                  ? "bg-green-50/50 border-green-100 hover:border-green-300"
                                  : "bg-gray-50/50 border-transparent hover:border-gray-200"
                              } ${!notif.read ? "ring-1 ring-black/5 shadow-sm" : ""}`}
                            >
                              <div className="flex gap-3">
                                <div className="flex-shrink-0 relative">
                                  <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                                    <AvatarImage src={notif.actor?.avatar} />
                                    <AvatarFallback className="bg-black text-white text-[10px] font-bold">
                                      {notif.actor?.name
                                        ?.split(" ")
                                        .map((n: string) => n[0])
                                        .join("") || "S"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-50">
                                    <div
                                      className={`w-4 h-4 rounded-full flex items-center justify-center ${isCompletedUpdate ? "bg-green-600" : "bg-black"}`}
                                    >
                                      <span className="text-white">
                                        {getIcon()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-gray-900 truncate">
                                      {notif.actor?.name || "System Update"}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap bg-white/80 px-2 py-0.5 rounded-full border border-gray-100">
                                      {format(
                                        new Date(notif.createdAt),
                                        "dd MMM, h:mm a",
                                      ).toUpperCase()}
                                    </span>
                                  </div>
                                  <p
                                    className={`text-xs leading-relaxed line-clamp-2 ${isCompletedUpdate ? "text-green-800 font-medium" : "text-gray-600"}`}
                                  >
                                    {notif.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {groupedUpdates.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                    <Bell className="w-10 h-10 mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">
                      No Updates Yet
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          {selectedTask ? (
            <TaskWorkspace
              task={selectedTask}
              onNavigate={(page, task) => {
                if (page === "tasks") {
                  // Stay in split view but maybe refresh?
                } else {
                  onNavigate(page, task);
                }
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
              <Layout className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">
                Select a task to view its details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
