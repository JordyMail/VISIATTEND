import { useState, useEffect } from "react";
import { Plus, Search, Download, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { attendanceApi, userApi, eventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

const attendanceFormSchema = z.object({
  attendanceDate: z.date({
    required_error: "Date is required",
  }),
  userId: z.string({
    required_error: "Member is required",
  }),
  eventId: z.string({
    required_error: "Event is required",
  }),
  checkInTime: z.string({
    required_error: "Check-in time is required",
  }),
  checkOutTime: z.string().optional(),
  status: z.enum(["present", "late", "excused", "sick", "absent"], {
    required_error: "Status is required",
  }),
});

type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;

interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name?: string;
  event_id: number;
  event_name?: string;
  event_code?: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  confidence_score?: number;
  liveness_verified?: boolean;
  device_info?: string;
  created_at: string;
}

interface User {
  id: number;
  full_name: string;
  member_id: string;
}

interface Event {
  id: number;
  event_code: string;
  event_name: string;
}

export default function Attendance() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      attendanceDate: new Date(),
      userId: "",
      eventId: "",
      checkInTime: "07:00",
      checkOutTime: "09:30",
      status: "present",
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attendanceRes, usersRes, eventsRes] = await Promise.all([
        attendanceApi.getAll(),
        userApi.getAll({ role: 'member' }),
        eventApi.getAll({ isActive: true }),
      ]);
      setAttendances(attendanceRes.data.data);
      setUsers(usersRes.data.data);
      setEvents(eventsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (record: AttendanceRecord) => {
    setEditingRecord(record);
    form.reset({
      attendanceDate: new Date(record.attendance_date),
      userId: record.user_id.toString(),
      eventId: record.event_id.toString(),
      checkInTime: record.check_in_time.split("T")[1].substring(0, 5),
      checkOutTime: record.check_out_time ? record.check_out_time.split("T")[1].substring(0, 5) : "",
      status: record.status as any,
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingRecord(null);
    form.reset({
      attendanceDate: new Date(),
      userId: "",
      eventId: "",
      checkInTime: "07:00",
      checkOutTime: "09:30",
      status: "present",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (recordToDelete) {
      try {
        await attendanceApi.delete(recordToDelete);
        toast({
          title: "Success",
          description: "Attendance record deleted successfully",
        });
        fetchData();
        setDeleteDialogOpen(false);
        setRecordToDelete(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete attendance record",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = async (data: AttendanceFormValues) => {
    try {
      const dateStr = format(data.attendanceDate, "yyyy-MM-dd");
      const checkInDateTime = `${dateStr}T${data.checkInTime}:00`;
      const checkOutDateTime = data.checkOutTime ? `${dateStr}T${data.checkOutTime}:00` : undefined;

      if (editingRecord) {
        await attendanceApi.update(editingRecord.id, {
          checkOutTime: checkOutDateTime,
          status: data.status,
        });
        toast({
          title: "Success",
          description: "Attendance record updated successfully",
        });
      } else {
        await attendanceApi.create({
          userId: parseInt(data.userId),
          eventId: parseInt(data.eventId),
          attendanceDate: dateStr,
          checkInTime: checkInDateTime,
          checkOutTime: checkOutDateTime,
          status: data.status,
          deviceInfo: "Manual Entry - Web",
        });
        toast({
          title: "Success",
          description: "Attendance record created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingRecord(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save attendance record",
        variant: "destructive",
      });
    }
  };

  const filteredAttendances = attendances.filter((record) => {
    const user = users.find((u) => u.id === record.user_id);
    const matchSearch =
      (user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user?.member_id.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;

    const matchEvent = filterEvent === "all" || record.event_id.toString() === filterEvent;
    const matchStatus = filterStatus === "all" || record.status === filterStatus;
    const matchDate = !filterDate || record.attendance_date === filterDate;

    return matchSearch && matchEvent && matchStatus && matchDate;
  });

  const getUserName = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    return user?.full_name || "Unknown";
  };

  const getEventName = (eventId: number) => {
    const event = events.find((e) => e.id === eventId);
    return event?.event_code || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; className: string }> = {
      present: {
        variant: "outline",
        className: "bg-status-success/20 text-status-success border-status-success/20",
      },
      late: {
        variant: "outline",
        className: "bg-status-warning/20 text-status-warning border-status-warning/20",
      },
      excused: {
        variant: "outline",
        className: "bg-accent/20 text-accent border-accent/20",
      },
      sick: {
        variant: "outline",
        className: "bg-yellow-500/20 text-yellow-700 border-yellow-500/20",
      },
      absent: {
        variant: "outline",
        className: "bg-status-error/20 text-status-error border-status-error/20",
      },
    };

    const config = variants[status] || variants.present;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Member", "Event", "Check-in", "Check-out", "Status", "Confidence"];
    const rows = filteredAttendances.map((record) => [
      record.attendance_date,
      getUserName(record.user_id),
      getEventName(record.event_id),
      formatTime(record.check_in_time),
      record.check_out_time ? formatTime(record.check_out_time) : "-",
      record.status,
      record.confidence_score ? `${record.confidence_score.toFixed(2)}%` : "-",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Summary stats
  const totalRecords = filteredAttendances.length;
  const presentCount = filteredAttendances.filter((a) => a.status === "present").length;
  const lateCount = filteredAttendances.filter((a) => a.status === "late").length;
  const excusedSickCount = filteredAttendances.filter((a) => a.status === "excused" || a.status === "sick").length;
  const absentCount = filteredAttendances.filter((a) => a.status === "absent").length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage attendance records
          </p>
        </div>
        <div className="flex gap-2 flex-col md:flex-row w-full md:w-auto">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={openNewDialog}>
            <Plus className="w-4 h-4" />
            Manual Entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((evt) => (
                <SelectItem key={evt.id} value={evt.id.toString()}>
                  {evt.event_code} - {evt.event_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="excused">Excused</SelectItem>
              <SelectItem value="sick">Sick</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            placeholder="Filter by date"
          />
        </div>
      </Card>

      {/* Attendance Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendances.length > 0 ? (
                filteredAttendances.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {formatDate(record.attendance_date)}
                    </TableCell>
                    <TableCell>{getUserName(record.user_id)}</TableCell>
                    <TableCell className="text-sm">
                      {getEventName(record.event_id)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatTime(record.check_in_time)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.check_out_time
                        ? formatTime(record.check_out_time)
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-sm">
                      {record.confidence_score
                        ? `${record.confidence_score.toFixed(2)}%`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(record)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRecordToDelete(record.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No attendance records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Records</p>
          <p className="text-2xl font-bold">{totalRecords}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Present</p>
          <p className="text-2xl font-bold text-status-success">{presentCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Late</p>
          <p className="text-2xl font-bold text-status-warning">{lateCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Excused/Sick</p>
          <p className="text-2xl font-bold text-accent">{excusedSickCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Absent</p>
          <p className="text-2xl font-bold text-status-error">{absentCount}</p>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "Edit Attendance Record" : "Manual Attendance Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingRecord 
                ? "Edit the attendance record details below." 
                : "Fill in the details to create a new attendance record."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="attendanceDate" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users
                          .filter(u => u.id)
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.full_name} ({user.member_id})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id.toString()}>
                            {event.event_code} - {event.event_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="checkInTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-in</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="checkOutTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="excused">Excused</SelectItem>
                        <SelectItem value="sick">Sick</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRecord ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Attendance Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this attendance record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}