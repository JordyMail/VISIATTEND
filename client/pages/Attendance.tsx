// client/pages/Attendance.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Search, Download, Pencil, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useLanguage } from "@/lib/i18n";

const createAttendanceFormSchema = (t: (key: import("@/lib/i18n").TranslationKey) => string) => z.object({
  attendanceDate: z.string({ required_error: t("attendanceRequired") }),
  userId: z.string({ required_error: t("memberRequired") }),
  eventId: z.string({ required_error: t("eventRequired") }),
  checkInTime: z.string({ required_error: t("checkInTimeRequired") }),
  checkOutTime: z.string().optional(),
  status: z.enum(["present", "late", "excused", "sick", "absent"], {
    required_error: t("statusRequired"),
  }),
});

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
  notes?: string;
  created_at: string;
}

interface User {
  id: number;
  full_name: string;
  member_id: string;
  email: string;
  jabatan?: string;
  division?: string;
}

interface Event {
  id: number;
  event_code: string;
  event_name: string;
  event_type: string;
  is_active: boolean;
}

export default function Attendance() {
  const { t } = useLanguage();
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

  const formSchema = createAttendanceFormSchema(t);
  type AttendanceFormValues = z.infer<typeof formSchema>;
  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      attendanceDate: format(new Date(), "yyyy-MM-dd"),
      userId: "",
      eventId: "",
      checkInTime: "07:00",
      checkOutTime: "09:30",
      status: "present",
    },
  });

    const createAttendanceFormSchema = (t: (key: import("@/lib/i18n").TranslationKey) => string) => z.object({
      attendanceDate: z.string({ required_error: t("attendanceRequired") }),
    });
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attendanceRes, usersRes, eventsRes] = await Promise.all([
        attendanceApi.getAll(),
        userApi.getAll({ isActive: true }),
        eventApi.getAll({ isActive: true }),
      ]);
      
      setAttendances(attendanceRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setEvents(eventsRes.data.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
            setLoading(true);
            const [attendanceRes, usersRes, eventsRes] = await Promise.all([
              attendanceApi.getAll(),
              userApi.getAll({ isActive: true }),
              eventApi.getAll({ isActive: true }),
            ]);
      
      toast({
        title: t("error"),
        description: error.response?.data?.message || t("attendanceDataLoadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (record: AttendanceRecord) => {
    setEditingRecord(record);
    form.reset({
      attendanceDate: record.attendance_date,
      userId: record.user_id.toString(),
      eventId: record.event_id.toString(),
      checkInTime: record.check_in_time ? record.check_in_time.split("T")[1]?.substring(0, 5) || "07:00" : "07:00",
      checkOutTime: record.check_out_time ? record.check_out_time.split("T")[1]?.substring(0, 5) : "",
      status: record.status as any,
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingRecord(null);
    form.reset({
      attendanceDate: format(new Date(), "yyyy-MM-dd"),
      userId: "",
      eventId: "",
      checkInTime: "07:00",
      checkOutTime: "09:30",
      status: "present",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      await attendanceApi.delete(recordToDelete);
      toast({
        title: t("success"),
        description: t("attendanceRecordDeleted"),
      });
      fetchData();
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.response?.data?.message || t("deleteAttendanceRecordFailed"),
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: AttendanceFormValues) => {
    try {
      const checkInDateTime = `${data.attendanceDate}T${data.checkInTime}:00`;
      const checkOutDateTime = data.checkOutTime ? `${data.attendanceDate}T${data.checkOutTime}:00` : undefined;

      if (editingRecord) {
        await attendanceApi.update(editingRecord.id, {
          checkOutTime: checkOutDateTime,
          status: data.status,
          notes: data.status === "excused" ? "Excused absence" : data.status === "sick" ? "Medical leave" : undefined,
        });
        toast({
          title: t("success"),
          description: t("attendanceRecordUpdated"),
        });
      } else {
        await attendanceApi.create({
          userId: parseInt(data.userId),
          eventId: parseInt(data.eventId),
          attendanceDate: data.attendanceDate,
          checkInTime: checkInDateTime,
          checkOutTime: checkOutDateTime,
          status: data.status,
          deviceInfo: "Manual Entry - Web",
          notes: data.status === "excused" ? "Excused absence" : data.status === "sick" ? "Medical leave" : undefined,
        });
        toast({
          title: t("success"),
          description: t("attendanceRecordCreated"),
        });
      }

      setIsDialogOpen(false);
      setEditingRecord(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.response?.data?.message || t("attendanceRecordSaveFailed"),
        variant: "destructive",
      });
    }
  };

  const filteredAttendances = attendances.filter((record) => {
    const user = users.find((u) => u.id === record.user_id);
    const matchSearch = !searchTerm || 
      (user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user?.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user?.email?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchEvent = filterEvent === "all" || record.event_id.toString() === filterEvent;
    const matchStatus = filterStatus === "all" || record.status === filterStatus;
    const matchDate = !filterDate || record.attendance_date === filterDate;

    return matchSearch && matchEvent && matchStatus && matchDate;
  });

  const getUserName = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    return user?.full_name || "Unknown";
  };

  const getUserMemberId = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    return user?.member_id || "";
  };

  const getEventName = (eventId: number) => {
    const event = events.find((e) => e.id === eventId);
    return event?.event_name || event?.event_code || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      present: { label: t("present"), className: "bg-green-100 text-green-700 border-green-200" },
      late: { label: t("late"), className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
      excused: { label: t("excusedSick").split(" /")[0], className: "bg-blue-100 text-blue-700 border-blue-200" },
      sick: { label: t("sick"), className: "bg-purple-100 text-purple-700 border-purple-200" },
      absent: { label: t("absent"), className: "bg-red-100 text-red-700 border-red-200" },
    };
    
    const config = statusMap[status] || statusMap.present;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatTime = (dateTimeString: string) => {
    if (!dateTimeString) return "-";
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleExportCSV = () => {
    if (filteredAttendances.length === 0) {
      toast({
        title: t("noData"),
        description: t("noDataToExport"),
      });
      return;
    }

    const headers = ["Date", "Member ID", "Member Name", "Event", "Check-in", "Check-out", "Status", "Confidence"];
    const rows = filteredAttendances.map((record) => [
      record.attendance_date,
      getUserMemberId(record.user_id),
      getUserName(record.user_id),
      getEventName(record.event_id),
      formatTime(record.check_in_time),
      record.check_out_time ? formatTime(record.check_out_time) : "-",
      record.status,
      record.confidence_score ? `${record.confidence_score.toFixed(2)}%` : "-",
    ]);

    const csvContent = [headers, ...rows].map((row) => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    
    // Add BOM for UTF-8
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: t("success"),
      description: t("reportExported"),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const totalRecords = filteredAttendances.length;
  const presentCount = filteredAttendances.filter((a) => a.status === "present").length;
  const lateCount = filteredAttendances.filter((a) => a.status === "late").length;
  const excusedCount = filteredAttendances.filter((a) => a.status === "excused").length;
  const sickCount = filteredAttendances.filter((a) => a.status === "sick").length;
  const absentCount = filteredAttendances.filter((a) => a.status === "absent").length;
  const excusedSickCount = excusedCount + sickCount;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("attendanceManagement")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("viewManageAttendance")}
          </p>
        </div>
        <div className="flex gap-2 flex-col md:flex-row w-full md:w-auto">
          <Button
            asChild
            variant="outline"
            className="gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link to="/attendance/home">
              {t("homeAttendance")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            {t("exportCsv")}
          </Button>
          <Button onClick={openNewDialog} className="gap-2 flex-1 md:flex-none">
            <Plus className="w-4 h-4" />
            {t("manualEntry")}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3 md:p-4">
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{t("totalRecords")}</p>
          <p className="text-xl md:text-2xl font-bold">{totalRecords}</p>
        </Card>
        <Card className="p-3 md:p-4 border-l-4 border-l-green-500">
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{t("present")}</p>
          <p className="text-xl md:text-2xl font-bold text-green-600">{presentCount}</p>
        </Card>
        <Card className="p-3 md:p-4 border-l-4 border-l-yellow-500">
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{t("late")}</p>
          <p className="text-xl md:text-2xl font-bold text-yellow-600">{lateCount}</p>
        </Card>
        <Card className="p-3 md:p-4 border-l-4 border-l-blue-500">
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{t("excusedSick")}</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600">{excusedSickCount}</p>
        </Card>
        <Card className="p-3 md:p-4 border-l-4 border-l-red-500">
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{t("absent")}</p>
          <p className="text-xl md:text-2xl font-bold text-red-600">{absentCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchNameIdEmail")}
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger>
              <SelectValue placeholder={t("filterByEventLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allEventsLabel")}</SelectItem>
              {events.map((evt) => (
                <SelectItem key={evt.id} value={evt.id.toString()}>
                  {evt.event_code} - {evt.event_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder={t("filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              <SelectItem value="present">{t("present")}</SelectItem>
              <SelectItem value="late">{t("late")}</SelectItem>
              <SelectItem value="excused">{t("excusedSick").split(" /")[0]}</SelectItem>
              <SelectItem value="sick">{t("sick")}</SelectItem>
              <SelectItem value="absent">{t("absent")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            placeholder={t("filterByDate")}
          />
        </div>
        {filteredAttendances.length !== attendances.length && (
          <p className="text-xs text-muted-foreground mt-3">
            {t("recordsShown")} {filteredAttendances.length} / {attendances.length}
          </p>
        )}
      </Card>

      {/* Attendance Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">{t("date")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("memberId")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("memberName")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("event")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("checkIn")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("checkOut")}</TableHead>
                <TableHead className="whitespace-nowrap">{t("status")}</TableHead>
                <TableHead className="whitespace-nowrap text-right">{t("actionsLabel")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendances.length > 0 ? (
                filteredAttendances.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(record.attendance_date)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {getUserMemberId(record.user_id)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getUserName(record.user_id)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {getEventName(record.event_id)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatTime(record.check_in_time)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {record.check_out_time ? formatTime(record.check_out_time) : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(record)}
                          className="h-8 w-8"
                          title={t("edit")}
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
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title={t("delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? t("edit") : t("manualEntry")}
            </DialogTitle>
            <DialogDescription>
              {editingRecord 
                ? t("attendanceRecordUpdated")
                : t("attendanceRecordCreated")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="attendanceDate" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("date")} *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
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
                    <FormLabel>{t("memberLabel")} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("memberLabel")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
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
                    <FormLabel>{t("event")} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("event")} />
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
                      <FormLabel>{t("checkIn")} *</FormLabel>
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
                      <FormLabel>{t("checkOut")}</FormLabel>
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
                    <FormLabel>{t("status") } *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("status")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="present">{t("present")}</SelectItem>
                        <SelectItem value="late">{t("late")}</SelectItem>
                        <SelectItem value="excused">{t("excused")}</SelectItem>
                        <SelectItem value="sick">{t("sick")}</SelectItem>
                        <SelectItem value="absent">{t("absent")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit">
                  {editingRecord ? t("edit") : t("add")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cannotUndo")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}