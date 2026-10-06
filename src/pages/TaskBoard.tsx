import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  ChevronDown,
  Layout,
  MoreVertical,
  MessageSquare,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store/appStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Page } from "@/App";
import type { Task, TaskStatus, TaskPriority } from "@/types";

interface TaskBoardProps {
  onNavigate: (page: Page, task?: Task) => void;
  filterByCurrentUser?: boolean;
  archiveModeOnly?: boolean;
}

export function TaskBoard({
  onNavigate,
  filterByCurrentUser,
  archiveModeOnly,
}: TaskBoardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState("All Members");
  const [selectedProjectName, setSelectedProjectName] =
    useState("All Projects");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Statuses");
  const [showArchived, setShowArchived] = useState(false);
  const [expandedStatuses, setExpandedStatuses] = useState<string[]>([
    "todo",
    "in-progress",
    "testing",
    "completed",
  ]);
  const [quickAddStatus, setQuickAddStatus] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [quickAddPriority, setQuickAddPriority] =
    useState<TaskPriority>("medium");
  const [quickAddAssigneeId, setQuickAddAssigneeId] = useState("");
  const [quickAddDueDate, setQuickAddDueDate] = useState("");

  const { 
    tasks, 
    users, 
    projects, 
    addTask, 
    updateTask,
    currentUser,
    setCreateTaskOpen
  } = useAppStore();

  const activeUsers = users.filter(
    (u) => u.status === "active"
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMember = filterByCurrentUser
        ? task.assignees.some((a) => a.id === currentUser?.id)
        : selectedMember === "All Members" ||
          task.assignees.some((a) => a.name === selectedMember);

      const taskProject = projects.find((p) => p.id === task.projectId);
      const matchesProject =
        selectedProjectName === "All Projects" ||
        taskProject?.name === selectedProjectName;

      const matchesStatus =
        selectedStatus === "All Statuses" || task.status === selectedStatus;

      if (archiveModeOnly) {
        return (
          matchesSearch &&
          matchesMember &&
          matchesProject &&
          matchesStatus &&
          task.archived === true
        );
      }

      // Base archived filter
      if (!showArchived && task.archived) return false;

      // Show completed if global view OR if my tasks AND showArchived is on
      const isNotCompletedIfMyTasks =
        !filterByCurrentUser || showArchived || task.status !== "completed";

      return (
        matchesSearch &&
        matchesMember &&
        matchesProject &&
        matchesStatus &&
        isNotCompletedIfMyTasks
      );
    });
  }, [
    tasks,
    searchQuery,
    selectedMember,
    selectedProjectName,
    selectedStatus,
    filterByCurrentUser,
    showArchived,
    archiveModeOnly,
    currentUser,
    projects,
  ]);

  const toggleStatus = (status: string) => {
    setExpandedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const handleQuickAdd = async (status: TaskStatus) => {
    if (newTaskTitle.trim() && currentUser) {
      const targetProjectId = projects.length > 0 ? projects[0].id : "";
      const selectedAssignee =
        users.find((u) => u.id === quickAddAssigneeId) || currentUser;

      await addTask({
        title: newTaskTitle.trim(),
        description: "",
        status,
        priority: quickAddPriority,
        projectId: targetProjectId,
        assignees: [selectedAssignee],
        createdBy: currentUser,
        dueDate: quickAddDueDate || "",
        comments: [],
        attachments: [],
        tags: [],
      });
      setNewTaskTitle("");
      setQuickAddStatus(null);
      setQuickAddPriority("medium");
      setQuickAddAssigneeId("");
    }
  };

  const statusMap: Record<
    TaskStatus,
    { label: string; color: string; dot: string; textColor: string }
  > = {
    todo: {
      label: "To do",
      color: "bg-white border-gray-100",
      dot: "bg-gray-300",
      textColor: "text-gray-500",
    },
    "in-progress": {
      label: "In progress",
      color: "bg-orange-500 border-orange-600 shadow-sm",
      dot: "bg-white",
      textColor: "text-white",
    },
    testing: {
      label: "Testing",
      color: "bg-blue-500 border-blue-600 shadow-sm",
      dot: "bg-white",
      textColor: "text-white",
    },
    completed: {
      label: "Completed",
      color: "bg-green-500 border-green-600 shadow-sm",
      dot: "bg-white",
      textColor: "text-white",
    },
  };

  return (
    <div className="min-h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="pt-4 px-4 sm:px-8 pb-4 border-b border-gray-100 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-medium text-gray-900 dark:text-white tracking-tight">
              {archiveModeOnly
                ? "Archive"
                : filterByCurrentUser
                  ? "My Tasks"
                  : "All Tasks"}
            </h1>
            <div className="mt-2" />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1 lg:justify-end">
            <div className="relative flex-1 max-w-full sm:max-w-xs lg:max-w-[320px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search operational data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-12 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400 text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
              {/* Assignee Filter (Only in All Tasks) */}
              {!archiveModeOnly && !filterByCurrentUser && (
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="h-11 px-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all outline-none min-w-[140px] cursor-pointer"
                >
                  <option>All Assignees</option>
                  {activeUsers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Project Filter (Available in All Views) */}
              {!archiveModeOnly && (
                <select
                  value={selectedProjectName}
                  onChange={(e) => setSelectedProjectName(e.target.value)}
                  className="h-11 px-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all outline-none min-w-[140px] cursor-pointer"
                >
                  <option>All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Status Filter (Available in All Views) */}
              {!archiveModeOnly && (
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-11 px-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all outline-none min-w-[140px] cursor-pointer"
                >
                  <option value="All Statuses">All Statuses</option>
                  {Object.entries(statusMap).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              )}

              {filterByCurrentUser && (
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`h-11 px-4 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                    showArchived
                      ? "bg-black border-black text-white shadow-lg shadow-black/20"
                      : "bg-white border-gray-100 text-gray-500 hover:border-gray-200 shadow-sm"
                  }`}
                >
                  {showArchived ? "Hide Completed" : "View Completed"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 pb-8 bg-white dark:bg-gray-950">
        {/* Global Matrix - Card Layout */}
        <Card className="rounded-2xl sm:rounded-[2.5rem] border-none shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden bg-white dark:bg-gray-900 p-2 sm:p-4 space-y-4">
          {archiveModeOnly && filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200 animate-in fade-in zoom-in duration-700">
               <div className="w-20 h-20 bg-black/5 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-black/5">
                 <Layout className="w-10 h-10 text-black/20" />
               </div>
               <h3 className="text-xl font-medium text-gray-300 mt-2 tracking-tight">Archive</h3>
            </div>
          )}

          {(Object.keys(statusMap) as TaskStatus[]).map((status) => {
            const tasksInStatus = filteredTasks.filter(
              (t) =>
                t.status === status &&
                (archiveModeOnly || showArchived ? true : !t.archived),
            );
            if (tasksInStatus.length === 0) return null;

            const isExpanded = expandedStatuses.includes(status);
            const meta = statusMap[status];

            return (
              <div key={status} className="space-y-6">
                <div
                  className="flex items-center justify-between group cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all"
                  onClick={() => toggleStatus(status)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`transition-transform duration-300 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${meta.dot} shadow-sm`}
                      />
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">
                        {meta.label}
                      </span>
                      <span className="bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs font-bold px-3 py-1 rounded-full">
                        {tasksInStatus.length}
                      </span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="animate-in slide-in-from-top-3 duration-500 bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/20 overflow-hidden ml-4 sm:ml-9 font-normal">
                    {/* Task Cards - Dashboard Style */}
                    <div className="space-y-2 sm:space-y-3 mt-4">
                      {tasksInStatus.length > 0 ? (
                        tasksInStatus.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => onNavigate("task-workspace", task)}
                            className="group/item flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-black/30 dark:hover:border-white/30 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 cursor-pointer gap-4"
                          >
                            <div className="flex items-center gap-5">
                              <div
                                className={`w-2.5 h-2.5 rounded-full ring-4 ring-opacity-10 ${
                                  task.priority === "high"
                                    ? "bg-red-500 ring-red-500"
                                    : task.priority === "medium"
                                      ? "bg-amber-500 ring-amber-500"
                                      : "bg-blue-500 ring-blue-500"
                                }`}
                              />
                              <div>
                                <div className="flex items-center gap-3">
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight group-hover/item:text-black transition-colors">
                                    {task.title}
                                  </h4>
                                  {task.comments &&
                                    task.comments.length > 0 && (
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-black bg-black/5 px-2 py-0.5 rounded-lg border border-black/10">
                                        <MessageSquare className="w-3 h-3" />{" "}
                                        {task.comments.length}
                                      </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Due{" "}
                                    {new Date(task.dueDate).toLocaleDateString(
                                      "en-US",
                                      { month: "short", day: "numeric" },
                                    )}
                                  </span>
                                  <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span
                                        className={`text-xs font-bold uppercase tracking-widest cursor-pointer hover:text-black transition-colors ${
                                          task.priority === "high"
                                            ? "text-red-500"
                                            : task.priority === "medium"
                                              ? "text-amber-500"
                                              : "text-blue-500"
                                        }`}
                                      >
                                        {task.priority} priority
                                      </span>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-[180px] p-1.5 rounded-2xl shadow-2xl border-gray-100"
                                    >
                                      {["low", "medium", "high"].map((p) => (
                                        <DropdownMenuItem
                                          key={p}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateTask(task.id, {
                                              priority: p as TaskPriority,
                                            });
                                          }}
                                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                                            task.priority === p
                                              ? "bg-gray-50 text-black font-bold"
                                              : "text-gray-400 hover:text-black hover:bg-gray-50"
                                          }`}
                                        >
                                          <div
                                            className={`w-1.5 h-1.5 rounded-full ${p === "high" ? "bg-red-500" : p === "medium" ? "bg-amber-500" : "bg-blue-500"}`}
                                          />
                                          <span className="capitalize">
                                            {p}
                                          </span>
                                          {task.priority === p && (
                                            <Check className="w-3.5 h-3.5 ml-auto text-black" />
                                          )}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center -space-x-2 cursor-pointer hover:opacity-80 transition-opacity p-1.5 hover:bg-gray-100/50 rounded-2xl">
                                    {task.assignees.slice(0, 3).map((assignee) => (
                                      <Avatar
                                        key={assignee.id}
                                        className="w-7 h-7 sm:w-8 sm:h-8 ring-2 ring-white dark:ring-gray-900 shadow-sm"
                                      >
                                        <AvatarImage src={assignee.avatar} />
                                        <AvatarFallback className="bg-black text-white text-xs font-bold">
                                          {assignee.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {task.assignees.length > 3 && (
                                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-400">
                                        +{task.assignees.length - 3}
                                      </div>
                                    )}
                                    {task.assignees.length === 0 && (
                                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-400">
                                        +
                                      </div>
                                    )}
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="center"
                                  className="w-[220px] p-2 rounded-2xl shadow-2xl border-gray-100 max-h-[300px] overflow-y-auto"
                                >
                                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-2">
                                    Assignee
                                  </div>
                                  {activeUsers.map((user) => {
                                    const isAssigned = task.assignees.some(a => a.id === user.id);
                                    return (
                                      <DropdownMenuItem
                                        key={user.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newAssignees = isAssigned 
                                            ? task.assignees.filter(a => a.id !== user.id)
                                            : [...task.assignees, user];
                                          updateTask(task.id, { assignees: newAssignees });
                                        }}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                                          isAssigned ? "bg-gray-50 text-black" : "text-gray-500 hover:text-black hover:bg-gray-50"
                                        }`}
                                      >
                                        <div className="relative">
                                          <Avatar className="w-6 h-6">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback className="text-[8px] bg-black text-white">
                                              {user.name.split(" ").map(n => n[0]).join("")}
                                            </AvatarFallback>
                                          </Avatar>
                                          {isAssigned && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full flex items-center justify-center ring-2 ring-white">
                                              <Check className="w-2 h-2 text-white" />
                                            </div>
                                          )}
                                        </div>
                                        <span className={isAssigned ? "font-bold" : ""}>{user.name}</span>
                                        {isAssigned && <Check className="w-3.5 h-3.5 ml-auto text-black" />}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <div className="flex items-center gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div
                                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold uppercase tracking-[0.15em] border border-gray-100 dark:border-gray-700 ${statusMap[task.status].color} ${statusMap[task.status].textColor} shadow-sm hover:border-black/30 transition-all active:scale-95`}
                                    >
                                      {statusMap[task.status].label}
                                    </div>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-[180px] p-1.5 rounded-2xl shadow-2xl border-gray-100"
                                  >
                                    {(
                                      Object.keys(statusMap) as TaskStatus[]
                                    ).map((s) => (
                                      <DropdownMenuItem
                                        key={s}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateTask(task.id, { status: s });
                                        }}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                                          task.status === s
                                            ? "bg-gray-50 text-black font-bold"
                                            : "text-gray-400 hover:text-black hover:bg-gray-50"
                                        }`}
                                      >
                                        <div
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            s === "todo" ? "bg-gray-300" :
                                            s === "in-progress" ? "bg-orange-500" :
                                            s === "testing" ? "bg-blue-500" :
                                            "bg-green-500"
                                          }`}
                                        />
                                        {statusMap[s].label}
                                        {task.status === s && (
                                          <Check className="w-3.5 h-3.5 ml-auto text-black" />
                                        )}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <MoreVertical className="w-4 h-4 text-gray-300 hover:text-gray-600 transition-colors hidden sm:block opacity-0 group-hover/item:opacity-100" />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 flex flex-col items-center justify-center bg-gray-50/30 rounded-[2.5rem] border border-dashed border-gray-100">
                          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-gray-200/50 border border-gray-100 mb-4">
                            <Layout className="w-8 h-8 text-gray-200" />
                          </div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">
                            No Historical Operations Found
                          </p>
                        </div>
                      )}

                      {/* Quick Add Task Trigger - Hidden in Archive Mode */}
                      {!archiveModeOnly && (
                        <div
                          onClick={() => setCreateTaskOpen(true)}
                          className="flex items-center gap-5 px-10 py-6 group cursor-pointer hover:bg-gray-50/50 transition-all border-t border-gray-50 bg-white/50"
                        >
                          <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center transition-colors border border-black shadow-lg shadow-black/10">
                            <Plus className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-bold text-black uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform">
                            New Task
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>

      {/* Tactical Interrogator Dialog */}
      <Dialog
        open={!!quickAddStatus}
        onOpenChange={(open) => !open && setQuickAddStatus(null)}
      >
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-[28px] shadow-2xl">
          <DialogHeader className="p-8 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-[#2A2E34]">
                  Tactical Interrogator
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Manual authorization required for this project
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-10 space-y-8 bg-white">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-gray-500">
                Project Name
              </Label>
              <Input
                autoFocus
                placeholder="e.g. Protocol Alpha Implementation"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="h-12 text-sm font-medium border-gray-100 bg-gray-50/30 focus:bg-white transition-all rounded-xl focus:ring-0 focus:border-black"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-gray-500">
                Assignee
              </Label>
                <select
                  value={quickAddAssigneeId || currentUser?.id}
                  onChange={(e) => setQuickAddAssigneeId(e.target.value)}
                  className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-medium outline-none transition-all focus:bg-white focus:border-black"
                >
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-medium text-gray-500">
                  Protocol Rank
                </Label>
                <select
                  value={quickAddPriority}
                  onChange={(e) => setQuickAddPriority(e.target.value as any)}
                  className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-medium outline-none transition-all focus:bg-white focus:border-black"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium text-gray-500">
                Mission Deadline
              </Label>
              <Input
                type="date"
                value={quickAddDueDate}
                onChange={(e) => setQuickAddDueDate(e.target.value)}
                className="h-11 text-xs font-medium border-gray-100 bg-gray-50/30 rounded-xl focus:border-black transition-all"
              />
            </div>
          </div>

          <div className="p-8 bg-gray-50/50 flex items-center justify-end gap-3 border-t border-gray-100">
            <Button
              variant="ghost"
              onClick={() => setQuickAddStatus(null)}
              className="h-12 px-8 text-gray-500 hover:text-black hover:bg-white"
            >
              Discard
            </Button>
            <Button
              onClick={() => handleQuickAdd(quickAddStatus!)}
              disabled={!newTaskTitle.trim()}
              className="h-12 px-10 bg-black text-white hover:bg-gray-900 rounded-xl shadow-xl shadow-black/10"
            >
              Authorize Operation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
