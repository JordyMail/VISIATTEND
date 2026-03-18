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
import { motion } from "framer-motion";

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

  // Animation variants
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

  const headerVariants = {
    hidden: { y: -30, opacity: 0 },
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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-6 md:p-8 space-y-8"
    >
      {/* Header with animation */}
      <motion.div
        variants={headerVariants}
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
            <Plus className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Add Event
          </Button>
        </motion.div>
      </motion.div>

      {/* Statistics Cards with staggered animation */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            title: "Total Members",
            value: activeMembers,
            icon: Users,
            color: "primary",
            description: "Active member accounts",
            trend: { value: 12, direction: "up", label: "vs last month" }
          },
          {
            title: "Active Events",
            value: activeEvents,
            icon: BookOpen,
            color: "info",
            description: "Events in session",
            trend: { value: 5, direction: "up", label: "vs last month" }
          },
          {
            title: "Today's Attendance",
            value: `${todayStats.checkedIn}/${activeMembers}`,
            icon: CalendarCheck,
            color: "success",
            description: `${todayStats.pending} pending, ${todayStats.absent} absent`,
            trend: { value: 3, direction: "down", label: "absence rate" }
          },
          {
            title: "Attendance Rate",
            value: `${overallStats.attendancePercentage.toFixed(1)}%`,
            icon: TrendingUp,
            color: "warning",
            description: "Overall attendance percentage",
            trend: { value: 2.5, direction: "up", label: "vs last semester" }
          }
        ].map((card, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <StatCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Grid with animation */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <motion.div
          className="lg:col-span-2"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <AttendanceTrendChart days={7} />
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <StatusDistributionChart />
        </motion.div>
      </motion.div>

      {/* Class Attendance Chart with animation */}
      <motion.div variants={itemVariants}>
        <ClassAttendanceChart />
      </motion.div>

      {/* Recent Activities and Quick Stats with animation */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
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
                  {recentActivities.map((activity, index) => {
                    const user = activity.userId
                      ? getUserById(activity.userId)
                      : null;
                    return (
                      <motion.tr
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
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
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants} className="space-y-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-sm text-muted-foreground mb-2">
                    Present Today
                  </p>
                  <div className="text-2xl font-bold">
                    {todayStats.checkedIn}
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(todayStats.checkedIn / activeMembers) * 100}%` }}
                      transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                      className="bg-status-success h-2 rounded-full"
                    />
                  </div>
                </motion.div>

                <hr className="my-4" />

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <p className="text-sm text-muted-foreground mb-2">
                    Pending Attendance
                  </p>
                  <div className="text-2xl font-bold">
                    {todayStats.pending}
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(todayStats.pending / activeMembers) * 100}%` }}
                      transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
                      className="bg-status-warning h-2 rounded-full"
                    />
                  </div>
                </motion.div>

                <hr className="my-4" />

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <p className="text-sm text-muted-foreground mb-2">
                    Absent Today
                  </p>
                  <div className="text-2xl font-bold">
                    {todayStats.absent}
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(todayStats.absent / activeMembers) * 100}%` }}
                      transition={{ delay: 1.1, duration: 0.8, ease: "easeOut" }}
                      className="bg-status-error h-2 rounded-full"
                    />
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Present", value: overallStats.present, color: "text-status-success", delay: 1.2 },
                  { label: "Late", value: overallStats.late, color: "text-status-warning", delay: 1.3 },
                  { label: "Excused", value: overallStats.excused + overallStats.sick, color: "text-accent", delay: 1.4 },
                  { label: "Absent", value: overallStats.absent, color: "text-status-error", delay: 1.5 }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: item.delay }}
                    className="flex justify-between"
                  >
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`font-semibold ${item.color}`}>
                      {item.value}
                    </span>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}