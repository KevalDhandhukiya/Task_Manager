import { useState } from "react";
import { X, Layout, Users, AlignLeft, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store/appStore";
import type { User } from "@/types";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectModal({
  open,
  onOpenChange,
}: CreateProjectModalProps) {
  const { users, currentUser, addProject } = useAppStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMember = (user: User) => {
    if (selectedMembers.find((m) => m.id === user.id)) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== user.id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      // Automatically add current user if not already in the list to ensure it shows in sidebar
      const finalMembers = [...selectedMembers];
      if (currentUser && !finalMembers.find((m) => m.id === currentUser.id)) {
        finalMembers.push(currentUser);
      }

      await addProject({
        name,
        description,
        status: "active",
        members: finalMembers,
      });
      onOpenChange(false);
      setName("");
      setDescription("");
      setSelectedMembers([]);
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-white max-h-[90vh] flex flex-col"
      >
        <div className="bg-black p-6 pb-8 text-white relative border-b border-white/5 shadow-2xl shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-6 top-6 text-white/30 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-5 mb-1">
            <div className="w-12 h-12 bg-white/5 rounded-[20px] flex items-center justify-center border border-white/10 shadow-inner">
              <Layout className="w-6 h-6 text-white/90" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-xl font-bold text-white tracking-widest uppercase">
                CREATE PROJECT
              </DialogTitle>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 pt-5 space-y-5 bg-white overflow-y-auto scrollbar-hide"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Layout className="w-3.5 h-3.5" />
              Project Name
            </label>
            <Input
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border-gray-100 focus:border-black focus:ring-black/5 h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <AlignLeft className="w-3.5 h-3.5" />
              Description
            </label>
            <Textarea
              placeholder="What's this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl border-gray-100 focus:border-black focus:ring-black/5 min-h-[100px] resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Team Members ({selectedMembers.length})
            </label>
            <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1 scrollbar-thin">
              {users.map((user) => {
                const isSelected = selectedMembers.find(
                  (m) => m.id === user.id,
                );
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleMember(user)}
                    className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all ${
                      isSelected
                        ? "bg-black/5 border-black text-black"
                        : "bg-white border-gray-100 text-gray-400 hover:text-black hover:border-gray-200"
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="w-6 h-6 ring-1 ring-gray-100">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {isSelected && (
                        <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-black rounded-full flex items-center justify-center border border-white shadow-sm">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium">{user.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 rounded-xl h-12 bg-black hover:bg-gray-900 text-white shadow-xl shadow-black/20 uppercase tracking-widest font-bold text-[11px] border border-white/10 active:scale-95 transition-all"
            >
              {isSubmitting ? "LAUNCHING..." : "CREATE PROJECT"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
