// client/components/charts/AttendanceTrendChart.tsx
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
      const events = eventsRes.data.data;
      
      const classData: ClassData[] = [];
      
      for (const event of events) {
        const statsRes = await attendanceApi.getAll({ eventId: event.id });
        const attendances = statsRes.data.data;
        
        const present = attendances.filter((a: any) => a.status === 'present' || a.status === 'late').length;
        const absent = attendances.filter((a: any) => a.status === 'absent').length;
        const excused = attendances.filter((a: any) => a.status === 'excused' || a.status === 'sick').length;
        
        classData.push({
          name: event.event_code,
          present,
          absent,
          excused,
        });
      }
      
      setData(classData);
    } catch (error) {
      console.error('Error fetching class data:', error);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Attendance by Event</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="absent"
              fill="hsl(0 84% 60%)"
              name="Absent"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="excused"
              fill="hsl(216 98% 52%)"
              name="Excused"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}