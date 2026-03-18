  import { useState } from "react";
  import { Plus, Search, Download, Pencil, Trash2, CalendarIcon } from "lucide-react";
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
  import { Calendar } from "@/components/ui/calendar";
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover";
  import { format } from "date-fns";
  import { cn } from "@/lib/utils";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import * as z from "zod";
  import { mockAttendances, mockUsers, mockEvents, Attendance } from "@/data/mockData";

  // Form validation schema - tanpa confidence
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

  export default function Attendance() {
    const [attendances, setAttendances] = useState<Attendance[]>(mockAttendances);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterEvent, setFilterEvent] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterDate, setFilterDate] = useState<string>("");
    
    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<number | null>(null);

    const form = useForm<AttendanceFormValues>({
      resolver: zodResolver(attendanceFormSchema),
      defaultValues: {
        attendanceDate: new Date(),
        userId: "",
        eventId: "",
        checkInTime: "08:00",
        checkOutTime: "09:00",
        status: "present",
      },
    });

    // Reset form and set values when editing
    const openEditDialog = (record: Attendance) => {
      setEditingRecord(record);
      form.reset({
        attendanceDate: new Date(record.attendanceDate + "T00:00:00"),
        userId: record.userId.toString(),
        eventId: record.eventId.toString(),
        checkInTime: record.checkInTime.split("T")[1].substring(0, 5),
        checkOutTime: record.checkOutTime ? record.checkOutTime.split("T")[1].substring(0, 5) : "",
        status: record.status,
      });
      setIsDialogOpen(true);
    };

    const openNewDialog = () => {
      setEditingRecord(null);
      form.reset({
        attendanceDate: new Date(),
        userId: "",
        eventId: "",
        checkInTime: "08:00",
        checkOutTime: "09:00",
        status: "present",
      });
      setIsDialogOpen(true);
    };

    const openDeleteDialog = (id: number) => {
      setRecordToDelete(id);
      setDeleteDialogOpen(true);
    };

    const handleDelete = () => {
      if (recordToDelete) {
        setAttendances(attendances.filter(a => a.id !== recordToDelete));
        setDeleteDialogOpen(false);
        setRecordToDelete(null);
      }
    };

    const onSubmit = (data: AttendanceFormValues) => {
      const dateStr = format(data.attendanceDate, "yyyy-MM-dd");
      const checkInDateTime = `${dateStr}T${data.checkInTime}:00`;
      const checkOutDateTime = data.checkOutTime ? `${dateStr}T${data.checkOutTime}:00` : undefined;

      if (editingRecord) {
        // Update existing record - pertahankan confidence score yang sudah ada
        const updatedAttendances = attendances.map(a => 
          a.id === editingRecord.id 
            ? {
                ...a,
                userId: parseInt(data.userId),
                eventId: parseInt(data.eventId),
                attendanceDate: dateStr,
                checkInTime: checkInDateTime,
                checkOutTime: checkOutDateTime,
                status: data.status,
                // confidenceScore tetap menggunakan nilai yang sudah ada
              }
            : a
        );
        setAttendances(updatedAttendances);
      } else {
        // Create new record
        const newId = Math.max(...attendances.map(a => a.id), 0) + 1;
        const newAttendance: Attendance = {
          id: newId,
          userId: parseInt(data.userId),
          eventId: parseInt(data.eventId),
          attendanceDate: dateStr,
          checkInTime: checkInDateTime,
          checkOutTime: checkOutDateTime,
          status: data.status,
          confidenceScore: 95.0, // default value untuk record baru
          livenessVerified: true,
          deviceInfo: "Manual Entry - Web",
          createdAt: new Date().toISOString(),
        };
        setAttendances([newAttendance, ...attendances]);
      }

      setIsDialogOpen(false);
      setEditingRecord(null);
    };

    // Filter attendances
    const filteredAttendances = attendances.filter((record) => {
      const user = mockUsers.find((u) => u.id === record.userId);
      const matchSearch =
        (user?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user?.memberId.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;

      const matchEvent = filterEvent === "all" || record.eventId.toString() === filterEvent;
      const matchStatus = filterStatus === "all" || record.status === filterStatus;
      const matchDate = !filterDate || record.attendanceDate === filterDate;

      return matchSearch && matchEvent && matchStatus && matchDate;
    });

    const getUserName = (userId: number) => {
      const user = mockUsers.find((u) => u.id === userId);
      return user?.fullName || "Unknown";
    };

    const getEventName = (eventId: number) => {
      const event = mockEvents.find((e) => e.id === eventId);
      return event?.eventCode || "Unknown";
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
      const date = new Date(dateString + "T00:00:00");
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    const handleExportCSV = () => {
      const headers = ["Date", "Member", "Event", "Check-in", "Check-out", "Status", "Confidence"];
      const rows = filteredAttendances.map((record) => [
        record.attendanceDate,
        getUserName(record.userId),
        getEventName(record.eventId),
        formatTime(record.checkInTime),
        record.checkOutTime ? formatTime(record.checkOutTime) : "-",
        record.status,
        record.confidenceScore ? `${record.confidenceScore.toFixed(2)}%` : "-",
      ]);

      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    };

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
                {mockEvents.map((evt) => (
                  <SelectItem key={evt.id} value={evt.id.toString()}>
                    {evt.eventCode} - {evt.eventName}
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
                        {formatDate(record.attendanceDate)}
                      </TableCell>
                      <TableCell>{getUserName(record.userId)}</TableCell>
                      <TableCell className="text-sm">
                        {getEventName(record.eventId)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTime(record.checkInTime)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.checkOutTime
                          ? formatTime(record.checkOutTime)
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-sm">
                        {record.confidenceScore
                          ? `${record.confidenceScore.toFixed(2)}%`
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
                            onClick={() => openDeleteDialog(record.id)}
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
            <p className="text-2xl font-bold">{filteredAttendances.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Present</p>
            <p className="text-2xl font-bold text-status-success">
              {filteredAttendances.filter((a) => a.status === "present").length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Late</p>
            <p className="text-2xl font-bold text-status-warning">
              {filteredAttendances.filter((a) => a.status === "late").length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Excused/Sick</p>
            <p className="text-2xl font-bold text-accent">
              {filteredAttendances.filter((a) => a.status === "excused" || a.status === "sick").length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Absent</p>
            <p className="text-2xl font-bold text-status-error">
              {filteredAttendances.filter((a) => a.status === "absent").length}
            </p>
          </Card>
        </div>

        {/* Manual Entry / Edit Dialog - Diperkecil ukurannya */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[120vh]">
            <DialogHeader>
              <DialogTitle className="text-xl">
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
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm">Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal h-9",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Member</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select a member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockUsers
                            .filter(u => u.role === "member" && u.isActive)
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.fullName} ({user.memberId})
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
                      <FormLabel className="text-sm">Event</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select an event" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockEvents.map((event) => (
                            <SelectItem key={event.id} value={event.id.toString()}>
                              {event.eventCode} - {event.eventName}
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
                        <FormLabel className="text-sm">Check-in</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} className="h-9" />
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
                        <FormLabel className="text-sm">Check-out</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} className="h-9" />
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
                      <FormLabel className="text-sm">Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
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

                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} size="sm">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    {editingRecord ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Attendance Record</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this attendance record? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} size="sm">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} size="sm">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }