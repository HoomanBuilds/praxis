import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  status: string;
  owner: string;
  resource_type: string;
  resource_id: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState("grid");

  const fromStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = daysInMonth(year, month);
  const toStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data } = useQuery({
    queryKey: ["calendar", fromStr, toStr],
    queryFn: async (): Promise<{ events: CalEvent[] }> => {
      const res = await fetch(`/api/calendar?from=${fromStr}&to=${toStr}`, { headers: { "Content-Type": "application/json" } });
      if (!res.ok) return { events: [] };
      return res.json();
    },
  });

  const events = data?.events ?? [];
  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      const day = e.date.slice(8, 10);
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(e);
    }
    return m;
  }, [events]);

  const prev = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const next = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Compliance Calendar</h1>
        <p className="text-sm text-muted-foreground">Task and obligation deadlines at a glance.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-sm">{MONTH_NAMES[month]} {year}</CardTitle>
            <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Tabs value={view} onValueChange={setView}>
            <TabList>
              <TabTrigger value="grid">Grid</TabTrigger>
              <TabTrigger value="list">List</TabTrigger>
            </TabList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <TabContent value={view}>
            {view === "grid" ? (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="bg-secondary px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase">{d}</div>
                ))}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-card min-h-[5rem]" />
                ))}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = String(i + 1).padStart(2, "0");
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${day}`;
                  const dayEvents = eventsByDay.get(day) ?? [];
                  const isToday = dateStr === todayStr;
                  return (
                    <div key={i} className={`bg-card min-h-[5rem] p-1.5 ${isToday ? "ring-1 ring-foreground/20" : ""}`}>
                      <div className={`text-xs mb-1 ${isToday ? "font-bold" : "text-muted-foreground"}`}>{i + 1}</div>
                      {dayEvents.slice(0, 3).map((e) => (
                        <div key={e.id} className="text-[10px] truncate rounded px-1 py-0.5 mb-0.5 bg-secondary">
                          {e.title.slice(0, 24)}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                {events.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No deadlines this month.</div>}
                {events.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                    <div className="text-xs text-muted-foreground w-16 shrink-0">{e.date.slice(5)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{e.title}</div>
                      {e.owner && <div className="text-xs text-muted-foreground">{e.owner}</div>}
                    </div>
                    <Badge variant={e.type === "task" ? "secondary" : "muted"}>{e.type}</Badge>
                    <Badge variant={e.status === "completed" ? "success" : e.status === "not_started" ? "muted" : "warning"}>{e.status.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabContent>
        </CardContent>
      </Card>
    </div>
  );
}
