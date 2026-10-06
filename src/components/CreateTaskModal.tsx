import { useState, useEffect } from "react";
import {
  X,
  Check,
  Flag,
  Users,
  Paperclip,
  ChevronDown,
  Sparkle,
  Bold,
  Italic,
  List as ListIcon,
  Code,
  Link as LinkIcon,
  File as FileIcon,
} from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore, BACKEND_URL, resolveImageUrl } from "@/store/appStore";
import type { TaskPriority, TaskStatus, User } from "@/types";
import { formatDateMMDDYYYY } from "@/lib/utils";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<TaskStatus, string> = {
  todo: "TO DO",
  "in-progress": "IN PROGRESS",
  testing: "TESTING",
  completed: "COMPLETED",
};

export function CreateTaskModal({ open, onOpenChange }: CreateTaskModalProps) {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const {
    currentUser,
    users,
    addTask,
    projects,
    addProject,
    createTaskProjectId,
  } = useAppStore();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(createTaskProjectId || "");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [description, setDescription] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setProjectId(createTaskProjectId || "");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
        setDescription("");
      }
    }
  }, [open, createTaskProjectId]);

  const [selectedAssignees, setSelectedAssignees] = useState<User[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !currentUser) return;
    try {
      await addProject({
        name: newProjectName.trim(),
        description: "Tactical project initialized from mission control.",
        status: "active",
        members: [currentUser],
      });
      setIsCreatingProject(false);
      setNewProjectName("");
      const lastProj = useAppStore.getState().projects;
      if (lastProj.length > 0) setProjectId(lastProj[lastProj.length - 1].id);
    } catch (error) {
      console.error("❌ Project creation error:", error);
    }
  };

  const handleAssigneeToggle = (user: User) => {
    setSelectedAssignees((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) return prev.filter((u) => u.id !== user.id);
      return [...prev, user];
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentUser) return;
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${BACKEND_URL}/upload`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${useAppStore.getState().token}`
          },
          body: formData,
        });
        if (!res.ok) throw new Error("File upload failed");
        const { url } = await res.json();
        const absoluteUrl = resolveImageUrl(url);
        const newAttachment = {
          id: Math.random().toString(36).substring(2, 15),
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          type: file.type.split("/")[1] || "file",
          url: absoluteUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      } catch (error) {
        console.error("❌ Upload error:", error);
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    if (editorRef.current) editorRef.current.innerHTML = "";
    setPriority("medium");
    setStatus("todo");
    setDueDate("");
    setStartDate("");
    setProjectId("");
    setSelectedAssignees([]);
    setAttachments([]);
  };

  const handleDiscard = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !currentUser) return;
    await addTask({
      title: title.trim(),
      description: description.trim(),
      projectId,
      priority,
      status,
      startDate: startDate || "",
      dueDate: dueDate || "",
      assignees: selectedAssignees,
      createdBy: currentUser,
      tags: [],
      attachments: attachments as any,
      comments: [],
    });
    resetForm();
    onOpenChange(false);
  };

  const handleAiWrite = () => {
    if (!title) return;
    setIsAiGenerating(true);
    setTimeout(() => {
      const generatedText = `Objective: Execute tactical strategy for "${title}". <br/><br/>Key Steps:<br/>1. Identify mission requirements.<br/>2. Facilitate stakeholder alignment.<br/>3. Execute with technical precision.`;
      setDescription(generatedText);
      if (editorRef.current) editorRef.current.innerHTML = generatedText;
      setIsAiGenerating(false);
    }, 1200);
  };

  const handleLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) {
      alert("Please select some text first to link it.");
      return;
    }
    
    const range = selection.getRangeAt(0);
    const url = prompt("Enter Tactical URL:", "https://");
    
    if (url) {
      // Re-apply selection if focus was lost during prompt
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("createLink", false, url);
      // Sync description state after command
      if (editorRef.current) {
        setDescription(editorRef.current.innerHTML);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit();
    }
  };

  const activeUsers = users.filter((u) => u.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-32px)] max-w-[660px] p-0 bg-white border-none shadow-[0_20px_80px_-20px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden font-sans text-gray-900 animate-in fade-in zoom-in-95 duration-200"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Task Controller</DialogTitle>
          <DialogDescription>Initialize mission parameters.</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-0 bg-white">
          <div className="relative pb-2.5 px-0.5 group">
            <span className="text-[11px] font-bold text-black tracking-[0.1em] uppercase">
              New Task
            </span>
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black rounded-t-full" />
          </div>
          <button
            onClick={handleDiscard}
            className="p-1 px-1.5 mb-2 hover:bg-red-50 rounded-lg transition-all text-gray-300 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-5 py-4 space-y-4 sm:space-y-5 overflow-y-auto max-h-[70vh] scrollbar-hide bg-white">
          {/* Project Hub */}
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50/50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-all cursor-pointer group select-none h-7">
                  <Check className="w-3 h-3 text-gray-400 group-hover:text-black" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 group-hover:text-black">
                    {projects.find((p) => p.id === projectId)?.name ||
                      "Select Project"}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-gray-400" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[calc(100vw-64px)] sm:w-[220px] p-2 rounded-xl shadow-2xl bg-white border-gray-100 z-[1001]"
              >
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => setProjectId(p.id)}
                    className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg cursor-pointer text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-black hover:bg-black/5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
                    {p.name}
                    {projectId === p.id && (
                      <Check className="w-3 h-3 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => setIsCreatingProject(true)}
                  className="flex items-center gap-2 px-2.5 py-2.5 rounded-lg cursor-pointer text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50"
                >
                  + Create New Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isCreatingProject && (
              <div className="flex w-full sm:w-auto gap-1.5 animate-in slide-in-from-left-2 items-center">
                <input
                  autoFocus
                  placeholder="Project Name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="flex-1 sm:flex-none h-7 px-2.5 bg-white border border-gray-200 rounded-lg text-[9px] font-bold uppercase tracking-wider text-gray-900 outline-none shadow-sm placeholder:text-gray-300"
                />
                <Button
                  onClick={handleCreateProject}
                  className="h-7 px-3 bg-black hover:bg-gray-800 text-white text-[9px] rounded-lg font-bold uppercase tracking-widest"
                >
                  Save
                </Button>
                <button
                  onClick={() => setIsCreatingProject(false)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Task Name Entry */}
          <div>
            <input
              autoFocus
              placeholder="Task Name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-xl sm:text-2xl font-medium text-gray-900 placeholder:text-gray-300 placeholder:font-normal bg-transparent border-none outline-none tracking-tight"
            />
          </div>

          {/* Tactical Action Grid */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50/50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-all text-gray-600 cursor-pointer h-7 group select-none">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${status === "todo" ? "bg-black" : status === "in-progress" ? "bg-orange-500" : status === "testing" ? "bg-blue-500" : "bg-green-500"}`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-black">
                    {statusLabels[status]}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-gray-400 group-hover:text-black" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[170px] p-2 rounded-xl bg-white border-gray-100 z-[1001]"
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setStatus(key as TaskStatus)}
                    className="group flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-black/5"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${key === "todo" ? "bg-black" : key === "in-progress" ? "bg-orange-500" : key === "testing" ? "bg-blue-500" : "bg-green-500"}`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${status === key ? "text-black" : "text-gray-500 group-hover:text-black"}`}
                    >
                      {label}
                    </span>
                    {status === key && (
                      <Check className="w-3 h-3 ml-auto text-black" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50/50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-all text-gray-600 cursor-pointer h-7 group select-none">
                  <Flag
                    className={`w-3 h-3 ${priority === "high" ? "text-red-500 fill-red-500" : "text-gray-400"}`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-black">
                    {priority} Priority
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-gray-400 group-hover:text-black" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[170px] p-2 rounded-xl bg-white border-gray-100 z-[1001]"
              >
                {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setPriority(p)}
                    className="group flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-black/5"
                  >
                    <Flag
                      className={`w-3 h-3 ${p === "high" ? "text-red-500 fill-red-500" : p === "medium" ? "text-blue-500 fill-blue-500" : "text-gray-400"}`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${priority === p ? "text-black" : "text-gray-500 group-hover:text-black"}`}
                    >
                      {p}
                    </span>
                    {priority === p && (
                      <Check className="w-3 h-3 ml-auto text-black" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div
              className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50/50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-all cursor-pointer h-7 group"
              onClick={() => startDateInputRef.current?.showPicker()}
            >
              <span className="text-[8px] font-black text-gray-300 uppercase">START:</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 group-hover:text-black">{formatDateMMDDYYYY(startDate) || "TBD"}</span>
              <input ref={startDateInputRef} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="absolute w-0 h-0 opacity-0 pointer-events-none" />
            </div>

            <div
              className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50/50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-all cursor-pointer h-7 group"
              onClick={() => dueDateInputRef.current?.showPicker()}
            >
              <span className="text-[8px] font-black text-gray-300 uppercase">DUE:</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 group-hover:text-black">{formatDateMMDDYYYY(dueDate) || "TBD"}</span>
              <input ref={dueDateInputRef} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="absolute w-0 h-0 opacity-0 pointer-events-none" />
            </div>
          </div>

          {/* Rich Editor Toolbar & Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                {[
                  { icon: Bold, label: "Bold", cmd: "bold" },
                  { icon: Italic, label: "Italic", cmd: "italic" },
                  { icon: ListIcon, label: "List", cmd: "insertUnorderedList" },
                  { icon: Code, label: "Code", cmd: "formatBlock", value: "pre" },
                ].map(({ icon: Icon, label, cmd, value }) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand(cmd, false, value);
                    }}
                    className="p-1 rounded-md text-gray-300 hover:bg-gray-50 hover:text-black transition-all"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={handleLink}
                  className="p-1 rounded-md text-gray-300 hover:bg-gray-50 hover:text-black transition-all"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={handleAiWrite}
                disabled={isAiGenerating || !title.trim()}
                className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all"
              >
                <Sparkle
                  className={`w-3 h-3 ${isAiGenerating ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">
                  {isAiGenerating ? "Synthesizing..." : "AI Write"}
                </span>
                <span className="sm:hidden">AI</span>
              </button>
            </div>
            <div className="relative min-h-[100px] sm:min-h-[140px] p-3.5 bg-gray-50/30 rounded-xl border border-gray-50 hover:border-gray-100 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-black/5">
              <div
                ref={editorRef}
                contentEditable
                onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                className="w-full text-xs leading-relaxed text-gray-700 outline-none tactical-prose"
              />
              {!description && (
                <div className="absolute top-3.5 left-3.5 pointer-events-none text-gray-300 text-xs font-normal">
                  Task specifications...
                </div>
              )}
            </div>
          </div>

          {/* Visual Attachments List */}
          {attachments.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-0.5">
                Attachments ({attachments.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2.5 bg-gray-50/50 rounded-xl border border-gray-50 group hover:bg-white hover:border-gray-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 group-hover:text-black border border-gray-100 shadow-sm transition-all">
                         <FileIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-700 truncate max-w-[200px]">{file.name}</p>
                        <p className="text-[8px] font-medium text-gray-300 uppercase">{file.size} • {file.type}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeAttachment(file.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignees */}
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-0.5">
              Assignees
            </p>
            <div className="flex flex-wrap gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-gray-200 text-gray-300 hover:border-black hover:text-black transition-all">
                    <Users className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[calc(100vw-64px)] sm:w-[220px] p-2 rounded-xl bg-white border-gray-100 z-[1001]"
                >
                  {activeUsers.map((u) => (
                    <DropdownMenuItem
                      key={u.id}
                      onClick={() => handleAssigneeToggle(u)}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer hover:bg-black/5"
                    >
                      <Avatar className="w-6 h-6"><AvatarImage src={u.avatar} /></Avatar>
                      <span className="text-[10px] font-bold text-gray-600">{u.name}</span>
                      {selectedAssignees.find((a) => a.id === u.id) && <Check className="w-3 h-3 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedAssignees.map((a) => (
                <div key={a.id} className="relative group">
                  <Avatar className="w-7 h-7 ring-2 ring-white">
                    <AvatarImage src={a.avatar} />
                  </Avatar>
                  <button
                    onClick={() => handleAssigneeToggle(a)}
                    className="absolute -top-1 -right-1 bg-white shadow rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all text-red-500"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-4 border-t border-gray-50 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-auto">
            <input type="file" multiple onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
            <button className="flex items-center justify-center sm:justify-start gap-1.5 w-full sm:w-auto px-3 py-1.5 text-gray-400 hover:text-black transition-all">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Attach Files
              </span>
            </button>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="h-10 w-full sm:w-auto px-8 bg-black hover:bg-gray-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-xl shadow-black/10 transition-all active:scale-95"
          >
            Create New Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
