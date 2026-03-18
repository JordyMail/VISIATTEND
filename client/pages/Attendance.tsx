import { useState } from "react";
import { Plus, Search, Download, Filter } from "lucide-react";
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
import { mockAttendances, mockUsers, mockEvents, Attendance } from "@/data/mockData";

export default function Attendance() {
  const [attendances, setAttendances] = useState<Attendance[]>(mockAttendances);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

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
    const headers = ["Date", "Member", "Event", "Check-in", "Check-out", "Status"];
    const rows = filteredAttendances.map((record) => [
      record.attendanceDate,
      getUserName(record.userId),
      getEventName(record.eventId),
      formatTime(record.checkInTime),
      record.checkOutTime ? formatTime(record.checkOutTime) : "-",
      record.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_report.csv";
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
          <Button className="gap-2 bg-primary hover:bg-primary/90">
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
                  {evt.eventCode}
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
          <p className="text-sm text-muted-foreground mb-1">Excused</p>
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
    </div>
  );
}
