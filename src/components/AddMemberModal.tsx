import { useState } from "react";
import {
  X,
  User,
  Mail,
  Briefcase,
  Building,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/appStore";

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberModal({ open, onOpenChange }: AddMemberModalProps) {
  const { addUser, currentUser } = useAppStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = currentUser?.isSuperAdmin === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !role || !department || !password) return;

    setIsSubmitting(true);
    try {
      await addUser({
        name,
        email,
        role: isSuperAdmin && makeAdmin ? "Administrator" : "Member",
        jobTitle: role, // Use the UI role input for the jobTitle database field
        department,
        password,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      });
      onOpenChange(false);
      setName("");
      setEmail("");
      setRole("");
      setDepartment("");
      setPassword("");
      setMakeAdmin(false);
    } catch (error) {
      console.error("Failed to add member:", error);
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
            <div className="w-12 h-12 bg-white/5 rounded-[20px] flex items-center justify-center border border-white/10">
              <User className="w-6 h-6 text-white/90" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-xl font-bold text-white tracking-widest uppercase">
                ADD MEMBER
              </DialogTitle>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-5 space-y-4 bg-white overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Full Name
              </label>
              <Input
                placeholder="e.g. Sarah Jenkins"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border-gray-100 focus:border-black focus:ring-black/5 h-12 font-medium"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Work Email
              </label>
              <Input
                type="email"
                placeholder="sarah@cronabit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border-gray-100 focus:border-black focus:ring-black/5 h-12 font-medium"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border-gray-100 focus:border-black focus:ring-black/5 h-12 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" />
                  Job Title
                </label>
                <Input
                  placeholder="e.g. Graphics Designer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-xl border-gray-100 focus:border-black focus:ring-black/5 h-12 font-medium"
                  disabled={isSuperAdmin && makeAdmin}
                  required={!(isSuperAdmin && makeAdmin)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Building className="w-3.5 h-3.5" />
                  Department
                </label>
                <Input
                  placeholder="e.g. Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="rounded-xl border-gray-100 focus:border-black focus:ring-black/5 h-12 font-medium"
                  required
                />
              </div>
            </div>

            {/* Super Admin Only: Make Admin Toggle */}
            {isSuperAdmin && (
              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-widest">
                      Make Admin
                    </p>
                  </div>
                </div>
                <Switch
                  checked={makeAdmin}
                  onCheckedChange={setMakeAdmin}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl h-12 bg-black hover:bg-gray-900 text-white shadow-xl shadow-black/20 uppercase tracking-widest font-bold text-[11px] border border-white/10 active:scale-95 transition-all"
            >
              {isSubmitting ? "ADDING..." : "ADD MEMBER"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
