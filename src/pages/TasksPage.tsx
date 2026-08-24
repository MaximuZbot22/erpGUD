import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Plus, CheckSquare, RefreshCcw, AlertTriangle, Clock, Calendar, Briefcase, UserPlus } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { auditLogService } from '../services/audit';
import { GoogleSheetsService } from '../services/google';

interface TaskRecord {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  dueDate: string;
  category?: string;
  dueTime?: string;
  duration?: string;
  meetee?: string;
  reason?: string;
}

export const TasksPage: React.FC = () => {
  const { profile, googleToken } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSheet, setSyncingSheet] = useState(false);
  
  // Rich Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskAssignee, setTaskAssignee] = useState('EA');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskCategory, setTaskCategory] = useState('Admin');
  const [taskDuration, setTaskDuration] = useState('1hr');
  const [taskMeetee, setTaskMeetee] = useState('');
  const [taskReason, setTaskReason] = useState('');

  // Active view filter
  const [activeTab, setActiveTab] = useState<'immediate' | 'planned' | 'all'>('immediate');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Load tasks from Sheets & Firestore
  useEffect(() => {
    setLoading(true);
    let firestoreList: TaskRecord[] = [];
    let sheetList: TaskRecord[] = [];

    const mergeAndSetTasks = (fList: TaskRecord[], sList: TaskRecord[]) => {
      const merged = [...fList];
      sList.forEach(st => {
        const exists = merged.some(ft => 
          ft.id.toLowerCase() === st.id.toLowerCase() || 
          (ft.title.toLowerCase() === st.title.toLowerCase() && ft.dueDate === st.dueDate)
        );
        if (!exists) {
          merged.push(st);
        }
      });
      setTasks(merged);
    };

    // 1. Listen to Firestore
    const q = query(collection(db, 'tasks'), orderBy('timestamp', 'desc'));
    const unsubscribeFirestore = onSnapshot(q, (snap) => {
      const list: TaskRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          title: data.title,
          status: data.status || 'Pending',
          priority: data.priority || 'Medium',
          assignee: data.assignee || 'EA',
          dueDate: data.dueDate || '',
          category: data.category || 'Admin',
          dueTime: data.dueTime || '',
          duration: data.duration || '',
          meetee: data.meetee || '',
          reason: data.reason || ''
        });
      });
      firestoreList = list;
      mergeAndSetTasks(firestoreList, sheetList);
      setLoading(false);
    }, (err) => {
      console.warn('Error syncing tasks collection:', err);
      setLoading(false);
    });

    // 2. Fetch from Google Sheet (Executive Command Center - EA Planner tab)
    const fetchSheetTasks = async () => {
      try {
        const eccSheetId = import.meta.env.VITE_GOOGLE_SHEET_EXECUTIVE_COMMAND_CENTER_ID || '1ZLLF1qNVuRowXaaOYTRGZZRmzD9FnhtH0OdCZnnEvxI';
        const response = await GoogleSheetsService.getSpreadsheetValues(
          googleToken,
          eccSheetId,
          "'EA Planner'!A2:J100"
        );
        if (response && response.values) {
          const list: TaskRecord[] = response.values
            .filter(row => row[1] || row[2]) // Skip empty lines
            .map((row, idx) => ({
              id: row[1] || `SHEET-TASK-${idx}`,
              title: row[2] || 'Untitled Task',
              category: 'Executive',
              priority: row[3] || 'Medium',
              status: row[4] || 'Pending',
              assignee: row[5] || 'EA',
              dueDate: row[6] || '',
              dueTime: '',
              duration: '',
              meetee: '',
              reason: row[8] || '' // Notes mapped to reason
            }));
          sheetList = list;
          mergeAndSetTasks(firestoreList, sheetList);
        }
      } catch (err) {
        console.warn('Failed to load tasks from EA Planner spreadsheet:', err);
      }
    };

    fetchSheetTasks();

    return () => unsubscribeFirestore();
  }, [googleToken]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !profile) return;

    setSyncingSheet(true);
    try {
      const finalDueDate = taskDueDate || new Date().toISOString().split('T')[0];

      // 1. Write to Firestore for real-time local sync
      const taskRef = await addDoc(collection(db, 'tasks'), {
        title: taskTitle,
        status: 'Pending',
        priority: taskPriority,
        assignee: taskAssignee,
        dueDate: finalDueDate,
        dueTime: taskDueTime,
        category: taskCategory,
        duration: taskDuration,
        meetee: taskMeetee,
        reason: taskReason,
        timestamp: Date.now(),
        creator: profile.displayName || 'GUD User'
      });

      // 2. Append to Executive Command Center Google Sheet (EA Planner tab)
      if (googleToken) {
        try {
          const eccSheetId = import.meta.env.VITE_GOOGLE_SHEET_EXECUTIVE_COMMAND_CENTER_ID || '1ZLLF1qNVuRowXaaOYTRGZZRmzD9FnhtH0OdCZnnEvxI';
          const taskRecordId = `TSK-${Math.floor(Math.random() * 900 + 100)}`; // Format: TSK-004
          const newRowValues = [
            "", // Column A (empty)
            taskRecordId, // Column B (Task ID)
            taskTitle, // Column C (Task Description)
            taskPriority, // Column D (Priority)
            'Pending', // Column E (Status)
            taskAssignee === 'EA' ? 'Mohith' : 'Himabindu', // Column F (Delegated To)
            finalDueDate, // Column G (Due Date)
            "", // Column H (Follow-up Date)
            taskReason || "", // Column I (Notes)
            "" // Column J (Link)
          ];
          await GoogleSheetsService.appendSpreadsheetValues(
            googleToken,
            eccSheetId,
            "'EA Planner'!A:J",
            [newRowValues]
          );
        } catch (sheetErr) {
          console.warn('Dual writeback to Google Sheets failed:', sheetErr);
        }
      }

      await auditLogService.logActivity(
        { uid: profile.uid, email: profile.email, displayName: profile.displayName },
        'Created operation task (Firestore + Sheets)',
        'tasks',
        `Task: ${taskTitle} assigned to ${taskAssignee}`,
        `TASK-${taskRef.id.substring(0, 4)}`
      );

      // Reset Form and close drawer
      setTaskTitle('');
      setTaskDueDate('');
      setTaskDueTime('');
      setTaskMeetee('');
      setTaskReason('');
      setIsCreateOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingSheet(false);
    }
  };

  const toggleTaskStatus = async (task: TaskRecord) => {
    if (!profile) return;
    try {
      const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      const docRef = doc(db, 'tasks', task.id);
      await updateDoc(docRef, { status: nextStatus });

      await auditLogService.logActivity(
        { uid: profile.uid, email: profile.email, displayName: profile.displayName },
        `Marked task as ${nextStatus.toLowerCase()}`,
        'tasks',
        `Updated task: ${task.title}`,
        `TASK-${task.id.substring(0, 4)}`
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Date Filtering Logic
  const getFilteredTasks = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    return tasks.filter((t) => {
      if (activeTab === 'all') return true;
      
      const isCompleted = t.status === 'Completed';
      const isUrgent = t.priority === 'Urgent' || t.priority === 'High';
      const isOverdueOrToday = t.dueDate ? t.dueDate <= todayStr : true;

      if (activeTab === 'immediate') {
        // Pending tasks due today, overdue, or marked urgent
        return !isCompleted && (isOverdueOrToday || isUrgent);
      }
      
      if (activeTab === 'planned') {
        // Future tasks that are not urgent, or completed tasks
        return isCompleted || (!isOverdueOrToday && !isUrgent);
      }
      
      return true;
    });
  };

  // Urgent Alerts Detection
  const urgentTasks = tasks.filter(t => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isDueToday = t.dueDate === todayStr;
    const isUrgentPriority = t.priority === 'Urgent' || t.priority === 'High';
    return isDueToday && isUrgentPriority && t.status !== 'Completed';
  });

  const columns = [
    { 
      key: 'id', 
      header: 'ID', 
      render: (row: TaskRecord) => <span className="font-mono font-bold text-slate-400">TASK-{row.id.substring(0, 4).toUpperCase()}</span> 
    },
    { 
      key: 'title', 
      header: 'Task Name & Details', 
      className: 'w-full',
      render: (row: TaskRecord) => (
        <div className="space-y-1">
          <div className="font-bold text-slate-800 dark:text-white leading-relaxed">{row.title}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 font-semibold uppercase">
            <span className="bg-slate-100 dark:bg-slate-850 px-1.5 py-0.2 rounded text-slate-500">{row.category}</span>
            {row.duration && <span>• ⏳ {row.duration}</span>}
            {row.meetee && <span>• 🤝 Meet: {row.meetee}</span>}
            {row.dueTime && <span>• ⏰ {row.dueTime}</span>}
          </div>
          {row.reason && <p className="text-[10px] text-slate-450 italic mt-0.5 line-clamp-1">"{row.reason}"</p>}
        </div>
      )
    },
    { key: 'assignee', header: 'Assignee', className: 'capitalize font-bold text-emerald-800' },
    { key: 'dueDate', header: 'Due Date' },
    { 
      key: 'priority', 
      header: 'Priority', 
      render: (row: TaskRecord) => <StatusBadge status={row.priority} label={row.priority} /> 
    },
    { 
      key: 'status', 
      header: 'Status', 
      render: (row: TaskRecord) => <StatusBadge status={row.status} label={row.status} /> 
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-705 dark:text-emerald-405" />
            <span>Executive Taskboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Track team assignments, B2B deliverables, and calendar coordination from the Executive Command Center.</p>
        </div>
        <Button 
          type="button" 
          onClick={() => setIsCreateOpen(true)} 
          leftIcon={<Plus className="w-4 h-4" />}
          size="sm"
        >
          Add Task
        </Button>
      </div>

      {/* Urgent Alerts Pulser Banner */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-3.5 flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-red-800 dark:text-red-400">URGENT: Critical Tasks Due Today</h4>
            <p className="text-red-650 dark:text-red-450 mt-0.5 font-medium leading-relaxed">
              You have {urgentTasks.length} high priority tasks due today that require immediate action:
            </p>
            <ul className="list-disc list-inside mt-1.5 text-red-700 dark:text-red-300 font-semibold space-y-0.5">
              {urgentTasks.map(t => <li key={t.id}>{t.title}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Tasks List Card - Full Width */}
      <Card className="w-full border border-slate-100 dark:border-slate-850">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle>Executive Tasks List</CardTitle>
            {loading && <RefreshCcw className="w-4 h-4 animate-spin text-slate-400" />}
          </div>
          
          {/* View Tabs */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 border border-slate-150 dark:border-slate-850 rounded-lg">
            {(['immediate', 'planned', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all duration-150 ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-850 text-emerald-800 dark:text-emerald-450 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                }`}
              >
                {tab === 'immediate' ? 'Immediate Tasks' : tab === 'planned' ? 'Planned for Later' : 'All Tasks'}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={getFilteredTasks()}
            rowIdKey="id"
            rowActions={(row) => [
              { 
                label: row.status === 'Completed' ? 'Mark Pending' : 'Mark Completed', 
                onClick: () => toggleTaskStatus(row) 
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Create Task Drawer */}
      <Drawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Executive Task"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={(e) => handleCreateTask(e)} loading={syncingSheet} size="sm">
              Publish Task
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          
          {/* Task Title */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Task Title / Description</label>
            <input
              type="text"
              required
              placeholder="e.g. Tempering machine recalibration"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
            />
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Category</label>
              <select
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
              >
                <option>Sales</option>
                <option>Vendor</option>
                <option>Legal</option>
                <option>Production</option>
                <option>Marketing</option>
                <option>Finance</option>
                <option>Admin</option>
                <option>Personal</option>
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Assignee</label>
              <select
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
              >
                <option value="EA">EA (Mohith)</option>
                <option value="Boss">Boss (Himabindu)</option>
              </select>
            </div>
          </div>

          {/* Priority & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Duration (Estimate)</label>
              <select
                value={taskDuration}
                onChange={(e) => setTaskDuration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
              >
                <option>15 mins</option>
                <option>30 mins</option>
                <option>1hr</option>
                <option>2hrs</option>
                <option>Half Day</option>
                <option>Full Day</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Due Date</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Due Time</label>
              <input
                type="time"
                value={taskDueTime}
                onChange={(e) => setTaskDueTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Who we are meeting */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Who are we meeting? (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Idukki Farmers Lead"
              value={taskMeetee}
              onChange={(e) => setTaskMeetee(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
            />
          </div>

          {/* Reason / Context */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400">Reason / Description</label>
            <textarea
              placeholder="Additional context or notes..."
              value={taskReason}
              onChange={(e) => setTaskReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 font-semibold"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
};
export default TasksPage;
