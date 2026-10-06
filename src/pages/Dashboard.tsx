import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Layers,
  Users,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store/appStore";
import type { Page } from "@/App";
import type { Task } from "@/types";

interface DashboardProps {
  onNavigate: (page: Page, task?: Task) => void;
}

function getToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "todo" | "completed" | "delegated"
  >("todo");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const { currentUser, tasks, getUserStats, users } = useAppStore();

  if (!currentUser) return null;

  const stats = getUserStats(currentUser.id);
  const today = getToday();

  const myTasks = useMemo(() => {
    return tasks.filter((t) =>
      t.assignees.some((a) => String(a.id) === String(currentUser.id)),
    );
  }, [tasks, currentUser.id]);

  const delegatedTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        String(t.createdBy?.id) === String(currentUser.id) &&
        !t.assignees.some((a) => String(a.id) === String(currentUser.id)),
    );
  }, [tasks, currentUser.id]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const getTaskSections = (taskList: Task[]) => {
    return {
      Today: taskList.filter((t) => {
        const updatedDay = t.updatedAt ? t.updatedAt.slice(0, 10) : "";
        const createdDay = t.createdAt ? t.createdAt.slice(0, 10) : "";
        const dueToday = t.dueDate === today;
        return updatedDay === today || createdDay === today || dueToday;
      }),
      Overdue: taskList.filter(
        (t) => t.status !== "completed" && t.dueDate && t.dueDate < today,
      ),
      Unscheduled: taskList.filter((t) => !t.dueDate || t.dueDate === ""),
    };
  };

  const currentTasks = useMemo(() => {
    const rawList =
      activeTab === "todo"
        ? myTasks.filter((t) => t.status !== "completed")
        : activeTab === "completed"
          ? myTasks.filter((t) => t.status === "completed")
          : delegatedTasks;

    // Filter out archived tasks
    const activeList = rawList.filter((t) => !t.archived);

    // Today's activity + all overdue + all unscheduled (no due date)
    const filtered = activeList.filter((t) => {
      const updatedDay = t.updatedAt ? t.updatedAt.slice(0, 10) : "";
      const createdDay = t.createdAt ? t.createdAt.slice(0, 10) : "";
      const isToday = updatedDay === today || createdDay === today;
      const isOverdue =
        t.status !== "completed" && t.dueDate && t.dueDate < today;
      const isUnscheduled = !t.dueDate || t.dueDate === "";
      return isToday || isOverdue || isUnscheduled;
    });

    return [...filtered].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [activeTab, myTasks, delegatedTasks, today]);

  const sections = getTaskSections(currentTasks);

  const teamWorkload = useMemo(() => {
    const isSuperAdmin = currentUser?.isSuperAdmin === true;
    return users
      .filter(
        (u) =>
          u.status === "active" && (isSuperAdmin || u.role !== "Administrator"),
      ) // Only Super Admin sees Admins
      .map((user) => {
        const userTasks = tasks.filter((t) =>
          t.assignees.some((a) => String(a.id) === String(user.id)),
        );
        const completed = userTasks.filter(
          (t) => t.status === "completed",
        ).length;
        const total = userTasks.length;
        const capacity = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          user,
          capacity,
          assignedTasks: total,
          completedTasks: completed,
        };
      })
      .sort((a, b) => b.capacity - a.capacity)
      .slice(0, 4);
  }, [users, tasks]);

  const statCards = [
    {
      label: "TO DO",
      value: stats.todoTasks.toString(),
      trend: stats.todoTasks > 0 ? "Active" : "Stable",
      icon: Layers,
      color: "blue",
    },
    {
      label: "IN PROGRESS",
      value: stats.inProgressTasks.toString(),
      trend: stats.inProgressTasks > 0 ? "Underway" : "Stable",
      icon: Clock,
      color: "orange",
    },
    {
      label: "TESTING",
      value: stats.testingTasks.toString(),
      trend: stats.testingTasks > 0 ? "Verifying" : "Stable",
      icon: TrendingUp, // Using TrendingUp for Testing/Evolution hub
      color: "indigo",
    },
    {
      label: "COMPLETED",
      value: stats.completedTasks.toString(),
      trend: stats.completedTasks > 0 ? `+${stats.completedTasks}` : "0",
      icon: TrendingUp,
      color: "green",
    },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-medium text-gray-900 dark:text-white tracking-tight">
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 18
                ? "afternoon"
                : "evening"}
            , {currentUser.name.split(" ")[0]}
          </h1>
        </div>
      </div>

      {/* Stats Horizon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className="border-none shadow-xl shadow-gray-200/50 dark:shadow-none bg-white dark:bg-gray-900 rounded-2xl overflow-hidden hover-lift group"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    card.color === "blue"
                      ? "bg-blue-50 dark:bg-blue-900/10 text-blue-500 dark:text-blue-400"
                      : card.color === "orange"
                        ? "bg-orange-50 dark:bg-orange-900/10 text-orange-500 dark:text-orange-400"
                        : card.color === "indigo"
                          ? "bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 dark:text-indigo-400"
                          : card.color === "green"
                            ? "bg-green-50 dark:bg-green-900/10 text-green-500 dark:text-green-400"
                            : "bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400"
                  }`}
                >
                  <card.icon className="w-5 h-5" />
                </div>
                {card.trend !== "0" && card.trend !== "Stable" && (
                  <div
                    className={`flex items-center gap-0.5 text-xs font-bold tracking-tighter ${
                      card.trend.startsWith("+")
                        ? "text-indigo-600"
                        : "text-red-600"
                    }`}
                  >
                    {card.trend.startsWith("+") ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {card.trend}
                  </div>
                )}
                {card.trend === "Stable" && (
                  <div className="text-xs font-medium tracking-tighter text-blue-500">
                    Stable
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest leading-none">
                  {card.label}
                </p>
                <p className="text-2xl font-medium text-gray-900 dark:text-white mt-2">
                  {card.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Multi-Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: My Work (ClickUp Style) */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden bg-white dark:bg-gray-900">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between mb-8">
                <CardTitle className="text-xl font-medium uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20 ring-1 ring-white/10">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  Recent Task
                </CardTitle>
                <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                  {(["todo", "completed", "delegated"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider transition-all ${
                        activeTab === tab
                          ? "bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm ring-1 ring-gray-100 dark:ring-gray-800"
                          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      }`}
                    >
                      {tab === "todo"
                        ? "To Do"
                        : tab === "completed"
                          ? "Completed"
                          : "Delegated"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collapsible Sections */}
              <div className="space-y-4">
                {Object.entries(sections).map(([title, taskList]) => {
                  // Hide Overdue section on the Completed tab
                  if (title === "Overdue" && activeTab === "completed") return null;
                  const isExpanded = expandedSections.includes(title);
                  return (
                    <div key={title} className="group">
                      <button
                        onClick={() => toggleSection(title)}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <ChevronDown
                            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? "" : "-rotate-90"}`}
                          />
                          <span
                            className={`text-xs font-semibold uppercase tracking-widest ${
                              title === "Overdue" && taskList.length > 0
                                ? "text-red-500"
                                : title === "Today" && taskList.length > 0
                                  ? "text-blue-500"
                                  : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {title}
                          </span>
                          <span className="bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {taskList.length}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 ml-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                          {taskList.length === 0 ? (
                            <p className="text-xs text-gray-400 font-medium py-2 px-4 italic">
                              {title === "Unscheduled"
                                ? "No unscheduled tasks assigned to you."
                                : title === "Today"
                                  ? "No tasks for today."
                                  : "No overdue tasks."}
                            </p>
                          ) : (
                            taskList.map((task) => (
                              <div
                                key={task.id}
                                onClick={() =>
                                  onNavigate("task-workspace", task)
                                }
                                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-black/30 dark:hover:border-white/30 hover:shadow-lg hover:shadow-black/5 transition-all cursor-pointer group/item"
                              >
                                <div className="flex items-center gap-4">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      task.priority === "high"
                                        ? "bg-red-500"
                                        : task.priority === "medium"
                                          ? "bg-orange-500"
                                          : "bg-blue-300"
                                    }`}
                                  />
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover/item:text-black dark:group-hover/item:text-white transition-colors">
                                    {task.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex -space-x-2">
                                    {task.assignees.map((a) => (
                                      <Avatar
                                        key={a.id}
                                        className="w-6 h-6 border-2 border-white shadow-sm"
                                      >
                                        <AvatarImage src={a.avatar} />
                                        <AvatarFallback className="text-[8px] bg-black text-white font-medium">
                                          {a.name[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                  <ChevronRight
                                    className="w-4 h-4 text-gray-300 group-hover/item:text-black
 transition-all"
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Right: Team Vitality */}
        <div className="col-span-1 lg:col-span-4 space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-gray-200/50 dark:shadow-none bg-white dark:bg-gray-900 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Team Vitality
              </h3>
              <Users className="w-4 h-4 text-gray-300" />
            </div>
            <div className="space-y-5">
              {teamWorkload.map((member) => (
                <div key={member.user.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 rounded-xl border border-gray-100 dark:border-gray-800">
                        <AvatarImage src={member.user.avatar} />
                        <AvatarFallback className="bg-black text-white font-medium text-xs">
                          {member.user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                        {member.user.name}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-black dark:text-white bg-black/5 dark:bg-white/10 px-2 py-1 rounded-lg">
                      {member.capacity}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        member.capacity > 80 ? "bg-red-500" : "bg-black"
                      }`}
                      style={{ width: `${member.capacity}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-6 text-xs font-medium uppercase tracking-widest text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => onNavigate("team")}
            >
              Full Roster <ChevronRight className="w-3 h-3 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
