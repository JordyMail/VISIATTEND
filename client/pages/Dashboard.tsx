import { Users, BookOpen, CalendarCheck, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/charts/StatCard";
import { AttendanceTrendChart } from "@/components/charts/AttendanceTrendChart";
import { StatusDistributionChart } from "@/components/charts/StatusDistributionChart";
import { ClassAttendanceChart } from "@/components/charts/ClassAttendanceChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  mockUsers,
  mockEvents,
  getTodayAttendanceStats,
  getAttendanceStats,
  getRecentActivities,
  getUserById,
} from "@/data/mockData";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const todayStats = getTodayAttendanceStats();
  const overallStats = getAttendanceStats();
  const recentActivities = getRecentActivities(5);
  const activeMembers = mockUsers.filter(
    (u) => u.role === "member" && u.isActive
  ).length;
  const activeEvents = mockEvents.filter((e) => e.isActive).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
      case "CHECK_IN":
        return "bg-status-success/20 text-status-success";
      case "late":
        return "bg-status-warning/20 text-status-warning";
      case "absent":
      case "ABSENT":
        return "bg-status-error/20 text-status-error";
      case "excused":
      case "sick":
        return "bg-accent/20 text-accent";
      default:
        return "bg-muted/20 text-muted-foreground";
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your church attendance overview.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value={activeMembers}
          icon={Users}
          color="primary"
          description="Active member accounts"
          trend={{ value: 12, direction: "up", label: "vs last month" }}
        />
        <StatCard
          title="Active Events"
          value={activeEvents}
          icon={BookOpen}
          color="info"
          description="Events in session"
          trend={{ value: 5, direction: "up", label: "vs last month" }}
        />
        <StatCard
          title="Today's Attendance"
          value={`${todayStats.checkedIn}/${activeMembers}`}
          icon={CalendarCheck}
          color="success"
          description={`${todayStats.pending} pending, ${todayStats.absent} absent`}
          trend={{
            value: 3,
            direction: "down",
            label: "absence rate",
          }}
        />
        <StatCard
          title="Attendance Rate"
          value={`${overallStats.attendancePercentage.toFixed(1)}%`}
          icon={TrendingUp}
          color="warning"
          description="Overall attendance percentage"
          trend={{ value: 2.5, direction: "up", label: "vs last semester" }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceTrendChart days={7} />
        </div>
        <div>
          <StatusDistributionChart />
        </div>
      </div>

      {/* Class Attendance Chart */}
      <div>
        <ClassAttendanceChart />
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivities.map((activity) => {
                    const user = activity.userId
                      ? getUserById(activity.userId)
                      : null;
                    return (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">
                          {user?.fullName || "System"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {activity.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {activity.description}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Present Today
                </p>
                <div className="text-2xl font-bold">
                  {todayStats.checkedIn}
                </div>
                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                  <div
                    className="bg-status-success h-2 rounded-full"
                    style={{
                      width: `${(todayStats.checkedIn / activeMembers) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <hr className="my-4" />

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Pending Attendance
                </p>
                <div className="text-2xl font-bold">
                  {todayStats.pending}
                </div>
                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                  <div
                    className="bg-status-warning h-2 rounded-full"
                    style={{
                      width: `${(todayStats.pending / activeMembers) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <hr className="my-4" />

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Absent Today
                </p>
                <div className="text-2xl font-bold">
                  {todayStats.absent}
                </div>
                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                  <div
                    className="bg-status-error h-2 rounded-full"
                    style={{
                      width: `${(todayStats.absent / activeMembers) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Present</span>
                <span className="font-semibold text-status-success">
                  {overallStats.present}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Late</span>
                <span className="font-semibold text-status-warning">
                  {overallStats.late}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Excused</span>
                <span className="font-semibold text-accent">
                  {overallStats.excused + overallStats.sick}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Absent</span>
                <span className="font-semibold text-status-error">
                  {overallStats.absent}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
