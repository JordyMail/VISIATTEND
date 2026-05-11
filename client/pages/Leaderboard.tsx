// client/pages/LeaderBoard.tsx
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { eventApi, attendanceApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

const MEDALS = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

interface LeaderboardMember {
  user_id: number;
  full_name: string;
  member_id: string;
  total_present: number;
  total_late: number;
  attendance_percentage: number;
  achievements?: string[];
}

interface Event {
  id: number;
  event_code: string;
  event_name: string;
}

export default function Leaderboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [period, setPeriod] = useState<"week" | "month" | "semester">("semester");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchLeaderboard();
    }
  }, [selectedEvent, period]);

  const fetchEvents = async () => {
    try {
      const response = await eventApi.getAll({ isActive: true });
      setEvents(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedEvent(response.data.data[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.getLeaderboard(parseInt(selectedEvent), period);
      setLeaderboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          Member rankings and achievements by event attendance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Event</label>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.event_code} - {event.event_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Period</label>
          <Select
            value={period}
            onValueChange={(value) =>
              setPeriod(value as "week" | "month" | "semester")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="semester">This Season</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : leaderboardData.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No attendance data available for this period</p>
        </Card>
      ) : (
        <>
          {/* Top 3 Winners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboardData.slice(0, 3).map((member, index) => (
              <Card key={member.user_id} className="p-6 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 text-8xl opacity-10">
                  {MEDALS[index + 1 as keyof typeof MEDALS]}
                </div>
                <div className="relative z-10 text-center">
                  <div className="text-5xl mb-2">
                    {MEDALS[index + 1 as keyof typeof MEDALS]}
                  </div>
                  <div className="mb-4">
                    <p className="font-semibold text-lg">{member.full_name}</p>
                    <p className="text-sm text-muted-foreground">{member.member_id}</p>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-3xl font-bold text-primary">
                        {member.attendance_percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Attendance</p>
                    </div>
                    <Progress value={member.attendance_percentage} className="h-2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Full Leaderboard Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-sm font-semibold">Rank</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Member ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Present</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Late</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((member, index) => (
                    <tr key={member.user_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-semibold">
                          {index < 3 ? (
                            <span className="text-xl">{MEDALS[index + 1 as keyof typeof MEDALS]}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{member.full_name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{member.member_id}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-green-500/20 text-green-600">
                          {member.total_present}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600">
                          {member.total_late}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <Progress value={member.attendance_percentage} className="h-2" />
                          </div>
                          <span className="text-sm font-medium min-w-12">
                            {member.attendance_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}