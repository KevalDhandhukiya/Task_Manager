import { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, Clock, AlertCircle, FileText, Download,
  ArrowUpRight, ArrowDownRight, MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/appStore';

const COLORS = ['#94a3b8', '#f97316', '#3b82f6', '#22c55e'];
const PRIORITY_COLORS: Record<string, string> = {
  low: '#3B82F6',   // Blue 500
  medium: '#F59E0B', // Amber 500
  high: '#EF4444',   // Red 500
};

export function ReportsPage() {
  const { tasks: allTasks, users } = useAppStore();
  const [filterMemberId, setFilterMemberId] = useState<string | 'all'>('all');

  const tasks = useMemo(() => {
    if (filterMemberId === 'all') return allTasks;
    return allTasks.filter(t => t.assignees.some(a => a.id === filterMemberId));
  }, [allTasks, filterMemberId]);

  const selectedUserName = useMemo(() => {
    if (filterMemberId === 'all') return '';
    return users.find(u => u.id === filterMemberId)?.name || 'Member';
  }, [users, filterMemberId]);

  const taskDistribution = useMemo(() => {
    const counts = {
      todo: tasks.filter(t => t.status === 'todo').length,
      'in-progress': tasks.filter(t => t.status === 'in-progress').length,
      testing: tasks.filter(t => t.status === 'testing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    };
    return [
      { name: 'To Do', value: counts.todo },
      { name: 'In Progress', value: counts['in-progress'] },
      { name: 'Testing', value: counts.testing },
      { name: 'Completed', value: counts.completed },
    ];
  }, [tasks]);

  const teamProductivity = useMemo(() => {
    return users.map(user => {
      const userTasks = tasks.filter(t => t.assignees.some(a => a.id === user.id));
      const completed = userTasks.filter(t => t.status === 'completed').length;
      return {
        name: user.name.split(' ')[0],
        total: userTasks.length,
        completed: completed,
      };
    }).filter(u => u.total > 0).slice(0, 6);
  }, [users, tasks]);

  const priorityStats = useMemo(() => {
    return [
      { name: 'Low', count: tasks.filter(t => t.priority === 'low').length, color: PRIORITY_COLORS.low },
      { name: 'Medium', count: tasks.filter(t => t.priority === 'medium').length, color: PRIORITY_COLORS.medium },
      { name: 'High', count: tasks.filter(t => t.priority === 'high').length, color: PRIORITY_COLORS.high },
    ];
  }, [tasks]);

  const stats = useMemo(() => [
    { 
      label: 'Avg. completion time', 
      value: '2.4 Days', 
      change: '-12%', 
      isUp: false,
      icon: Clock,
      color: 'bg-gray-50 text-black border border-gray-100'
    },
    { 
      label: 'Task velocity', 
      value: '18.5/Week', 
      change: '+24%', 
      isUp: true,
      icon: TrendingUp,
      color: 'bg-gray-50 text-black border border-gray-100'
    },
    { 
      label: 'Active contributors', 
      value: users.filter(u => u.status === 'active').length.toString(), 
      icon: Users,
      color: 'bg-gray-50 text-black border border-gray-100'
    },
    { 
      label: 'Overdue rate', 
      value: '4.2%', 
      change: '-2%', 
      isUp: false,
      icon: AlertCircle,
      color: 'bg-gray-50 text-black border border-gray-100'
    }
  ], [users]);

  const exportToCSV = () => {
    const headers = ['ID', 'Title', 'Status', 'Priority', 'Due Date', 'Assignees'];
    const rows = tasks.map(t => [
      t.id,
      t.title,
      t.status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
      new Date(t.dueDate).toLocaleDateString(),
      t.assignees.map(a => a.name).join('; ')
    ]);
    
    // Excel-friendly CSV with quoting and BOM
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cronabit_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-gray-900 tracking-tight">Reports</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2.5 h-10 px-5 rounded-xl border border-gray-100 bg-white text-gray-500 font-bold text-[10px] uppercase tracking-widest hover:border-black/30 hover:bg-gray-50/50 hover:text-black hover:shadow-xl hover:shadow-gray-200/50 transition-all active:scale-95 cursor-pointer outline-none"
          >
            <Download className="w-4 h-4 opacity-70" />
            Export data
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-black hover:bg-gray-900 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-black/10 h-10 px-5 font-semibold text-xs">
                <FileText className="w-4 h-4" />
                {selectedUserName ? `Custom report: ${selectedUserName}` : 'Custom report'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-2xl p-2 shadow-2xl border-none ring-1 ring-black/5">
              <DropdownMenuLabel className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-2 pb-2">Filter by team member</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => setFilterMemberId('all')}
                className={`rounded-xl px-3 py-2 text-sm cursor-pointer ${filterMemberId === 'all' ? 'bg-black text-white font-bold' : 'text-gray-600'}`}
              >
                Overview
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-gray-50" />
              {users.map(user => (
                <DropdownMenuItem 
                  key={user.id}
                  onClick={() => setFilterMemberId(user.id)}
                  className={`rounded-xl px-3 py-2 text-sm cursor-pointer ${filterMemberId === user.id ? 'bg-black text-white font-bold' : 'text-gray-600'}`}
                >
                  {user.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="premium-card p-0 hover-lift overflow-hidden border-none cursor-default">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                {stat.change && (
                  <div className={`flex items-center gap-0.5 text-xs font-bold ${stat.isUp ? 'text-indigo-600' : 'text-blue-600'}`}>
                    {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-400 tracking-tight leading-none">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productivity Chart */}
        <Card className="lg:col-span-2 premium-card p-0 overflow-hidden border-none">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Team Productivity Engine</CardTitle>
              <Button variant="ghost" size="icon" className="rounded-lg text-gray-400"><MoreHorizontal className="w-5 h-5"/></Button>
            </div>
            <p className="text-sm text-gray-400">Comparing total assigned vs completed tasks per member</p>
          </CardHeader>
          <CardContent className="p-5 pt-2 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamProductivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" fill="#f1f5f9" radius={[4, 4, 0, 0]} name="Assigned" />
                <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card className="premium-card p-0 overflow-hidden border-none">
          <CardHeader className="p-6 pb-2 text-center">
            <CardTitle className="text-lg font-bold">Workflow Health</CardTitle>
            <p className="text-sm text-gray-400">Current task status distribution</p>
          </CardHeader>
          <CardContent className="p-6 pt-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {taskDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="px-6 pb-6 space-y-3">
            {taskDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-gray-500 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Priority Distribution Bar */}
      <Card className="premium-card p-0 overflow-hidden border-none text-white bg-black shadow-2xl shadow-black/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Priority heatmap</h3>
              <p className="text-white/40 font-semibold text-xs mt-2 tracking-tight">Identification of critical business risks</p>
            </div>
            <div className="flex gap-6">
              {priorityStats.map((p, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-bold">{p.count}</p>
                  <p className="text-[11px] font-bold text-white/30 tracking-widest">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-white/10 gap-1 p-0.5">
            {priorityStats.map((p, i) => {
              const percentage = tasks.length > 0 ? (p.count / tasks.length) * 100 : 0;
              return (
                <div 
                  key={i} 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: p.color
                  }}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
