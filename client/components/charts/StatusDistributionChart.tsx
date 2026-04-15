import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceApi } from "@/services/api";

interface StatusDistributionChartProps {
  userId?: number;
  eventId?: number;
}

export function StatusDistributionChart({
  userId,
  eventId,
}: StatusDistributionChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId, eventId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.getAll({ userId, eventId });
      const attendances = response.data.data;
      
      const stats = {
        present: attendances.filter((a: any) => a.status === 'present').length,
        late: attendances.filter((a: any) => a.status === 'late').length,
        excused: attendances.filter((a: any) => a.status === 'excused').length,
        sick: attendances.filter((a: any) => a.status === 'sick').length,
        absent: attendances.filter((a: any) => a.status === 'absent').length,
      };
      
      const chartData = [
        { name: "Present", value: stats.present, color: "hsl(142 71% 45%)" },
        { name: "Late", value: stats.late, color: "hsl(38 92% 50%)" },
        { name: "Excused", value: stats.excused, color: "hsl(216 98% 52%)" },
        { name: "Sick", value: stats.sick, color: "hsl(54 100% 50%)" },
        { name: "Absent", value: stats.absent, color: "hsl(0 84% 60%)" },
      ].filter((item) => item.value > 0);
      
      setData(chartData);
    } catch (error) {
      console.error('Error fetching status distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance Status Distribution</CardTitle>
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
        <CardTitle className="text-lg">Attendance Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value) => `${value} members`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}