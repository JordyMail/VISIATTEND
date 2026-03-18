import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAttendanceStats } from "@/data/mockData";

interface StatusDistributionChartProps {
  userId?: number;
  eventId?: number;
}

export function StatusDistributionChart({
  userId,
  eventId,
}: StatusDistributionChartProps) {
  const stats = getAttendanceStats(userId, eventId);

  const data = [
    {
      name: "Present",
      value: stats.present,
      color: "hsl(142 71% 45%)", // success green
    },
    {
      name: "Late",
      value: stats.late,
      color: "hsl(38 92% 50%)", // warning orange
    },
    {
      name: "Excused",
      value: stats.excused,
      color: "hsl(216 98% 52%)", // info blue
    },
    {
      name: "Sick",
      value: stats.sick,
      color: "hsl(54 100% 50%)", // yellow
    },
    {
      name: "Absent",
      value: stats.absent,
      color: "hsl(0 84% 60%)", // error red
    },
  ].filter((item) => item.value > 0);

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
