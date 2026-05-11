import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceApi } from "@/services/api";

interface AttendanceTrendChartProps {
  days?: number;
  userId?: number;
}

export function AttendanceTrendChart({
  days = 7,
  userId,
}: AttendanceTrendChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrend();
  }, [days, userId]);

  const fetchTrend = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.getTrend(days, userId);
      const trendData = response.data.data ?? [];

      const chartData = trendData.map((item: any) => ({
        date: new Date(item.attendance_date).toLocaleDateString("id-ID", {
          month: "short",
          day: "numeric",
        }),
        present: item.total_present ?? 0,
        absent: item.total_absent ?? 0,
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching attendance trend:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance Trend</CardTitle>
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
        <CardTitle className="text-lg">Attendance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
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
            <Line
              type="monotone"
              dataKey="present"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
              name="Present"
            />
            <Line
              type="monotone"
              dataKey="absent"
              stroke="hsl(0 84% 60%)"
              strokeWidth={2}
              dot={{ fill: "hsl(0 84% 60%)", r: 4 }}
              activeDot={{ r: 6 }}
              name="Absent"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}