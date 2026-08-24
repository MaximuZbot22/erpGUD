import React, { useState, useEffect } from 'react';
import { CalendarRange, Calendar as CalendarIcon, Info, RefreshCw } from 'lucide-react';
import { Calendar, CalendarEvent } from '../components/ui/Calendar';
import { useAuth } from '../context/AuthContext';
import { GoogleSheetsService } from '../services/google';
import { collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';

export const CalendarPage: React.FC = () => {
  const { googleToken } = useAuth();
  
  // Local overlay events
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([
    {
      id: 'EVT0001',
      title: 'Tempering Chamber Run #32 (Almond Noir)',
      description: 'Tempering run of 50kg Idukki cacao mass with roasted almonds. Quality check required.',
      start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 10, 0),
      end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 30),
      category: 'production',
      location: 'Tempering Room A'
    },
    {
      id: 'EVT0002',
      title: 'Cacao Sourcing Shipment (Idukki Co-Op)',
      description: 'Receive 500kg of fermentation-cured cacao beans. Verify moisture level upon arrival.',
      start: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 9, 30),
      end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 14, 0),
      category: 'procurement',
      location: 'Receiving Dock 2'
    }
  ]);

  // Combined master events state
  const [masterEvents, setMasterEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Firestore tasks real-time fetch
  const [firestoreTasks, setFirestoreTasks] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const taskEvts: CalendarEvent[] = snap.docs.map((doc) => {
        const data = doc.data();
        // Parse date
        const dueDate = data.dueDate ? new Date(data.dueDate) : new Date();
        return {
          id: doc.id,
          title: `📝 Task: ${data.title}`,
          description: data.description || `Assigned to: ${data.assignee || 'Unassigned'}`,
          start: dueDate,
          end: new Date(dueDate.getTime() + 60 * 60 * 1000), // 1 hr block
          category: 'general',
          location: 'ERP Tasks Engine'
        };
      });
      setFirestoreTasks(taskEvts);
    });
    return () => unsubscribe();
  }, []);

  // Google Sheets Master Calendar aggregation
  const [googleSheetEvents, setGoogleSheetEvents] = useState<CalendarEvent[]>([]);

  const fetchGoogleSheetSchedules = async () => {
    setLoading(true);
    const gathered: CalendarEvent[] = [];

    // 1. Production runs (Sheet 7)
    try {
      const prodSheetId = import.meta.env.VITE_GOOGLE_SHEET_PRODUCTION_ID || '1dAqlGqKyI0qE8wTA-sQKTXsBKZQG8gkJ6u4_lNy4I28';
      const response = await GoogleSheetsService.getSpreadsheetValues(googleToken, prodSheetId, 'Production Master!A2:O100');
      if (response && response.values) {
        response.values.forEach((row, idx) => {
          const dateSent = row[7] ? new Date(row[7]) : null;
          const expectedReturn = row[11] ? new Date(row[11]) : null;
          if (dateSent && !isNaN(dateSent.getTime())) {
            gathered.push({
              id: `SHEET-PROD-SENT-${idx}`,
              title: `🏭 Production Run: ${row[0] || 'Run'}`,
              description: `Batch: ${row[1] || ''}. Qty: ${row[6] || ''} units. Status: ${row[12] || ''}`,
              start: dateSent,
              end: new Date(dateSent.getTime() + 2 * 60 * 60 * 1000),
              category: 'production',
              location: 'Production Line'
            });
          }
          if (expectedReturn && !isNaN(expectedReturn.getTime())) {
            gathered.push({
              id: `SHEET-PROD-RET-${idx}`,
              title: `📦 Delivery Expected: ${row[0] || 'Run'}`,
              description: `Batch: ${row[1] || ''}. Qty: ${row[6] || ''} units. Status: ${row[12] || ''}`,
              start: expectedReturn,
              end: new Date(expectedReturn.getTime() + 2 * 60 * 60 * 1000),
              category: 'production',
              location: 'Receiving Dock'
            });
          }
        });
      }
    } catch (e) {
      console.warn("Calendar failed to load Production master dates:", e);
    }

    // 2. Procurement (Sheet 6, Production Orders)
    try {
      const procurementId = import.meta.env.VITE_GOOGLE_SHEET_PROCUREMENT_ID || '1vRxo7einssDvEdtiK_F_iJkXxu5GNqh3mrNoy63qMgg';
      const response = await GoogleSheetsService.getSpreadsheetValues(googleToken, procurementId, 'Production Orders!A2:L100');
      if (response && response.values) {
        response.values.forEach((row, idx) => {
          const dateSent = row[7] ? new Date(row[7]) : null;
          const expectedComp = row[8] ? new Date(row[8]) : null;
          if (dateSent && !isNaN(dateSent.getTime())) {
            gathered.push({
              id: `SHEET-PROC-SENT-${idx}`,
              title: `🛒 Sourcing: ${row[0] || 'Order'}`,
              description: `Vendor: ${row[1] || ''}. Item: ${row[2] || ''}. Qty: ${row[4] || ''}`,
              start: dateSent,
              end: new Date(dateSent.getTime() + 2 * 60 * 60 * 1000),
              category: 'procurement',
              location: 'Supplier Facility'
            });
          }
          if (expectedComp && !isNaN(expectedComp.getTime())) {
            gathered.push({
              id: `SHEET-PROC-COMP-${idx}`,
              title: `🚚 Procurement Delivery: ${row[0] || 'Order'}`,
              description: `Vendor: ${row[1] || ''}. Item: ${row[2] || ''}. Qty: ${row[4] || ''}`,
              start: expectedComp,
              end: new Date(expectedComp.getTime() + 2 * 60 * 60 * 1000),
              category: 'procurement',
              location: 'Receiving Dock'
            });
          }
        });
      }
    } catch (e) {
      console.warn("Calendar failed to load Procurement orders:", e);
    }

    // 3. Legal Expiries (Sheet 3)
    try {
      const legalId = import.meta.env.VITE_GOOGLE_SHEET_LEGAL_ID || '1Uq3OXfJ83ybK9w00QyqCxfAv0rzh8cq9p9FnqitN7LI';
      const response = await GoogleSheetsService.getSpreadsheetValues(googleToken, legalId, 'Legal Master!A2:O100');
      if (response && response.values) {
        response.values.forEach((row, idx) => {
          const expiryStr = row[10]; // Col K (Expiry Date)
          if (expiryStr) {
            const expiryDate = new Date(expiryStr);
            if (!isNaN(expiryDate.getTime())) {
              gathered.push({
                id: `SHEET-LEGAL-EXP-${idx}`,
                title: `🛡️ Legal Expiry: ${row[1] || 'Doc'}`,
                description: `Authority: ${row[7] || ''}. Responsible: ${row[5] || ''}`,
                start: expiryDate,
                end: new Date(expiryDate.getTime() + 2 * 60 * 65 * 1000),
                category: 'finance', 
                location: 'Compliance Vault'
              });
            }
          }
        });
      }
    } catch (e) {
      console.warn("Calendar failed to load Legal Master dates:", e);
    }

    // 4. Marketing (Sheet 4)
    try {
      const marketingId = import.meta.env.VITE_GOOGLE_SHEET_MARKETING_ID || '1qgumQuK1zbCdP8TQN5koIQkRjRWy3d1spVudn0vx5-c';
      const response = await GoogleSheetsService.getSpreadsheetValues(googleToken, marketingId, 'Campaign Master!A2:J100');
      if (response && response.values) {
        response.values.forEach((row, idx) => {
          const startDate = row[4] ? new Date(row[4]) : null;
          const endDate = row[5] ? new Date(row[5]) : null;
          if (startDate && !isNaN(startDate.getTime())) {
            gathered.push({
              id: `SHEET-MKT-START-${idx}`,
              title: `📣 Campaign Start: ${row[1] || 'Promo'}`,
              description: `Type: ${row[2] || ''}. Owner: ${row[6] || ''}`,
              start: startDate,
              end: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
              category: 'sales', 
              location: 'Marketing'
            });
          }
          if (endDate && !isNaN(endDate.getTime())) {
            gathered.push({
              id: `SHEET-MKT-END-${idx}`,
              title: `📣 Campaign End: ${row[1] || 'Promo'}`,
              description: `Type: ${row[2] || ''}. Owner: ${row[6] || ''}`,
              start: endDate,
              end: new Date(endDate.getTime() + 2 * 60 * 60 * 1000),
              category: 'sales',
              location: 'Marketing'
            });
          }
        });
      }
    } catch (e) {
      console.warn("Calendar failed to load Campaign Master dates:", e);
    }

    // 5. Finance (Sheet 9)
    try {
      const financeId = import.meta.env.VITE_GOOGLE_SHEET_FINANCE_ID || '10W7ZQIOn0FfO1nGDI87XssDUSprPpK6tMVRvOgkMp9I';
      const response = await GoogleSheetsService.getSpreadsheetValues(googleToken, financeId, 'Finance Master!A2:M100');
      if (response && response.values) {
        response.values.forEach((row, idx) => {
          const dueDate = row[9] ? new Date(row[9]) : null; // Due Date Col J
          if (dueDate && !isNaN(dueDate.getTime()) && row[7]?.toLowerCase() === 'pending') {
            gathered.push({
              id: `SHEET-FIN-DUE-${idx}`,
              title: `💰 Payment Due: ${row[3] || 'Invoice'}`,
              description: `Amount: ${row[5] || ''}. Type: ${row[1] || ''}`,
              start: dueDate,
              end: new Date(dueDate.getTime() + 2 * 60 * 60 * 1000),
              category: 'finance',
              location: 'Accounts Desk'
            });
          }
        });
      }
    } catch (e) {
      console.warn("Calendar failed to load Finance Master dates:", e);
    }

    // 6. Meetings (Sheet 11)
    try {
      const meetingsId = import.meta.env.VITE_GOOGLE_SHEET_MEETINGS_ID || '1ixqD4rH-t6msVtUZ_HpLR_ISBAVmjTdirb3QSYfuAoo';
      const response = await GoogleSheetsService.getSpreadsheetValues(googleToken, meetingsId, 'Meeting Register!A2:H100');
      if (response && response.values) {
        response.values.forEach((row, idx) => {
          const mDate = row[6] ? new Date(row[6]) : null; // Meeting Date Col G
          if (mDate && !isNaN(mDate.getTime())) {
            gathered.push({
              id: `SHEET-MEETING-${idx}`,
              title: `🤝 Meeting: ${row[1] || 'Register'}`,
              description: `Type: ${row[2] || ''}. Organizer: ${row[3] || ''}`,
              start: mDate,
              end: new Date(mDate.getTime() + 1 * 60 * 60 * 1000), 
              category: 'general',
              location: row[4] || 'Board Room'
            });
          }
        });
      }
    } catch (e) {
      console.warn("Calendar failed to load Meetings register:", e);
    }

    // 7. Executive Command Center Tasks (EA Planner tab)
    try {
      const eccId = import.meta.env.VITE_GOOGLE_SHEET_EXECUTIVE_COMMAND_CENTER_ID || '1ZLLF1qNVuRowXaaOYTRGZZRmzD9FnhtH0OdCZnnEvxI';
      const response = await GoogleSheetsService.getSpreadsheetValues(googleToken, eccId, "'EA Planner'!A2:J100");
      if (response && response.values) {
        response.values.forEach((row, idx) => {
          if (!row[1] && !row[2]) return; // Skip empty rows
          const taskTitle = row[2];
          const dueDateStr = row[6]; // Column G (Due Date)
          if (taskTitle && dueDateStr) {
            const dDate = new Date(dueDateStr);
            if (!isNaN(dDate.getTime())) {
              gathered.push({
                id: `SHEET-ECC-TASK-${idx}`,
                title: `📝 Task: ${taskTitle}`,
                description: `Assignee: ${row[5] || 'EA'}. Status: ${row[4] || 'Pending'}`,
                start: dDate,
                end: new Date(dDate.getTime() + 1 * 60 * 60 * 1000), // 1 hr block
                category: 'general',
                location: 'Executive Command Center'
              });
            }
          }
        });
      }
    } catch (e) {
      console.warn("Calendar failed to load Executive Command Center tasks:", e);
    }

    setGoogleSheetEvents(gathered);
    setLoading(false);
  };

  // Run sheet aggregation when token is available
  useEffect(() => {
    fetchGoogleSheetSchedules();
  }, [googleToken]);

  // Merge all events
  useEffect(() => {
    setMasterEvents([
      ...localEvents,
      ...firestoreTasks,
      ...googleSheetEvents
    ]);
  }, [localEvents, firestoreTasks, googleSheetEvents]);

  const handleAddEvent = async (date: Date) => {
    const title = prompt('Enter Event Title:');
    if (!title) return;

    const formattedDate = date.toISOString().split('T')[0];

    // Immediately add to local events for instant UI feedback
    const newEvt: CalendarEvent = {
      id: `EVT${Math.floor(Math.random() * 9000 + 1000)}`,
      title,
      start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
      end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0),
      category: 'general',
      location: 'Quick Add'
    };
    setLocalEvents(prev => [...prev, newEvt]);

    try {
      // 1. Write to Firestore tasks collection
      const taskRef = await addDoc(collection(db, 'tasks'), {
        title,
        status: 'Pending',
        priority: 'Medium',
        assignee: 'EA',
        dueDate: formattedDate,
        dueTime: '09:00',
        category: 'Calendar',
        duration: '1hr',
        meetee: '',
        reason: '',
        timestamp: Date.now(),
        creator: 'GUD User'
      });

      // 2. Append to Google Sheets (Executive Command Center - EA Planner tab)
      if (googleToken) {
        try {
          const eccSheetId = import.meta.env.VITE_GOOGLE_SHEET_EXECUTIVE_COMMAND_CENTER_ID || '1ZLLF1qNVuRowXaaOYTRGZZRmzD9FnhtH0OdCZnnEvxI';
          const taskRecordId = `TSK-${Math.floor(Math.random() * 900 + 100)}`; // Format: TSK-004
          const newRowValues = [
            "", // Column A (empty)
            taskRecordId, // Column B (Task ID)
            title, // Column C (Task Description)
            'Medium', // Column D (Priority)
            'Pending', // Column E (Status)
            'Mohith', // Column F (Delegated To)
            formattedDate, // Column G (Due Date)
            "", // Column H (Follow-up Date)
            "", // Column I (Notes)
            "" // Column J (Link)
          ];
          await GoogleSheetsService.appendSpreadsheetValues(
            googleToken,
            eccSheetId,
            "'EA Planner'!A:J",
            [newRowValues]
          );
        } catch (sheetErr) {
          console.warn('Google Sheets Calendar writeback failed:', sheetErr);
        }
      }
    } catch (e) {
      console.error('Failed to create calendar task:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-emerald-750 dark:text-emerald-450" />
            <span>Master Aggregated Corporate Calendar</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sourcing shipments, tempering runs, legal renewals, and tasks in one consolidated timeline.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {googleToken ? (
            <StatusBadge status="success" label="Active Syncing" />
          ) : (
            <StatusBadge status="warning" label="Google Workspace Offline" />
          )}
          {googleToken && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={fetchGoogleSheetSchedules}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Sync Alert Banner */}
      <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-450 text-xs flex items-start gap-2.5">
        <Info className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-semibold block">Cross-Module Integration Ingesting:</span>
          <span className="text-[11px] opacity-90 leading-relaxed mt-0.5 block">
            This master view compiles date fields from the <b>Production & Sourcing log</b>, <b>Legal renewals tracker</b>, and your <b>Firestore tasks collection</b> into a single calendar. Switch to Month/Week views to check for operational overlaps.
          </span>
        </div>
      </div>

      {/* Calendar Grid Component */}
      <Calendar
        events={masterEvents}
        onAddEvent={handleAddEvent}
      />
    </div>
  );
};
export default CalendarPage;
