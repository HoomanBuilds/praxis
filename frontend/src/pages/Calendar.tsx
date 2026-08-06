import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, CalendarClock, CheckSquare, FileText, ClipboardList, FileOutput, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TASK_STATUSES } from "@/lib/constants";
import { useAreas } from "@/hooks/useAreas";
import { titleCase } from "@/lib/utils";
import { api, apiFetch } from "@/lib/api";

// Icon/glyph map for event types — distinguishable by shape, not hue
const EVENT_ICON: Record<string, any> = {
  task: ClipboardList,
  obligation: Scale,
  filing: FileOutput,
  evidence: CheckSquare,
  document: FileText,
};

const EVENT_GLYPH: Record<string, string> = {
  task: "✦",
  obligation: "⚖",
  filing: "📤",
  evidence: "✓",
  document: "📄",
};


interface CalEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  status: string;
  owner: string;
  resource_type: string;
  resource_id: string;
  functional_area?: string;
  obligation_id?: string;
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
  const [area, setArea] = useState("all");
  const areas = useAreas();
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const qc = useQueryClient();

  const updateTask = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { primary_owner?: string; status?: string } }) => api.updateTask(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["obligation"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const fromStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = daysInMonth(year, month);
  const toStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data } = useQuery({
    queryKey: ["calendar", fromStr, toStr],
    queryFn: async (): Promise<{ events: CalEvent[] }> => {
      const res = await apiFetch(`/api/calendar?from=${fromStr}&to=${toStr}`);
      if (!res.ok) return { events: [] };
      return res.json();
    },
  });

  const events = data?.events ?? [];

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (area !== "all" && e.type === "task") {
        const taskArea = e.functional_area ?? "compliance";
        if (taskArea !== area) return false;
      }
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      return true;
    });
  }, [events, area, filterStatus]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of filteredEvents) {
      const day = e.date.slice(8, 10);
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(e);
    }
    return m;
  }, [filteredEvents]);

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
  const overdueCount = filteredEvents.filter((e) => e.type === "task" && e.date < todayStr && e.status !== "completed").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Compliance Calendar</h1>
        <p className="text-sm text-muted-foreground">Task and obligation deadlines at a glance.</p>
      </div>

      {overdueCount > 0 && <Badge variant="destructive">{overdueCount} tasks overdue</Badge>}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-sm">{MONTH_NAMES[month]} {year}</CardTitle>
            <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <select value={area} onChange={(e) => setArea(e.target.value)} className="h-8 rounded-lg border bg-card px-2 text-xs">
              {areas.map((a) => <option key={a} value={a}>{a === "all" ? "All depts" : titleCase(a)}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-8 rounded-lg border bg-card px-2 text-xs">
              <option value="all">All statuses</option>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={view} onValueChange={setView}>
            <TabList>
              <TabTrigger value="grid">Grid</TabTrigger>
              <TabTrigger value="list">List</TabTrigger>
            </TabList>
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
                    const isOverdue = dayEvents.some((e) => e.type === "task" && e.date < todayStr && e.status !== "completed");
                    const hasTasks = dayEvents.some((e) => e.type === "task");
                    return (
                      <div key={i}
                        className={`bg-card min-h-[5rem] p-1.5 relative ${hasTasks ? "cursor-pointer hover:bg-accent/40" : ""} ${isToday ? "ring-1 ring-foreground/20" : ""}`}
                        onClick={hasTasks ? () => setSelectedDay(day) : undefined}
                      >
                        <div className={`text-xs mb-1 ${isToday ? "font-bold" : "text-muted-foreground"}`}>{i + 1}</div>
                        {dayEvents.length > 0 && (
                          <div className={`absolute bottom-1.5 right-1.5 h-5 min-w-[1.25rem] flex items-center justify-center rounded-full text-[10px] font-medium px-1 ${isOverdue ? "bg-foreground text-background" : "bg-secondary text-foreground"}`}>
                            {dayEvents.length}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredEvents.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No deadlines this month.</div>}
                  {filteredEvents.map((e) => {
                    const EventIcon = EVENT_ICON[e.type] || FileText;
                    const isOverdue = e.type === "task" && e.date < todayStr && e.status !== "completed";
                    return (
                      <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                        <div className="text-xs text-muted-foreground w-16 shrink-0">{e.date.slice(5)}</div>
                        <div className="flex items-center justify-center h-7 w-7 rounded-md border bg-background shrink-0">
                          <EventIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate" title={e.title}>{e.title}</div>
                          {e.owner && <div className="text-xs text-muted-foreground">{e.owner}</div>}
                        </div>
                        <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                          {EVENT_GLYPH[e.type] || "·"} {e.type}
                        </Badge>
                        <Badge variant={e.status === "completed" ? "success" : isOverdue ? "destructive" : e.status === "not_started" ? "muted" : "warning"}>
                          {isOverdue ? "Overdue" : e.status.replace("_", " ")}
                        </Badge>
                      </div>
                    );
                  })}
                </div>

              )}
            </TabContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={selectedDay !== null} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && `${MONTH_NAMES[month]} ${parseInt(selectedDay)}, ${year}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
                {selectedDay && (eventsByDay.get(selectedDay) ?? []).map((e) => {
                  const EventIcon = EVENT_ICON[e.type] || FileText;
                  return (
                    <div key={e.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded border grid place-items-center">
                            <EventIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="text-sm font-medium line-clamp-3" title={e.title}>{e.title}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                          {EVENT_GLYPH[e.type] || "·"} {titleCase(e.type)}
                        </Badge>
                      </div>

                {e.type === "task" && (
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-7 text-xs flex-1"
                      value={e.owner}
                      placeholder="Owner"
                      onChange={(ev) => updateTask.mutate({ id: e.resource_id, patch: { primary_owner: ev.target.value } })}
                    />
                    <select
                      className="h-7 text-xs rounded border bg-card px-1"
                      value={e.status}
                      onChange={(ev) => updateTask.mutate({ id: e.resource_id, patch: { status: ev.target.value } })}
                    >
                      {TASK_STATUSES.filter((s) => s !== "overdue").map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                      {e.status === "overdue" && <option value="overdue" disabled>Overdue (auto)</option>}
                    </select>
                  </div>
                )}
                    <div className="flex items-center gap-2">
                        <Badge variant={e.status === "completed" ? "success" : e.status === "not_started" ? "muted" : "warning"}>
                          {e.status.replace("_", " ")}
                        </Badge>
                        {e.type === "obligation" && (
                          <a href={`/obligations/${e.resource_id}`} className="text-xs text-muted-foreground hover:text-foreground">View obligation</a>
                        )}
                      </div>
                    </div>
                  );
                })}

            {selectedDay && (eventsByDay.get(selectedDay) ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">Nothing due on this day.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
