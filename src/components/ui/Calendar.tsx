import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Tag } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { Modal } from './Modal';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  category: 'production' | 'sales' | 'procurement' | 'general' | 'finance';
  allDay?: boolean;
}

interface CalendarProps {
  events: CalendarEvent[];
  onAddEvent?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  events,
  onAddEvent,
  onEventClick
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrev = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (view === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (view === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const categoryColorMap = {
    production: 'bg-emerald-50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-350 dark:border-emerald-800',
    sales: 'bg-blue-50 text-blue-800 border-blue-250 dark:bg-blue-950/20 dark:text-blue-350 dark:border-blue-800',
    procurement: 'bg-amber-50 text-amber-800 border-amber-250 dark:bg-amber-950/20 dark:text-amber-350 dark:border-amber-800',
    finance: 'bg-rose-50 text-rose-800 border-rose-250 dark:bg-rose-950/20 dark:text-rose-350 dark:border-rose-800',
    general: 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-350 dark:border-slate-800',
  };

  const renderMonthView = () => {
    // 1. Filter out long-term legal expiries that clutter the calendar (duration > 60 days)
    const filteredEvents = events.filter(e => {
      const cat = (e.category || '').toLowerCase();
      const durationDays = (e.end.getTime() - e.start.getTime()) / (1000 * 60 * 60 * 24);
      if (cat === 'finance' && durationDays > 60) return false;
      return true;
    });

    // 2. Generate weeks array
    const weeksCount = Math.ceil((daysInMonth + firstDayIndex) / 7);
    const weeks: Date[][] = [];
    
    for (let w = 0; w < weeksCount; w++) {
      const weekDays: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const dayOffset = w * 7 + d - firstDayIndex + 1;
        weekDays.push(new Date(year, month, dayOffset));
      }
      weeks.push(weekDays);
    }

    return (
      <div className="border-t border-l border-slate-100 dark:border-slate-800/80 rounded-b-lg">
        {/* Week headers */}
        <div className="grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => (
            <div
              key={name}
              className="py-2 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-900/40 border-b border-r border-slate-100 dark:border-slate-800/70"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Weeks rows */}
        {weeks.map((weekDays, weekIdx) => {
          // A. Find events overlapping with this week
          const weekStart = weekDays[0];
          const weekEnd = weekDays[6];
          
          const weekEvents = filteredEvents.filter(e => {
            const eStart = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate());
            const eEnd = new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate());
            return eStart <= weekEnd && eEnd >= weekStart;
          });

          // B. Sort weekEvents: longest duration first, then by start date
          weekEvents.sort((a, b) => {
            const durA = a.end.getTime() - a.start.getTime();
            const durB = b.end.getTime() - b.start.getTime();
            if (durB !== durA) return durB - durA;
            return a.start.getTime() - b.start.getTime();
          });

          // C. Allocate slots
          const slots: (typeof events[0] | null)[][] = [];
          weekEvents.forEach(e => {
            const eStart = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate());
            const eEnd = new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate());

            let targetSlotIdx = -1;
            for (let s = 0; s < slots.length; s++) {
              let isFree = true;
              for (let d = 0; d < 7; d++) {
                const dayDate = weekDays[d];
                if (dayDate >= eStart && dayDate <= eEnd) {
                  if (slots[s][d] !== null) {
                    isFree = false;
                    break;
                  }
                }
              }
              if (isFree) {
                targetSlotIdx = s;
                break;
              }
            }

            if (targetSlotIdx === -1) {
              slots.push(new Array(7).fill(null));
              targetSlotIdx = slots.length - 1;
            }

            for (let d = 0; d < 7; d++) {
              const dayDate = weekDays[d];
              if (dayDate >= eStart && dayDate <= eEnd) {
                slots[targetSlotIdx][d] = e;
              }
            }
          });

          // D. Render the 7 cells of this week row
          return (
            <div key={weekIdx} className="grid grid-cols-7">
              {weekDays.map((dayDate, dayIdx) => {
                const isCurrentMonth = dayDate.getMonth() === month && dayDate.getFullYear() === year;
                const isToday =
                  dayDate.getDate() === new Date().getDate() &&
                  dayDate.getMonth() === new Date().getMonth() &&
                  dayDate.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[85px] border-b border-r border-slate-100 dark:border-slate-800/70 p-1 flex flex-col justify-between hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-colors ${
                      isToday ? 'bg-emerald-50/10 dark:bg-emerald-950/5' : ''
                    } ${isCurrentMonth ? '' : 'opacity-40'}`}
                  >
                    {/* Header: Date number & Add Button */}
                    <div className="flex items-center justify-between pb-1">
                      <span
                        className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${
                          isToday 
                            ? 'bg-emerald-700 text-white' 
                            : 'text-slate-700 dark:text-slate-350'
                        }`}
                      >
                        {dayDate.getDate()}
                      </span>
                      {onAddEvent && isCurrentMonth && (
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            onAddEvent(dayDate);
                          }}
                          className="opacity-0 hover:opacity-100 text-[9px] text-emerald-750 font-bold px-1 rounded transition-opacity"
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    {/* Slots rendering */}
                    <div className="space-y-1 mt-0.5 flex-1 overflow-hidden">
                      {slots.slice(0, 3).map((slot, slotIdx) => {
                        const e = slot[dayIdx];
                        if (!e) {
                          return <div key={`empty-${slotIdx}`} className="h-5" />;
                        }

                        const sDate = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate());
                        const eDate = new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate());
                        const currDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());

                        const hasPrev = currDate > sDate && dayIdx !== 0;
                        const hasNext = currDate < eDate && dayIdx !== 6;

                        return (
                          <div
                            key={e.id}
                            onClick={(evt) => {
                              evt.stopPropagation();
                              setSelectedEvent(e);
                              if (onEventClick) onEventClick(e);
                            }}
                            className={`text-[9px] py-0.5 font-bold transition-all hover:brightness-95 h-5 flex items-center select-none truncate cursor-pointer ${
                              categoryColorMap[e.category] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200'
                            } ${hasPrev ? 'rounded-l-none border-l-0 ml-[-7px] pl-0 shadow-none' : 'rounded-l pl-1.5'} ${
                              hasNext ? 'rounded-r-none border-r-0 mr-[-7px] pr-0 shadow-none' : 'rounded-r pr-1.5'
                            }`}
                          >
                            <div className="truncate w-full">
                              {!hasPrev && e.title}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* More indicator */}
                      {slots.length > 3 && dayIdx === 0 && (
                        <div className="text-[8px] text-slate-400 pl-1 font-semibold">
                          + {slots.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const filteredEvents = events.filter(e => {
      const cat = (e.category || '').toLowerCase();
      const durationDays = (e.end.getTime() - e.start.getTime()) / (1000 * 60 * 60 * 24);
      if (cat === 'finance' && durationDays > 60) return false;
      return true;
    });

    const dayOfWeek = currentDate.getDay();
    const sunday = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - dayOfWeek);
    
    const weekDaysDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      weekDaysDates.push(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i));
    }

    // Allocate slots for this week
    const weekEvents = filteredEvents.filter(e => {
      const eStart = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate());
      const eEnd = new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate());
      return eStart <= weekDaysDates[6] && eEnd >= weekDaysDates[0];
    });

    weekEvents.sort((a, b) => {
      const durA = a.end.getTime() - a.start.getTime();
      const durB = b.end.getTime() - b.start.getTime();
      if (durB !== durA) return durB - durA;
      return a.start.getTime() - b.start.getTime();
    });

    const slots: (typeof events[0] | null)[][] = [];
    weekEvents.forEach(e => {
      const eStart = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate());
      const eEnd = new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate());

      let targetSlotIdx = -1;
      for (let s = 0; s < slots.length; s++) {
        let isFree = true;
        for (let d = 0; d < 7; d++) {
          const dayDate = weekDaysDates[d];
          if (dayDate >= eStart && dayDate <= eEnd) {
            if (slots[s][d] !== null) {
              isFree = false;
              break;
            }
          }
        }
        if (isFree) {
          targetSlotIdx = s;
          break;
        }
      }

      if (targetSlotIdx === -1) {
        slots.push(new Array(7).fill(null));
        targetSlotIdx = slots.length - 1;
      }

      for (let d = 0; d < 7; d++) {
        const dayDate = weekDaysDates[d];
        if (dayDate >= eStart && dayDate <= eEnd) {
          slots[targetSlotIdx][d] = e;
        }
      }
    });

    const weekCols = weekDaysDates.map((dayDate, dayIdx) => {
      const isToday = 
        dayDate.getDate() === new Date().getDate() &&
        dayDate.getMonth() === new Date().getMonth() &&
        dayDate.getFullYear() === new Date().getFullYear();

      return (
        <div key={dayIdx} className="flex-1 min-h-[300px] border-r border-slate-100 dark:border-slate-800/75 p-2 space-y-3">
          <div className="text-center pb-2 border-b border-slate-50 dark:border-slate-850">
            <p className="text-[10px] uppercase font-bold text-slate-400">
              {dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
            </p>
            <p className={`text-base font-bold inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${
              isToday ? 'bg-emerald-700 text-white' : 'text-slate-700 dark:text-slate-350'
            }`}>
              {dayDate.getDate()}
            </p>
          </div>

          <div className="space-y-1.5 overflow-y-auto h-[220px]">
            {slots.map((slot, slotIdx) => {
              const e = slot[dayIdx];
              if (!e) {
                return <div key={`empty-${slotIdx}`} className="h-10" />;
              }

              const sDate = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate());
              const eDate = new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate());
              const currDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());

              const hasPrev = currDate > sDate && dayIdx !== 0;
              const hasNext = currDate < eDate && dayIdx !== 6;

              return (
                <div
                  key={e.id}
                  onClick={() => setSelectedEvent(e)}
                  className={`p-2 font-medium hover:scale-[1.01] transition-all h-10 flex flex-col justify-center select-none truncate cursor-pointer ${
                    categoryColorMap[e.category] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200'
                  } ${hasPrev ? 'rounded-l-none border-l-0 ml-[-9px] pl-0' : 'rounded-l pl-2'} ${
                    hasNext ? 'rounded-r-none border-r-0 mr-[-9px] pr-0' : 'rounded-r pr-2'
                  }`}
                >
                  <div className="font-semibold truncate text-xs">
                    {!hasPrev && e.title}
                  </div>
                  {!hasPrev && (
                    <div className="text-[9px] opacity-75 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {e.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    });

    return (
      <div className="flex border-t border-l border-slate-100 dark:border-slate-800/80 rounded-b-lg">
        {weekCols}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = events.filter((e) => {
      const s = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate());
      const endDay = new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate());
      const active = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      return active >= s && active <= endDay;
    });

    return (
      <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800/80 rounded-b-lg min-h-[300px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-850">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">
            Events for {currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h4>
          <span className="text-xs text-slate-400 font-semibold">{dayEvents.length} Tasks Scheduled</span>
        </div>

        {dayEvents.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
            <p className="text-xs">No events scheduled for today.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {dayEvents.map((e) => (
              <Card 
                key={e.id} 
                hoverEffect
                onClick={() => setSelectedEvent(e)}
                className="cursor-pointer border-l-4 border-l-emerald-500"
              >
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-855 dark:text-white truncate">{e.title}</span>
                    <span className="text-[10px] capitalize font-bold text-slate-400">{e.category}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{e.description}</p>
                  <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {e.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {e.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg shadow-sm">
      {/* Calendar Header / Toolbar */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleToday} className="font-semibold text-xs">
            Today
          </Button>
          <div className="flex items-center">
            <Button variant="outline" size="xs" onClick={handlePrev} className="rounded-r-none !p-2">
              <ChevronLeft className="w-4.5 h-4.5" />
            </Button>
            <Button variant="outline" size="xs" onClick={handleNext} className="rounded-l-none !p-2 border-l-0">
              <ChevronRight className="w-4.5 h-4.5" />
            </Button>
          </div>

          <h2 className="text-sm font-bold text-slate-800 dark:text-white pl-2">
            {view === 'month' 
              ? `${monthNames[month]} ${year}` 
              : view === 'week' 
                ? `Week of ${currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                : currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            }
          </h2>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
                view === v
                  ? 'bg-white dark:bg-slate-850 text-emerald-800 dark:text-emerald-400 shadow-sm border border-slate-100 dark:border-slate-800'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-450'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="w-full">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Scheduled Event Details"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedEvent.title}
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full capitalize ${
                  categoryColorMap[selectedEvent.category]
                }`}>
                  {selectedEvent.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {selectedEvent.start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} -{' '}
                {selectedEvent.end.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>

            {selectedEvent.description && (
              <div className="text-xs bg-slate-50 dark:bg-slate-850 p-3 rounded text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selectedEvent.description}
              </div>
            )}

            {selectedEvent.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span><strong>Location:</strong> {selectedEvent.location}</span>
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
