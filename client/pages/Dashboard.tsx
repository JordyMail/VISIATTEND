import { useState, useEffect } from "react";
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
import { motion } from "framer-motion";
import { dashboardApi, userApi, eventApi } from "@/services/api";

interface DashboardStats {
    totalMembers: number;
    activeEvents: number;
    todayAttendance: {
        checkedIn: number;
        pending: number;
        absent: number;
    };
    attendanceRate: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeEvents: 0,
    todayAttendance: { checkedIn: 0, pending: 0, absent: 0 },
    attendanceRate: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [membersRes, eventsRes, todayStatsRes, activitiesRes] = await Promise.all([
        userApi.getAll({ role: 'member', isActive: true }),
        eventApi.getAll({ isActive: true }),
        dashboardApi.getStats(),
        dashboardApi.getRecentActivities(5),
      ]);

      setStats({
        totalMembers: membersRes.data.data.length,
        activeEvents: eventsRes.data.data.length,
        todayAttendance: todayStatsRes.data.data,
        attendanceRate: 85.5, // This should come from backend calculation
      });
      
      setRecentActivities(activitiesRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-6 md:p-8 space-y-8"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your church attendance overview.
          </p>
        </div>
        <motion.div 
          className="flex gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Button variant="outline" className="gap-2">
            Export Report
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            Add Event
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Members"
            value={stats.totalMembers}
            icon={Users}
            color="primary"
            description="Active member accounts"
            trend={{ value: 12, direction: "up", label: "vs last month" }}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active Events"
            value={stats.activeEvents}
            icon={BookOpen}
            color="info"
            description="Events in session"
            trend={{ value: 5, direction: "up", label: "vs last month" }}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Today's Attendance"
            value={`${stats.todayAttendance.checkedIn}/${stats.totalMembers}`}
            icon={CalendarCheck}
            color="success"
            description={`${stats.todayAttendance.pending} pending, ${stats.todayAttendance.absent} absent`}
            trend={{ value: 3, direction: "down", label: "absence rate" }}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Attendance Rate"
            value={`${stats.attendanceRate}%`}
            icon={TrendingUp}
            color="warning"
            description="Overall attendance percentage"
            trend={{ value: 2.5, direction: "up", label: "vs last semester" }}
          />
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div className="lg:col-span-2">
          <AttendanceTrendChart days={7} />
        </motion.div>
        <motion.div>
          <StatusDistributionChart />
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <ClassAttendanceChart />
      </motion.div>

      <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
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
                  {recentActivities.map((activity, index) => (
                    <motion.tr
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        {activity.user_name || "System"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {activity.description}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString("id-ID")}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Present Today
                  </p>
                  <div className="text-2xl font-bold">
                    {stats.todayAttendance.checkedIn}
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stats.todayAttendance.checkedIn / stats.totalMembers) * 100}%` }}
                      transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                      className="bg-status-success h-2 rounded-full"
                    />
                  </div>
                </motion.div>

                <hr className="my-4" />

                <motion.div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Pending Attendance
                  </p>
                  <div className="text-2xl font-bold">
                    {stats.todayAttendance.pending}
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stats.todayAttendance.pending / stats.totalMembers) * 100}%` }}
                      transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
                      className="bg-status-warning h-2 rounded-full"
                    />
                  </div>
                </motion.div>

                <hr className="my-4" />

                <motion.div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Absent Today
                  </p>
                  <div className="text-2xl font-bold">
                    {stats.todayAttendance.absent}
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stats.todayAttendance.absent / stats.totalMembers) * 100}%` }}
                      transition={{ delay: 1.1, duration: 0.8, ease: "easeOut" }}
                      className="bg-status-error h-2 rounded-full"
                    />
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}