import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileOutput,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabContent, TabList, TabTrigger } from "@/components/ui/tabs";
import { useAreas } from "@/hooks/useAreas";
import { api, apiFetch } from "@/lib/api";
import { TASK_STATUSES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

const EVENT_ICON: Record<string, typeof FileText> = {
  task: ClipboardList,
  obligation: Scale,
  filing: FileOutput,
  evidence: CheckSquare,
  document: FileText,
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function TaskControls({
  event,
  pending,
  onUpdate,
}: {
  event: CalEvent;
  pending: boolean;
  onUpdate: (patch: { primary_owner?: string; status?: string }) => void;
}) {
  const [owner, setOwner] = useState(event.owner);
  useEffect(() => setOwner(event.owner), [event.owner]);
  const ownerChanged = owner.trim() !== event.owner;

  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <label htmlFor={`owner-${event.id}`} className="text-xs font-medium">Owner</label>
      <div className="flex gap-2">
        <Input
          id={`owner-${event.id}`}
          className="h-9 flex-1 text-sm"
          value={owner}
          onChange={(changeEvent) => setOwner(changeEvent.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!ownerChanged || pending}
          onClick={() => onUpdate({ primary_owner: owner.trim() })}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
      <label htmlFor={`status-${event.id}`} className="text-xs font-medium">Status</label>
      <select
        id={`status-${event.id}`}
        className="h-9 w-full rounded-md border bg-card px-2 text-sm"
        value={event.status}
        disabled={pending}
        onChange={(changeEvent) => onUpdate({ status: changeEvent.target.value })}
      >
        {TASK_STATUSES.filter((status) => status !== "overdue").map((status) => (
          <option key={status} value={status}>{titleCase(status)}</option>
        ))}
        {event.status === "overdue" && <option value="overdue" disabled>Overdue</option>}
      </select>
    </div>
  );
}

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState("grid");
  const [area, setArea] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const areas = useAreas();
  const queryClient = useQueryClient();

  const updateTask = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { primary_owner?: string; status?: string } }) => api.updateTask(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["obligation"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const lastDay = daysInMonth(year, month);
  const fromStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const toStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const calendarQuery = useQuery({
    queryKey: ["calendar", fromStr, toStr],
    queryFn: async (): Promise<{ events: CalEvent[] }> => {
      const response = await apiFetch(`/api/calendar?from=${fromStr}&to=${toStr}`);
      if (!response.ok) throw new Error("Calendar data could not be loaded");
      return response.json();
    },
  });

  const events = calendarQuery.data?.events ?? [];
  const statuses = useMemo(
    () => Array.from(new Set(events.map((event) => event.status))).sort(),
    [events],
  );
  const filteredEvents = useMemo(() => events.filter((event) => {
    if (area !== "all" && event.functional_area !== area) return false;
    if (filterStatus !== "all" && event.status !== filterStatus) return false;
    return true;
  }), [events, area, filterStatus]);
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalEvent[]>();
    for (const event of filteredEvents) {
      const day = event.date.slice(8, 10);
      grouped.set(day, [...(grouped.get(day) ?? []), event]);
    }
    return grouped;
  }, [filteredEvents]);

  const taskCount = events.filter((event) => event.type === "task").length;
  const obligationCount = events.filter((event) => event.type === "obligation").length;
  const todayStr = today.toISOString().slice(0, 10);
  const overdueCount = filteredEvents.filter(
    (event) => event.type === "task" && event.date < todayStr && event.status !== "completed",
  ).length;
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);

  const previousMonth = () => {
    setSelectedDay(null);
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };
  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <CalendarClock className="h-5 w-5" /> Compliance Calendar
          </h1>
          <p className="text-sm text-muted-foreground">Regulatory dates and assigned task deadlines in one view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{obligationCount} regulatory dates</Badge>
          <Badge variant="outline">{taskCount} task deadlines</Badge>
          {overdueCount > 0 && <Badge variant="destructive">{overdueCount} overdue</Badge>}
        </div>
      </div>

      {!calendarQuery.isLoading && !calendarQuery.isError && obligationCount > 0 && taskCount === 0 && (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <Scale className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Regulatory dates are available, but no tasks are assigned yet.</div>
            <div className="mt-1 text-muted-foreground">
              Review and approve an obligation, then generate its operational tasks to add owners and task deadlines.
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Previous month" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="min-w-36 text-center text-sm">{MONTH_NAMES[month]} {year}</CardTitle>
            <Button variant="ghost" size="icon" aria-label="Next month" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="calendar-area" className="sr-only">Functional area</label>
            <select
              id="calendar-area"
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className="h-9 rounded-lg border bg-card px-2 text-xs"
            >
              {areas.map((item) => (
                <option key={item} value={item}>{item === "all" ? "All departments" : titleCase(item)}</option>
              ))}
            </select>
            <label htmlFor="calendar-status" className="sr-only">Status</label>
            <select
              id="calendar-status"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="h-9 rounded-lg border bg-card px-2 text-xs"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {calendarQuery.isLoading ? (
            <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar...
            </div>
          ) : calendarQuery.isError ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <div className="font-medium">Calendar data could not be loaded.</div>
                <div className="text-sm text-muted-foreground">Check the service connection and try again.</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => void calendarQuery.refetch()}>
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : (
            <Tabs value={view} onValueChange={setView}>
              <TabList>
                <TabTrigger value="grid">Month</TabTrigger>
                <TabTrigger value="list">Agenda</TabTrigger>
              </TabList>
              <TabContent value={view}>
                {view === "grid" ? (
                  <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
                    {DAY_NAMES.map((dayName) => (
                      <div key={dayName} className="bg-secondary px-2 py-2 text-[10px] font-medium uppercase text-muted-foreground">
                        {dayName}
                      </div>
                    ))}
                    {Array.from({ length: firstDayOfWeek }).map((_, index) => (
                      <div key={`empty-${index}`} className="min-h-24 bg-card" />
                    ))}
                    {Array.from({ length: totalDays }).map((_, index) => {
                      const day = String(index + 1).padStart(2, "0");
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${day}`;
                      const dayEvents = eventsByDay.get(day) ?? [];
                      const isToday = dateStr === todayStr;
                      const isOverdue = dayEvents.some(
                        (event) => event.type === "task" && event.date < todayStr && event.status !== "completed",
                      );
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={dayEvents.length === 0}
                          aria-label={`${MONTH_NAMES[month]} ${index + 1}, ${dayEvents.length} deadlines`}
                          onClick={() => setSelectedDay(day)}
                          className={cnCalendarCell(dayEvents.length > 0, isToday)}
                        >
                          <span className={isToday ? "font-semibold text-foreground" : "text-muted-foreground"}>{index + 1}</span>
                          <span className="mt-1 space-y-1">
                            {dayEvents.slice(0, 2).map((event) => {
                              const EventIcon = EVENT_ICON[event.type] || FileText;
                              return (
                                <span key={event.id} className="flex items-center gap-1 rounded bg-secondary px-1.5 py-1 text-[10px] leading-tight">
                                  <EventIcon className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{event.title}</span>
                                </span>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <span className="block text-[10px] text-muted-foreground">{dayEvents.length - 2} more</span>
                            )}
                            {isOverdue && <span className="block text-[10px] font-medium text-destructive">Overdue</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEvents.length === 0 && (
                      <div className="py-10 text-center text-sm text-muted-foreground">No deadlines match these filters.</div>
                    )}
                    {filteredEvents.map((event) => {
                      const EventIcon = EVENT_ICON[event.type] || FileText;
                      const isOverdue = event.type === "task" && event.date < todayStr && event.status !== "completed";
                      const resourcePath = event.type === "obligation"
                        ? `/obligations/${event.resource_id}`
                        : event.obligation_id
                          ? `/obligations/${event.obligation_id}`
                          : null;
                      return (
                        <div key={event.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                          <div className="w-16 shrink-0 text-xs tabular text-muted-foreground">{event.date.slice(5)}</div>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                            <EventIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {resourcePath ? (
                              <Link to={resourcePath} className="font-medium hover:underline">{event.title}</Link>
                            ) : (
                              <div className="font-medium">{event.title}</div>
                            )}
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {titleCase(event.type)}{event.owner ? `, ${event.owner}` : ""}
                            </div>
                          </div>
                          <Badge variant={event.status === "completed" ? "success" : isOverdue ? "destructive" : event.status === "not_started" ? "muted" : "warning"}>
                            {isOverdue ? "Overdue" : titleCase(event.status)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDay && `${MONTH_NAMES[month]} ${parseInt(selectedDay)}, ${year}`}</DialogTitle>
          </DialogHeader>
          {updateTask.isError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">The task could not be updated. Try again.</div>
          )}
          <div className="max-h-[65vh] space-y-3 overflow-y-auto">
            {selectedDay && (eventsByDay.get(selectedDay) ?? []).map((event) => {
              const EventIcon = EVENT_ICON[event.type] || FileText;
              return (
                <div key={event.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border">
                      <EventIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{event.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{titleCase(event.type)}</Badge>
                        <Badge variant={event.status === "completed" ? "success" : event.status === "not_started" ? "muted" : "warning"}>
                          {titleCase(event.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {event.type === "task" && (
                    <TaskControls
                      event={event}
                      pending={updateTask.isPending}
                      onUpdate={(patch) => updateTask.mutate({ id: event.resource_id, patch })}
                    />
                  )}
                  {event.type === "obligation" && (
                    <Link
                      to={`/obligations/${event.resource_id}`}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-card px-3 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8"
                    >
                      Open obligation
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cnCalendarCell(hasEvents: boolean, isToday: boolean) {
  return [
    "min-h-24 bg-card p-1.5 text-left text-xs transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    hasEvents ? "cursor-pointer hover:bg-accent/40" : "cursor-default",
    isToday ? "ring-1 ring-inset ring-foreground/20" : "",
  ].join(" ");
}
