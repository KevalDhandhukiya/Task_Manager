import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  Layout,
  ChevronDown,
  Check,
  Calendar,
  MessageSquare,
  LayoutGrid,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { TaskWorkspace } from "@/pages/TaskWorkspace";
import { useAppStore } from "@/store/appStore";
import type { Page } from "@/App";
import type { Task, TaskStatus } from "@/types";
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

export function ProjectsPage({
  onNavigate,
}: {
  onNavigate: (page: Page, task?: Task) => void;
}) {
  const {
    projects,
    tasks,
    setActiveProjectId,
    setCreateTaskOpen,
    setCreateTaskProjectId,
  } = useAppStore();

  const [activeSubTab] = useState<"tasks" | "updates">("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "board">("split");
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] =
    useState("All Projects");
  const [groupBy, setGroupBy] = useState<"project" | "status" | "priority">(
    "project",
  );
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);

  // Initialize all projects as collapsed on mount to keep the sidebar clean
  useEffect(() => {
    if (groupBy === "project" && projects.length > 0) {
      setCollapsedGroups(projects.map((p) => p.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(id) ? prev.filter((gid) => gid !== id) : [...prev, id],
    );
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      let keep = !t.archived;
      if (!showCompleted && t.status === "completed") keep = false;
      if (taskSearchQuery) {
        const query = taskSearchQuery.toLowerCase();
        if (
          !t.title.toLowerCase().includes(query) &&
          !t.description.toLowerCase().includes(query)
        )
          keep = false;
      }
      if (
        selectedProjectFilter !== "All Projects" &&
        t.projectId !== selectedProjectFilter
      )
        keep = false;
      return keep;
    });
  }, [tasks, showCompleted, taskSearchQuery, selectedProjectFilter]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, { id: string; name: string; tasks: Task[] }> =
      {};

    // Initialize all projects as groups (so they show even if empty)
    if (groupBy === "project") {
      projects
        .filter((p) =>
          p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()),
        )
        .forEach((p) => {
          groups[p.id] = { id: p.id, name: p.name, tasks: [] };
        });
    }

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

      if (id !== "unassigned") {
        // Filter out unassigned
        if (!groups[id]) {
          groups[id] = { id, name, tasks: [] };
        }
        groups[id].tasks.push(task);
      }
    });

    Object.values(groups).forEach((group) => {
      group.tasks.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });

    return Object.values(groups).sort((a, b) => {
      const aLatest =
        a.tasks.length > 0
          ? Math.max(...a.tasks.map((t) => new Date(t.updatedAt).getTime()))
          : 0;
      const bLatest =
        b.tasks.length > 0
          ? Math.max(...b.tasks.map((t) => new Date(t.updatedAt).getTime()))
          : 0;

      // If one is empty and one is not, show non-empty at top
      if (aLatest === 0 && bLatest !== 0) return 1;
      if (aLatest !== 0 && bLatest === 0) return -1;
      // Normal sort for rest
      return bLatest - aLatest;
    });
  }, [filteredTasks, projects, groupBy, projectSearchQuery]);

  const [visibleCount, setVisibleCount] = useState(20);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset visibleCount and handle group expansion when filters/grouping changes
  useEffect(() => {
    setVisibleCount(20);

    // Automatically collapse all groups for a clean tactical reset
    const allGroupIds = groupedTasks.map((g) => g.id);

    if (selectedProjectFilter !== "All Projects") {
      // If a specific project is selected, expand it and collapse others
      setCollapsedGroups(
        allGroupIds.filter((id) => id !== selectedProjectFilter),
      );
    } else {
      // If 'All Projects' is selected, collapse everything for clarity
      setCollapsedGroups(allGroupIds);
    }
  }, [selectedProjectFilter, groupBy, showCompleted, taskSearchQuery]);

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
      .filter((g) => g.id !== "unassigned"); // Secondary filter out unassigned just in case
  }, [groupedTasks, visibleCount]);

  const boardColumns = useMemo(() => {
    if (selectedProjectFilter !== "All Projects") {
      const statuses: TaskStatus[] = [
        "todo",
        "in-progress",
        "testing",
        "completed",
      ];
      return statuses.map((status) => ({
        id: status,
        name: status.toUpperCase(),
        tasks: filteredTasks.filter((t) => t.status === status),
        color:
          status === "todo"
            ? "bg-gray-100"
            : status === "in-progress"
              ? "bg-yellow-400"
              : status === "testing"
                ? "bg-blue-500"
                : "bg-green-500",
      }));
    } else {
      return projects
        .filter((p) =>
          p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()),
        )
        .map((p) => ({
          id: p.id,
          name: p.name,
          tasks: filteredTasks.filter((t) => t.projectId === p.id),
          color: "bg-gray-200",
        }));
    }
  }, [selectedProjectFilter, filteredTasks, projects, projectSearchQuery]);

  const notifications = useAppStore((state) => state.notifications);

  const groupedUpdates = useMemo(() => {
    return projects
      .map((p) => {
        const projectNotifs = notifications.filter((n) => {
          if (n.targetId) {
            const t = tasks.find((task) => task.id === n.targetId);
            return t?.projectId === p.id;
          }
          return false;
        });
        return { project: p, notifications: projectNotifs };
      })
      .filter((g) => g.notifications.length > 0);
  }, [projects, notifications, tasks]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden animate-in fade-in duration-700">
      {/* Tactical Header */}
      <div className="px-8 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-medium text-gray-900 tracking-tight">
              Projects
            </h1>
            <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
              <button
                onClick={() => setViewMode("split")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "split" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={`p-1.5 rounded-lg transition-all ${viewMode === "board" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
              >
                <Layout className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within/search:text-black transition-colors" />
              <input
                type="text"
                placeholder={
                  selectedProjectFilter === "All Projects"
                    ? "Filter projects..."
                    : "Search tasks..."
                }
                value={
                  selectedProjectFilter === "All Projects"
                    ? projectSearchQuery
                    : taskSearchQuery
                }
                onFocus={() => setShowProjectSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowProjectSuggestions(false), 200)
                }
                onChange={(e) => {
                  if (selectedProjectFilter === "All Projects") {
                    setProjectSearchQuery(e.target.value);
                  } else {
                    setTaskSearchQuery(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    selectedProjectFilter === "All Projects" &&
                    projectSearchQuery
                  ) {
                    const firstMatch = projects.find((p) =>
                      p.name
                        .toLowerCase()
                        .includes(projectSearchQuery.toLowerCase()),
                    );
                    if (firstMatch) {
                      setSelectedProjectFilter(firstMatch.id);
                      setProjectSearchQuery("");
                      setShowProjectSuggestions(false);

                      const projectTasks = tasks.filter(
                        (t) => t.projectId === firstMatch.id && !t.archived,
                      );
                      if (projectTasks.length > 0) {
                        const mostRecent = projectTasks.sort(
                          (a, b) =>
                            new Date(b.updatedAt).getTime() -
                            new Date(a.updatedAt).getTime(),
                        )[0];
                        setSelectedTaskId(mostRecent.id);
                      }
                    }
                  }
                }}
                className="bg-gray-50 border-none rounded-xl pl-9 pr-4 py-1.5 text-xs focus:ring-1 focus:ring-black outline-none transition-all font-medium w-48 focus:w-64"
              />

              {/* Strategic Project Suggestions Dropdown */}
              {showProjectSuggestions &&
                selectedProjectFilter === "All Projects" &&
                projectSearchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300">
                    <div className="p-2">
                      {projects.filter((p) =>
                        p.name
                          .toLowerCase()
                          .includes(projectSearchQuery.toLowerCase()),
                      ).length > 0 ? (
                        projects
                          .filter((p) =>
                            p.name
                              .toLowerCase()
                              .includes(projectSearchQuery.toLowerCase()),
                          )
                          .map((p) => (
                            <button
                              key={p.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedProjectFilter(p.id);
                                setProjectSearchQuery("");
                                setShowProjectSuggestions(false);

                                const projectTasks = tasks.filter(
                                  (t) => t.projectId === p.id && !t.archived,
                                );
                                if (projectTasks.length > 0) {
                                  const mostRecent = projectTasks.sort(
                                    (a, b) =>
                                      new Date(b.updatedAt).getTime() -
                                      new Date(a.updatedAt).getTime(),
                                  )[0];
                                  setSelectedTaskId(mostRecent.id);
                                }
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-gray-50 transition-colors group/item"
                            >
                              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover/item:bg-white transition-colors">
                                <FolderKanban className="w-4 h-4 text-gray-400 group-hover/item:text-black" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[12px] font-semibold text-gray-900 leading-none mb-1">
                                  {p.name}
                                </span>
                              </div>
                            </button>
                          ))
                      ) : (
                        <div className="px-4 py-3 text-center">
                          <span className="text-xs text-gray-400 font-medium">
                            No results found
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>

            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-3 bg-gray-50 border border-transparent hover:border-gray-200 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-gray-500 shadow-sm outline-none cursor-pointer h-8 transition-all"
            >
              <option value="All Projects">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {viewMode === "split" && (
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="px-3 bg-gray-50 border border-transparent hover:border-gray-200 rounded-xl text-[10px] font-semibold uppercase tracking-widest text-gray-500 shadow-sm outline-none cursor-pointer h-8 transition-all"
              >
                <option value="project">Group By: Project</option>
                <option value="status">Group By: Status</option>
                <option value="priority">Group By: Priority</option>
              </select>
            )}

            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex items-center gap-2 px-3 h-8 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all border ${showCompleted ? "bg-black text-white border-black" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-200"}`}
            >
              <Check className="w-3 h-3" />
              {showCompleted ? "Hide Completed" : "Show Completed"}
            </button>

            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-black hover:bg-neutral-900 text-white rounded-xl h-8 px-4 font-semibold text-[10px] uppercase tracking-widest transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "split" ? (
        /* ─── SPLIT VIEW MODE ─── */
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[380px] border-r border-gray-100 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
              {activeSubTab === "tasks" ? (
                displayedGroups.map((group, gIndex) => (
                  <div key={group.id} className="mb-4">
                    <div
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer group/title transition-all"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 group-hover/title:text-black transition-transform duration-300 ${
                            collapsedGroups.includes(group.id)
                              ? "-rotate-90"
                              : ""
                          }`}
                        />
                        <span className="text-sm font-semibold text-[#2A2E34]">
                          {group.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover/title:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreateTaskProjectId(group.id);
                            setCreateTaskOpen(true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-black transition-all"
                          title="Add task to this project"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs text-gray-400 font-medium">
                          {group.tasks.length}
                        </span>
                      </div>
                    </div>

                    {!collapsedGroups.includes(group.id) && (
                      <div className="space-y-1.5 mt-2">
                        {group.tasks.map((task, tIndex) => {
                          const isSelected = selectedTaskId === task.id;
                          const isLast整体 =
                            gIndex === displayedGroups.length - 1 &&
                            tIndex === group.tasks.length - 1;
                          return (
                            <div
                              key={task.id}
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setActiveProjectId(task.projectId || null);
                              }}
                              className={`mx-3 p-4 rounded-2xl cursor-pointer transition-all border-l-4 relative ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200"
                                  : "bg-white border-transparent hover:bg-neutral-50"
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
                                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isSelected ? "bg-white/20 text-white" : priorityBadgeColors[task.priority] || "bg-gray-100"}`}
                                >
                                  {task.priority}
                                </span>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isSelected ? "bg-white/20 text-white" : statusBadgeColors[task.status] || "bg-gray-100"}`}
                                >
                                  {task.status}
                                </span>
                              </div>
                              <h4
                                className={`text-sm font-semibold leading-tight ${isSelected ? "text-white" : "text-neutral-900"}`}
                              >
                                {task.title}
                              </h4>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* Updates Tab ... Similar to before */
                <div className="space-y-6 px-4">
                  {groupedUpdates.map((group) => (
                    <div key={group.project.id} className="space-y-3">
                      <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">
                        {group.project.name}
                      </h3>
                      {group.notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all cursor-pointer"
                        >
                          <p className="text-xs font-medium text-gray-800">
                            {n.message}
                          </p>
                          <span className="text-[9px] text-gray-400 font-semibold uppercase mt-2 block">
                            {n.createdAt}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 bg-white overflow-hidden">
            {selectedTask ? (
              <TaskWorkspace task={selectedTask} onNavigate={onNavigate} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <Layout className="w-12 h-12 text-gray-100 mb-4" />
                <h3 className="font-semibold text-gray-900">
                  Select objective
                </h3>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── BOARD VIEW MODE ─── */
        <div className="flex-1 overflow-x-auto custom-scrollbar px-8 pb-8 pt-4">
          <div className="flex gap-6 h-full min-w-max">
            {boardColumns.map((column) => (
              <div
                key={column.id}
                className="w-[320px] flex flex-col group/col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${column.color}`} />
                    <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-widest">
                      {column.name}
                    </h3>
                    <span className="text-[10px] font-medium text-gray-300">
                      {column.tasks.length}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const idToSet =
                      selectedProjectFilter === "All Projects"
                        ? column.id
                        : selectedProjectFilter;
                    setCreateTaskProjectId(idToSet);
                    setCreateTaskOpen(true);
                  }}
                  className="w-full h-10 border border-indigo-100 rounded-xl bg-white mb-4 flex items-center px-4 gap-2.5 text-indigo-500 text-[11px] font-medium hover:border-indigo-300 hover:shadow-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add task
                </button>

                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3">
                  {column.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onNavigate("task-workspace", task)}
                      className={`bg-[#fffce8] border border-[#f0e8b2] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group/card relative border-l-4 ${
                        task.status === "todo"
                          ? "border-l-gray-300"
                          : task.status === "in-progress"
                            ? "border-l-yellow-400"
                            : task.status === "testing"
                              ? "border-l-blue-500"
                              : "border-l-green-500"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex gap-1.5">
                            <span
                              className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm ${statusBadgeColors[task.status as keyof typeof statusBadgeColors] || "bg-gray-100 text-gray-500"}`}
                            >
                              {task.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-gray-800 leading-tight">
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-semibold">
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-semibold">
                              <MessageSquare className="w-3 h-3" />
                              {task.comments?.length || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex -space-x-1.5">
                        {task.assignees.map((a) => (
                          <Avatar
                            key={a.id}
                            className="w-6 h-6 border-2 border-[#fffce8]"
                          >
                            <AvatarImage src={a.avatar} />
                            <AvatarFallback className="text-[8px] bg-black text-white">
                              {a.name[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  ))}
                  {column.tasks.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-gray-50 rounded-2xl flex items-center justify-center bg-gray-50/20 text-gray-200">
                      <Layout className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateProjectModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
