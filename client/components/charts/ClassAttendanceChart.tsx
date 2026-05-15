// client/components/charts/ClassAttendanceChart.tsx
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eventApi, attendanceApi } from "@/services/api";

interface ClassData {
  name: string;
  present: number;
  absent: number;
  excused: number;
}

export function ClassAttendanceChart() {
  const [data, setData] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassData();
  }, []);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      const eventsRes = await eventApi.getAll({ isActive: true });
      const events: any[] = eventsRes.data.data || [];

      // Fetch attendance for all events in parallel
      const classDataPromises = events.slice(0, 6).map(async (event) => {
        try {
          const statsRes = await attendanceApi.getAll({ eventId: event.id });
          const attendances: any[] = statsRes.data.data || [];

          const present = attendances.filter(
            (a) => a.status === "present" || a.status === "late"
          ).length;
          const absent = attendances.filter(
            (a) => a.status === "absent"
          ).length;
          const excused = attendances.filter(
            (a) => a.status === "excused" || a.status === "sick"
          ).length;

          return { name: event.event_code, present, absent, excused };
        } catch {
          return { name: event.event_code, present: 0, absent: 0, excused: 0 };
        }
      });

      const classData = await Promise.all(classDataPromises);
      setData(classData);
    } catch (error) {
      console.error("Error fetching class data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance by Event</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance by Event</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No event data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Attendance by Event</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            <Bar
              dataKey="present"
              fill="hsl(142 71% 45%)"
              name="Present"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="absent"
              fill="hsl(0 84% 60%)"
              name="Absent"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="excused"
              fill="hsl(216 98% 52%)"
              name="Excused"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}