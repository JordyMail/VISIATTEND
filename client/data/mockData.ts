// Mock data for VISIATTEND Dashboard - Church Organization

export interface User {
  id: number;
  memberId: string;
  fullName: string;
  email: string;
  role: "admin" | "preacher" | "member" | "staff";
  profilePhoto?: string;
  phoneNumber?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Event {
  id: number;
  eventCode: string;
  eventName: string;
  description?: string;
  preacherId: number;
  season: string; // e.g., "2024 Season"
  eventType: "worship" | "meeting" | "study" | "fellowship" | "outreach"; // Type of event
  isActive: boolean;
  createdAt: string;
}

export interface Class {
  id: number;
  classCode: string;
  className: string;
  description?: string;
  teacherId?: number;
  academicYear?: string;
  isActive: boolean;
}

export const mockClasses: Class[] = [
  {
    id: 1,
    classCode: "C101",
    className: "Sunday School - Beginners",
    description: "Sunday School class for ages 4-7",
    teacherId: 8,
    academicYear: "2024",
    isActive: true,
  },
  {
    id: 2,
    classCode: "C102",
    className: "Sunday School - Juniors",
    description: "Sunday School class for ages 8-12",
    teacherId: 2,
    academicYear: "2024",
    isActive: true,
  },
  {
    id: 3,
    classCode: "C103",
    className: "Youth Bible Study",
    description: "Bible study class for teenagers",
    teacherId: 2,
    academicYear: "2024",
    isActive: true,
  },
  {
    id: 4,
    classCode: "C104",
    className: "Adult Fellowship",
    description: "Fellowship and study for adults",
    teacherId: 8,
    academicYear: "2024",
    isActive: true,
  },
];

export interface EventEnrollment {
  id: number;
  eventId: number;
  userId: number;
  enrollmentDate: string;
  isActive: boolean;
}

export interface Attendance {
  id: number;
  userId: number;
  eventId: number;
  attendanceDate: string;
  checkInTime: string;
  checkOutTime?: string;
  status: "present" | "late" | "excused" | "sick" | "absent";
  confidenceScore?: number;
  livenessVerified: boolean;
  deviceInfo?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  description?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Mock Users (Members)
export const mockUsers: User[] = [
  {
    id: 1,
    memberId: "ADM001",
    fullName: "Admin User",
    email: "admin@visiattend.com",
    role: "admin",
    phoneNumber: "08123456789",
    isActive: true,
    lastLogin: "2024-03-17T10:30:00",
    createdAt: "2024-01-01T00:00:00",
  },
  {
    id: 2,
    memberId: "PREACH001",
    fullName: "Pastor Michael Johnson",
    email: "michael.johnson@church.com",
    role: "preacher",
    phoneNumber: "08234567890",
    isActive: true,
    lastLogin: "2024-03-17T09:15:00",
    createdAt: "2024-01-05T00:00:00",
  },
  {
    id: 3,
    memberId: "MEM001",
    fullName: "John Smith",
    email: "john.smith@member.com",
    role: "member",
    phoneNumber: "08345678901",
    isActive: true,
    lastLogin: "2024-03-17T07:45:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 4,
    memberId: "MEM002",
    fullName: "Sarah Johnson",
    email: "sarah.johnson@member.com",
    role: "member",
    phoneNumber: "08456789012",
    isActive: true,
    lastLogin: "2024-03-16T14:20:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 5,
    memberId: "MEM003",
    fullName: "David Williams",
    email: "david.williams@member.com",
    role: "member",
    phoneNumber: "08567890123",
    isActive: true,
    lastLogin: "2024-03-17T06:50:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 6,
    memberId: "MEM004",
    fullName: "Emily Davis",
    email: "emily.davis@member.com",
    role: "member",
    phoneNumber: "08678901234",
    isActive: true,
    lastLogin: "2024-03-15T11:30:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 7,
    memberId: "MEM005",
    fullName: "James Brown",
    email: "james.brown@member.com",
    role: "member",
    phoneNumber: "08789012345",
    isActive: false,
    lastLogin: "2024-03-10T13:00:00",
    createdAt: "2024-01-15T00:00:00",
  },
  {
    id: 8,
    memberId: "PREACH002",
    fullName: "Rev. Patricia Anderson",
    email: "patricia.anderson@church.com",
    role: "preacher",
    phoneNumber: "08890123456",
    isActive: true,
    lastLogin: "2024-03-17T08:00:00",
    createdAt: "2024-01-10T00:00:00",
  },
];

// Mock Events
export const mockEvents: Event[] = [
  {
    id: 1,
    eventCode: "EVT001",
    eventName: "Sunday Worship Service",
    description: "Weekly Sunday morning worship and praise service",
    preacherId: 2,
    season: "2024 Season",
    eventType: "worship",
    isActive: true,
    createdAt: "2024-01-05T00:00:00",
  },
  {
    id: 2,
    eventCode: "EVT002",
    eventName: "Wednesday Prayer Meeting",
    description: "Midweek prayer and intercession gathering",
    preacherId: 2,
    season: "2024 Season",
    eventType: "meeting",
    isActive: true,
    createdAt: "2024-01-05T00:00:00",
  },
  {
    id: 3,
    eventCode: "EVT003",
    eventName: "Bible Study Group",
    description: "In-depth study of Scripture and Christian teachings",
    preacherId: 8,
    season: "2024 Season",
    eventType: "study",
    isActive: true,
    createdAt: "2024-01-05T00:00:00",
  },
  {
    id: 4,
    eventCode: "EVT004",
    eventName: "Youth Fellowship",
    description: "Fellowship and spiritual growth for young adults",
    preacherId: 8,
    season: "2024 Season",
    eventType: "fellowship",
    isActive: true,
    createdAt: "2024-01-05T00:00:00",
  },
];

// Mock Event Enrollments
export const mockEventEnrollments: EventEnrollment[] = [
  { id: 1, eventId: 1, userId: 3, enrollmentDate: "2024-01-15", isActive: true },
  { id: 2, eventId: 1, userId: 4, enrollmentDate: "2024-01-15", isActive: true },
  { id: 3, eventId: 1, userId: 5, enrollmentDate: "2024-01-15", isActive: true },
  { id: 4, eventId: 1, userId: 6, enrollmentDate: "2024-01-15", isActive: true },
  { id: 5, eventId: 1, userId: 7, enrollmentDate: "2024-01-15", isActive: true },
  { id: 6, eventId: 2, userId: 3, enrollmentDate: "2024-01-15", isActive: true },
  { id: 7, eventId: 2, userId: 4, enrollmentDate: "2024-01-15", isActive: true },
  { id: 8, eventId: 2, userId: 5, enrollmentDate: "2024-01-15", isActive: true },
  { id: 9, eventId: 3, userId: 6, enrollmentDate: "2024-01-15", isActive: true },
  { id: 10, eventId: 3, userId: 7, enrollmentDate: "2024-01-15", isActive: true },
  { id: 11, eventId: 4, userId: 3, enrollmentDate: "2024-01-15", isActive: true },
  { id: 12, eventId: 4, userId: 4, enrollmentDate: "2024-01-15", isActive: true },
];

// Mock Attendances - Generate for last 7 days
export const mockAttendances: Attendance[] = (() => {
  const attendances: Attendance[] = [];
  const statuses: Array<"present" | "late" | "excused" | "sick" | "absent"> = [
    "present",
    "late",
    "excused",
    "sick",
    "absent",
  ];
  let id = 1;

  // Generate attendance for last 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split("T")[0];

    // Generate for weekdays (events can happen any day)
    if (date.getDay() >= 0 && date.getDay() <= 6) {
      // Generate for each member in each event
      for (let eventId = 1; eventId <= 2; eventId++) {
        for (let userId = 3; userId <= 7; userId++) {
          const isEnrolled = mockEventEnrollments.some(
            (e) => e.eventId === eventId && e.userId === userId && e.isActive
          );

          if (isEnrolled) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const hour = 8 + Math.floor(Math.random() * 3);
            const minute = Math.floor(Math.random() * 60);

            attendances.push({
              id: id++,
              userId,
              eventId,
              attendanceDate: dateStr,
              checkInTime: `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
              checkOutTime: `${dateStr}T${String(hour + 1).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00`,
              status,
              confidenceScore: Math.random() * (99.99 - 85.5) + 85.5,
              livenessVerified: Math.random() > 0.1,
              deviceInfo: "Web Browser - Chrome",
              createdAt: `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
            });
          }
        }
      }
    }
  }

  return attendances;
})();

// Mock Activity Logs
export const mockActivityLogs: ActivityLog[] = [
  {
    id: 1,
    userId: 3,
    action: "CHECK_IN",
    entityType: "Attendance",
    entityId: 1,
    description: "John Smith checked in to Sunday Worship Service",
    createdAt: "2024-03-17T07:45:00",
  },
  {
    id: 2,
    userId: 4,
    action: "CHECK_IN",
    entityType: "Attendance",
    entityId: 2,
    description: "Sarah Johnson checked in to Sunday Worship Service",
    createdAt: "2024-03-17T07:50:00",
  },
  {
    id: 3,
    userId: 5,
    action: "CHECK_IN",
    entityType: "Attendance",
    entityId: 3,
    description: "David Williams checked in to Wednesday Prayer Meeting",
    createdAt: "2024-03-17T07:42:00",
  },
  {
    id: 4,
    userId: 6,
    action: "CHECK_IN",
    entityType: "Attendance",
    entityId: 4,
    description: "Emily Davis checked in to Bible Study Group",
    createdAt: "2024-03-17T07:30:00",
  },
  {
    id: 5,
    userId: 1,
    action: "CREATE",
    entityType: "Event",
    entityId: 4,
    description: "Admin created new event: Youth Fellowship",
    createdAt: "2024-03-16T14:20:00",
  },
];

// Mock Achievements/Badges - Faith-based
export const mockAchievements: Achievement[] = [
  {
    id: "faithful-attendee",
    name: "Faithful Attendee",
    description: "100% attendance for one month",
    icon: "✝️",
  },
  {
    id: "devoted-member",
    name: "Devoted Member",
    description: "Always arrive early to events",
    icon: "🙏",
  },
  {
    id: "growing-in-faith",
    name: "Growing in Faith",
    description: "Highest improvement in attendance",
    icon: "📈",
  },
  {
    id: "prayer-warrior",
    name: "Prayer Warrior",
    description: "30 consecutive days of attendance",
    icon: "⛪",
  },
  {
    id: "dedicated-disciple",
    name: "Dedicated Disciple",
    description: "Attending 4 or more events",
    icon: "⭐",
  },
];

// Mock User Achievements (which members have which badges)
export const mockUserAchievements: Record<number, string[]> = {
  3: ["faithful-attendee", "devoted-member", "prayer-warrior"],
  4: ["faithful-attendee", "dedicated-disciple"],
  5: ["growing-in-faith"],
  6: ["faithful-attendee", "devoted-member"],
  7: [],
};

// Helper functions
export function getEventById(id: number): Event | undefined {
  return mockEvents.find((e) => e.id === id);
}

export function getUserById(id: number): User | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function getMembersInEvent(eventId: number): User[] {
  const enrollmentUserIds = mockEventEnrollments
    .filter((e) => e.eventId === eventId && e.isActive)
    .map((e) => e.userId);
  return mockUsers.filter((u) => enrollmentUserIds.includes(u.id));
}

export function getEventsForUser(userId: number): Event[] {
  const eventIds = mockEventEnrollments
    .filter((e) => e.userId === userId && e.isActive)
    .map((e) => e.eventId);
  return mockEvents.filter((e) => eventIds.includes(e.id));
}

export function getAttendanceStats(userId?: number, eventId?: number) {
  const filtered = mockAttendances.filter(
    (a) => (!userId || a.userId === userId) && (!eventId || a.eventId === eventId)
  );

  const stats = {
    totalAttendance: filtered.length,
    present: filtered.filter((a) => a.status === "present").length,
    late: filtered.filter((a) => a.status === "late").length,
    excused: filtered.filter((a) => a.status === "excused").length,
    sick: filtered.filter((a) => a.status === "sick").length,
    absent: filtered.filter((a) => a.status === "absent").length,
  };

  const presentCount = stats.present + stats.late;
  const attendancePercentage = stats.totalAttendance > 0
    ? ((presentCount / stats.totalAttendance) * 100).toFixed(2)
    : "0.00";

  return {
    ...stats,
    attendancePercentage: parseFloat(attendancePercentage),
  };
}

export function getTodayAttendanceStats(): {
  checkedIn: number;
  pending: number;
  absent: number;
} {
  const today = new Date().toISOString().split("T")[0];
  const todayAttendances = mockAttendances.filter(
    (a) => a.attendanceDate === today
  );
  
  const totalMembers = mockUsers.filter((u) => u.role === "member" && u.isActive).length;

  return {
    checkedIn: todayAttendances.filter(
      (a) => a.status === "present" || a.status === "late"
    ).length,
    pending: totalMembers - todayAttendances.length,
    absent: todayAttendances.filter((a) => a.status === "absent").length,
  };
}

export function getRecentActivities(limit: number = 10): ActivityLog[] {
  return mockActivityLogs.slice(0, limit);
}

export function getAttendanceTrend(days: number = 7, eventId?: number) {
  const trend: Record<string, number> = {};

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayAttendances = mockAttendances.filter((a) => {
      const match = a.attendanceDate === dateStr;
      return eventId ? match && a.eventId === eventId : match;
    });

    const presentCount = dayAttendances.filter(
      (a) => a.status === "present" || a.status === "late"
    ).length;

    trend[dateStr] = presentCount;
  }

  return trend;
}

export function getLeaderboardData(eventId?: number, period: "week" | "month" | "season" = "season") {
  const members = mockUsers.filter((u) => u.role === "member" && u.isActive);

  return members
    .map((member) => {
      const stats = getAttendanceStats(member.id, eventId);
      const achievements = mockUserAchievements[member.id] || [];

      return {
        userId: member.id,
        memberId: member.memberId,
        fullName: member.fullName,
        totalPresent: stats.present,
        totalLate: stats.late,
        attendancePercentage: stats.attendancePercentage,
        achievements,
      };
    })
    .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}
