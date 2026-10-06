import { useState, useMemo } from "react";
import { Search, Plus, Users, ChevronRight, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/store/appStore";
import { AddMemberModal } from "@/components/AddMemberModal";

export function TeamDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] =
    useState("All Departments");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { users, tasks, currentUser, deleteUser } = useAppStore();
  const isAdmin = currentUser?.role === "Administrator";
  const isSuperAdmin = currentUser?.isSuperAdmin;

  const handleDeleteMember = async (userId: string) => {
    if (String(userId) === String(currentUser?.id)) {
      alert("You cannot delete your own account.");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete this member? This action cannot be undone.",
      )
    ) {
      await deleteUser(userId);
    }
  };

  // Get unique departments and roles
  const departments = useMemo(() => {
    const depts = [
      "All Departments",
      ...Array.from(new Set(users.map((m) => m.department))),
    ];
    return depts.filter((d) => d);
  }, [users]);

  const roles = ["All Roles", "SuperAdmin", "Administrator", "Member"];

  // Filter members
  const filteredMembers = useMemo(() => {
    return users.filter((member) => {

      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.role &&
          member.role.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDepartment =
        selectedDepartment === "All Departments" ||
        member.department === selectedDepartment;
      const matchesRole =
        selectedRole === "All Roles" ||
        (selectedRole === "SuperAdmin"
          ? member.isSuperAdmin
          : member.role === selectedRole);
      return matchesSearch && matchesDepartment && matchesRole;
    });
  }, [users, searchQuery, selectedDepartment, selectedRole]);

  // Calculate stats for each member
  const membersWithStats = useMemo(() => {
    return filteredMembers.map((member) => {
      const memberTasks = tasks.filter((t) =>
        t.assignees.some((a) => a.id === member.id),
      );
      return {
        ...member,
        taskCount: memberTasks.length,
        completedTasks: memberTasks.filter((t) => t.status === "completed")
          .length,
      };
    });
  }, [filteredMembers, tasks]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(membersWithStats.length / itemsPerPage);
  const displayedMembers = membersWithStats.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-gray-900 dark:text-white tracking-tight">
            Team
          </h1>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-black hover:bg-gray-900 text-white gap-2.5 h-14 px-10 rounded-2xl shadow-xl shadow-indigo-500/10 active:scale-95 transition-all font-bold text-[11px] uppercase tracking-widest border border-white/10"
          >
            <Plus className="w-5 h-5" />
            Add member
          </Button>
        )}
      </div>

      {/* Members Table Card - ClickUp Style */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden bg-white dark:bg-gray-900 pb-4">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="h-12 px-4 border-none bg-gray-50 rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/10 outline-none text-gray-500"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {(isSuperAdmin || isAdmin) && (
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="h-12 px-4 border-none bg-gray-50 rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/10 outline-none text-gray-500"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="overflow-hidden bg-white dark:bg-gray-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Member
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Job Title
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Active tasks
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Status
                  </th>
                  {isSuperAdmin && (
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {displayedMembers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isSuperAdmin ? 6 : 5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-xs font-semibold uppercase tracking-widest">
                        No members found
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="w-10 h-10 ring-2 ring-transparent group-hover:ring-black/10 transition-all">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="bg-black text-white text-xs font-bold">
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full flex items-center justify-center ${member.status === "active" ? "bg-emerald-500 shadow-lg shadow-emerald-500/30" : "bg-rose-500 shadow-lg shadow-rose-500/10"}`}
                            >
                              {member.status === "active" && (
                                <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">
                              {member.name}
                            </p>
                            <p className="text-[11px] text-gray-400 font-medium">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] px-3 uppercase tracking-widest border-none"
                        >
                          {member.jobTitle || 'Team Member'}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                          {member.department}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {member.taskCount}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {member.completedTasks > 0 &&
                              `(${member.completedTasks} completed)`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Badge
                          variant={
                            member.status === "active" ? "default" : "secondary"
                          }
                          className={
                            member.status === "active"
                              ? "bg-emerald-500 text-white font-bold text-[10px] px-3 uppercase tracking-widest border-none shadow-lg shadow-emerald-500/20"
                              : "bg-rose-50 text-rose-500 font-bold text-[10px] px-3 uppercase tracking-widest border-none"
                          }
                        >
                          {member.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-5 text-right">
                          {String(member.id) !== String(currentUser?.id) && (
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                              title="Delete Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, membersWithStats.length)}{" "}
                of {membersWithStats.length} members
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 disabled:opacity-30 transition-all active:scale-90"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${currentPage === i + 1 ? "bg-black text-white shadow-lg shadow-black/20" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 disabled:opacity-30 transition-all active:scale-90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
      {isAdmin && (
        <AddMemberModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
        />
      )}
    </div>
  );
}
