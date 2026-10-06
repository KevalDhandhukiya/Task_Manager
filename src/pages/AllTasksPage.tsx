import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/store/appStore";
import { format } from "date-fns";
import type { Task, TaskStatus, TaskPriority } from "@/types";
import type { Page } from "@/App";

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "in-progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none",
  testing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-blue-50 text-blue-500",
  high: "bg-orange-50 text-orange-600 border-none",
};

interface AllTasksPageProps {
  onNavigate: (page: Page, task?: Task) => void;
}

export function AllTasksPage({ onNavigate }: AllTasksPageProps) {
  const { tasks, users, projects } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All statuses");
  const [selectedProject, setSelectedProject] = useState("All projects");
  const [selectedAssignee, setSelectedAssignee] = useState("All assignees");
  const [selectedCreator, setSelectedCreator] = useState("All users");

  // Multi-dimensional filtering logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === "All statuses" || task.status === selectedStatus;
      
      const project = projects.find(p => p.id === task.projectId);
      const matchesProject = selectedProject === "All projects" || project?.name === selectedProject;
      
      const matchesAssignee = selectedAssignee === "All assignees" || 
        task.assignees.some(a => a.name === selectedAssignee);
        
      const matchesCreator = selectedCreator === "All users" || task.createdBy?.name === selectedCreator;

      return matchesSearch && matchesStatus && matchesProject && matchesAssignee && matchesCreator;
    });
  }, [tasks, searchQuery, selectedStatus, selectedProject, selectedAssignee, selectedCreator, projects]);

  const [visibleCount, setVisibleCount] = useState(20);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // Reset scroll position and visible count when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, selectedStatus, selectedProject, selectedAssignee, selectedCreator]);

  const displayedTasks = useMemo(() => {
    return filteredTasks.slice(0, visibleCount);
  }, [filteredTasks, visibleCount]);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filteredTasks.length) {
        setVisibleCount(prev => prev + 20);
      }
    }, { threshold: 0.1 });
    
    if (node) observerRef.current.observe(node);
  }, [filteredTasks.length, visibleCount]);

  const exportToCSV = () => {
    // Mission Briefing: Define headers for CSV protocol
    const headers = [
      "Task ID",
      "Title",
      "Priority",
      "Status",
      "Workspace",
      "Assignees",
      "Start Date",
      "Due Date",
      "Creator",
      "Last Updated",
      "Created At"
    ];

    const rows = filteredTasks.map(task => {
      const project = projects.find(p => p.id === task.projectId);
      return [
        task.id,
        task.title,
        task.priority,
        task.status,
        project?.name || "Unassigned",
        task.assignees.map(a => a.name).join("; "),
        task.startDate || "",
        task.dueDate || "",
        task.createdBy?.name || "",
        format(new Date(task.updatedAt), "MM-dd-yyyy"),
        format(new Date(task.createdAt), "MM-dd-yyyy")
      ].map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mission_tasks_export_${format(new Date(), "yyyy_MM_dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 min-h-full flex flex-col bg-[#F9FAFB] dark:bg-[#030712]">
      {/* ─── HEADER SECTION ─── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            All Tasks
            <span className="ml-3 text-sm font-medium text-gray-400 uppercase tracking-widest leading-none bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
              {filteredTasks.length} Units Found
            </span>
          </h1>
        </div>
      </div>

      {/* ─── FILTER CONTROL HUB ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6 bg-white dark:bg-gray-900 p-4 rounded-[1.5rem] border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border-none focus:ring-1 focus:ring-black/10 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Projects</label>
          <select 
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full h-10 px-3 text-xs font-medium bg-gray-50 dark:bg-white/5 border-none rounded-xl outline-none focus:ring-1 focus:ring-black/10 text-gray-600 dark:text-gray-300 transition-all shadow-sm"
          >
            <option>All projects</option>
            {projects.map(p => <option key={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Status</label>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-10 px-3 text-xs font-medium bg-gray-50 dark:bg-white/5 border-none rounded-xl outline-none focus:ring-1 focus:ring-black/10 text-gray-600 dark:text-gray-300 capitalize transition-all shadow-sm"
          >
            <option>All statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="testing">Testing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Assignees</label>
          <select 
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="w-full h-10 px-3 text-xs font-medium bg-gray-50 dark:bg-white/5 border-none rounded-xl outline-none focus:ring-1 focus:ring-black/10 text-gray-600 dark:text-gray-300 transition-all shadow-sm"
          >
            <option>All assignees</option>
            {users.map(u => <option key={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Created By</label>
          <select 
            value={selectedCreator}
            onChange={(e) => setSelectedCreator(e.target.value)}
            className="w-full h-10 px-3 text-xs font-medium bg-gray-50 dark:bg-white/5 border-none rounded-xl outline-none focus:ring-1 focus:ring-black/10 text-gray-600 dark:text-gray-300 transition-all shadow-sm"
          >
            <option>All users</option>
            {users.map(u => <option key={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="flex items-end pb-0.5">
          <Button 
            variant="ghost" 
            onClick={exportToCSV}
            className="w-full h-10 rounded-xl text-[10px] font-bold group uppercase tracking-widest text-gray-400 hover:text-black hover:bg-black/5"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* ─── MISSION DATA MATRIX (TABLE) ─── */}
      <Card className="rounded-[1.5rem] border-none shadow-xl shadow-black/5 flex flex-col bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5">
              <tr>
                <th className="p-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5">Task</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5">Project</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5">Status</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5">Assignees</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5">Start</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5">Due Date</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5">Creator</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right px-6 bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5 whitespace-nowrap">Updated</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right px-6 bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-white/5 whitespace-nowrap">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {displayedTasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-20 text-center">
                    <div className="flex flex-col items-center">
                      <Search className="w-12 h-12 text-gray-200 mb-4" />
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No matching mission units</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedTasks.map((task, index) => {
                  const project = projects.find(p => p.id === task.projectId);
                  const isLastElement = index === displayedTasks.length - 1;
                  return (
                    <tr 
                      key={task.id} 
                      className="group/row hover:bg-gray-50/80 dark:hover:bg-white/5 transition-all cursor-pointer border-l-4 border-transparent hover:border-black"
                      onClick={() => onNavigate("task-workspace" as Page, task)}
                    >
                      <td className="p-4 px-6 relative">
                        {isLastElement && <div ref={lastElementRef} className="absolute bottom-0 h-10 w-full pointer-events-none" />}
                        <div className="flex items-center gap-3">
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover/row:text-black dark:group-hover/row:text-white transition-colors capitalize">
                            {task.title}
                          </p>
                          <Badge className={`${priorityColors[task.priority]} text-[9px] px-2 py-0.5 border-none shadow-none font-black`}>
                            {task.priority.toUpperCase()}
                          </Badge>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="text-[11px] font-extrabold text-[#3B82F6] whitespace-nowrap">
                          {project?.name || "Unassigned"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={`${statusColors[task.status]} text-[9px] font-bold uppercase px-3 rounded-full border shadow-sm`}>
                          {task.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                         <div className="flex justify-center -space-x-2">
                           {task.assignees.map(a => (
                             <Avatar key={a.id} className="w-6 h-6 ring-2 ring-white dark:ring-gray-900 shadow-sm border border-gray-100 dark:border-white/10 hover:z-10 transition-transform hover:scale-110">
                               <AvatarImage src={a.avatar} />
                               <AvatarFallback className="bg-black text-white text-[8px] font-bold">
                                 {a.name.split(" ").map(n => n[0]).join("")}
                               </AvatarFallback>
                             </Avatar>
                           ))}
                         </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-[11px] font-bold text-gray-400">
                          {task.startDate ? format(new Date(task.startDate), "MMM dd") : "-"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[11px] font-bold ${task.dueDate && new Date(task.dueDate) < new Date() ? "text-red-500" : "text-gray-600"}`}>
                          {task.dueDate ? format(new Date(task.dueDate), "MMM dd") : "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                           <Avatar className="w-6 h-6 border border-gray-200 dark:border-white/10 shadow-sm">
                             <AvatarImage src={task.createdBy?.avatar} />
                             <AvatarFallback className="bg-black text-white text-[8px]">
                               {task.createdBy?.name.split(" ").map(n => n[0]).join("")}
                             </AvatarFallback>
                           </Avatar>
                        </div>
                      </td>
                      <td className="p-4 text-right px-6">
                        <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">
                           {format(new Date(task.updatedAt), "MM-dd-yyyy")}
                        </span>
                      </td>
                      <td className="p-4 text-right px-6">
                        <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">
                           {format(new Date(task.createdAt), "MM-dd-yyyy")}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
