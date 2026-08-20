import { createContext, useContext, useEffect, useState } from "react";
import { getSessionUser } from "@/lib/auth";

export type Language = "en" | "id";

export type TranslationKey =
  | "dashboard" | "members" | "events" | "regularEvent" | "attendance"
  | "announcements" | "reports" | "leaderboard" | "divisions" | "auditLogs"
  | "system" | "settings" | "qrManager" | "home" | "checkIn" | "myAttendance"
  | "schedules" | "profile" | "questions" | "attendanceHome" | "registration"
  | "faceRegistration" | "faceAttendance" | "language" | "english" | "indonesian"
  | "accountSettings" | "manageProfileSecurity" | "profileInfo" | "password"
  | "activity" | "saveChanges" | "languageDescription" | "languageSaved"
  | "profileUpdated" | "logout" | "morning" | "afternoon" | "evening"
  | "adminDashboard" | "superAdminDashboard" | "welcome" | "totalMember" | "activeEvent"
  | "presentToday" | "attendanceRate" | "todayAttendance" | "present" | "pending" | "absent"
  | "attendanceTrend" | "recentActivity" | "noData" | "noActivity" | "userComposition"
  | "manage" | "total" | "quickActions" | "viewAll" | "systemActivity" | "point" | "streak"
  | "registeredSessions" | "upcomingSchedules" | "noUpcomingSchedules" | "noAnnouncements" | "important"
  | "eventCount" | "dateCount" | "manageEventShort" | "noEventsInRange" | "clickCalendarToSelect" | "maxEventsReached"
  | "addAdmin" | "addAdminDescription" | "adminName" | "adminEmail" | "adminPassword" | "adminCreated"
  | "secureConnection" | "secureRegistration" | "secureAttendanceSystem" | "emailAddress" | "rememberMe"
  | "forgotPassword" | "encryptedSecure" | "loggingIn" | "login" | "twoFactorAuthentication"
  | "twoFactorPrompt" | "verifying" | "verify" | "backToLogin" | "createAccountPrompt"
  | "registrationSuccess" | "fullName" | "phoneNumber" | "organizationRole" | "confirmPassword"
  | "weak" | "medium" | "strong" | "minCharacters" | "lowercase" | "uppercase" | "number"
  | "specialCharacter" | "passwordMismatch" | "agreeTo" | "termsAndConditions" | "privacyPolicy"
  | "and" | "registerNow" | "alreadyHaveAccount" | "signIn" | "pageNotFound" | "pageMoved"
  | "back" | "error" | "success" | "validation" | "loading" | "search" | "filter"
  | "all" | "clear" | "cancel" | "close" | "confirm" | "delete" | "edit" | "add" | "save"
  | "noResults" | "required" | "verifyCode" | "resetPassword" | "sendResetCode" | "resendCode" | "newPassword"
  | "verificationCode" | "minimumCharacters" | "accessDenied" | "accessDeniedDescription" | "backToHome"
  | "topRankings" | "topThree" | "leaderboardTable" | "rank" | "name" | "category"
  | "management" | "createAnnouncement" | "announcementManagement" | "manageAnnouncements"
  | "announcementCreated" | "announcementUpdated" | "announcementDeleted" | "announcementLoadFailed"
  | "announcementStatusFailed" | "announcementPinFailed" | "announcementSaveFailed" | "announcementDeleteFailed"
  | "titleAndBodyRequired" | "announcementVisibleToMembers" | "newAnnouncement" | "announcementTitle"
  | "announcementBody" | "writeAnnouncement" | "markImportant" | "publish" | "published" | "unpin" | "pin"
  | "inactive" | "off" | "by" | "systemUser" | "permanentlyDeleted" | "cannotUndo" | "leaderboardAdmin"
  | "allMembersRanking" | "memberPointsData" | "completeMemberRanking" | "memberId" | "lastUpdated" | "points"
  | "qrManagerDescription" | "generateQr" | "selectEventToViewTokens" | "availableQrTokens" | "noTokensForEvent"
  | "viewQr" | "copyToken" | "qrAttendanceCode" | "scanQrForCheckIn" | "validUntil" | "downloadQr"
  | "qrTokenGenerated" | "shareTokenWithMembers" | "tokenCopied" | "qrDownloaded" | "generateAgain"
  | "validDate" | "leaveBlankForToday" | "validDurationMinutes" | "minutes" | "hours" | "day"
  | "scheduleAttendance" | "scheduleAttendanceDescription" | "todayAlreadyActive" | "activateToday"
  | "selectDateInstruction" | "addDate" | "saving" | "scheduledDates" | "noScheduledDates"
  | "clickDateToSelect" | "selectedDate" | "today" | "removeFromSchedule" | "continuePrompt"
  | "scheduleManagement" | "manageOrganizationSchedules" | "addSchedule" | "allEvents" | "upcoming"
  | "date" | "event" | "time" | "location" | "notes" | "description" | "actions" | "noSchedules" | "scheduleDetails"
  | "startTime" | "endTime" | "placeOrRoom" | "additionalInformation" | "attendanceManagement"
  | "viewManageAttendance" | "homeAttendance" | "exportCsv" | "manualEntry" | "totalRecords" | "late"
  | "excusedSick" | "searchNameIdEmail" | "filterByEvent" | "filterByStatus" | "filterByDate"
  | "showingRecords" | "memberName" | "checkIn" | "checkOut" | "actionsLabel" | "noDataToExport"
  | "reportExported" | "attendanceDataLoadFailed" | "attendanceRecordDeleted" | "attendanceRecordUpdated"
  | "attendanceRecordCreated" | "attendanceRecordSaveFailed" | "deleteAttendanceRecordFailed" | "attendanceRequired"
  | "memberRequired" | "eventRequired" | "checkInTimeRequired" | "statusRequired" | "unknown"
  | "attendanceNotOpen" | "attendanceNotOpenDescription" | "backHome" | "attendanceControlCenter"
  | "attendanceDashboardTitle" | "attendanceDashboardDescription" | "startRegistration" | "startAttendance"
  | "statusToday" | "liveAttendanceSummary" | "activeMember" | "checkedIn" | "pendingPeople" | "absentPeople"
  | "secureAttendanceWorkspace" | "attendanceHomeTitle" | "openAttendance" | "activeEvent" | "noActiveEvents"
  | "attendanceTrendChart" | "attendanceByEvent" | "noEventData" | "attendanceStatusDistribution" | "sick"
  | "eventManagement" | "manageEvent" | "eventLocked" | "lockEvent" | "unlockEvent" | "saveEvent" | "deleteEvent"
  | "eventType" | "customEvent" | "selectEventType" | "selectRegularEvent" | "customEventName" | "themeDescription"
  | "participantAccess" | "selectParticipantAccess" | "everyoneMembers" | "selectedMembers" | "excludedMembers"
  | "selectAll" | "memberSearch" | "loadingMembers" | "noActiveMembers" | "noMatchingMembers" | "questionGameOptional"
  | "addQuestion" | "maxQuestions" | "noQuestions" | "questionNumber" | "clue" | "answer" | "uppercaseHint"
  | "generatePuzzle" | "regeneratePuzzle" | "puzzleReady" | "timeConflict" | "eventNameRequired" | "eventTimeRequired"
  | "eventTimeOrder" | "emailRequired" | "invalidEmail" | "resetCodeSent" | "enterResetCode" | "resetPasswordPrompt"
  | "passwordResetSuccess" | "resetPasswordFailed" | "profileLoadFailed" | "profileNameRequired" | "passwordFieldsRequired"
  | "updateProfileFailed" | "attendanceReport" | "filterByEventLabel" | "allEventsLabel" | "allStatuses" | "recordsShown"
  | "memberLabel" | "status" | "excused" | "fileTooLarge" | "student" | "other" | "active"
  | "noMembersFound" | "systemRole" | "userMember" | "adminOperational" | "roleAccessDescription" | "emailCannotChange"
  | "show" | "hide" | "activeSessionReset" | "deleteMemberConfirmation" | "permanentDelete" | "backToDashboard"
  | "activeLiveness" | "randomChallengeAttendance" | "attendanceCheck" | "faceDetectionLivenessRecognition" | "challenge" | "timeRemaining" | "seconds" | "startActiveAttendance"
  | "silakanAttendance" | "questionsAttendanceOnly" | "noQuestionsToday" | "alreadyAnsweredToday" | "bibleStudyQuiz" | "multipleChoice" | "question" | "completed"
  | "findHiddenWord" | "answeredCorrectly" | "allTime" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "thisYear" | "customRange"
  | "generated" | "period" | "records" | "noReports" | "reportMemberId" | "reportName" | "reportAttendance" | "reportCheckIn" | "leader"
  | "noDivisions" | "addFirst" | "divisionDescription" | "notAssigned" | "regularEventsDescription" | "addRegularEvent" | "eventCode" | "eventName" | "action"
  | "urlLogoOptional" | "profilePhotoUrl" | "lateThreshold" | "minutesAfterSchedule" | "attendanceWindow" | "attendanceWindowDescription" | "qrValid" | "selfCheckIn" | "selfCheckInDescription"
  | "emailNotifications" | "emailNotificationsDescription" | "attendanceStreak" | "attendanceStreakDescription" | "defaultRankingPeriod" | "thisWeekLabel" | "thisMonthLabel" | "sixMonths"
  | "autoBackup" | "autoBackupDescription" | "maintenanceMode" | "maintenanceDescription" | "maintenanceActive" | "todayAttendanceTitle" | "todayLabel" | "number"
  | "currentPassword" | "confirmNewPassword" | "passwordRequirements" | "nextQuestion" | "generateReport"
  | "generatingApp" | "generationNotice" | "rolePreacher" | "roleChair" | "roleViceChair" | "roleDivisionHead"
  | "roleDivisionMember" | "roleParticipant" | "fullNamePlaceholder" | "passwordMismatchShort" | "accountActivity"
  | "emailCannotChange" | "actionDescription" | "attendanceRateLabel" | "processing" | "checkInNow" | "pastLabel";

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    dashboard: "Dashboard", members: "Members", events: "Events", regularEvent: "Regular Event",
    attendance: "Attendance", announcements: "Announcements", reports: "Reports", leaderboard: "Leaderboard",
    divisions: "Divisions", auditLogs: "Audit Logs", system: "System", settings: "Settings",
    qrManager: "QR Manager", home: "Home", checkIn: "Check In", myAttendance: "My Attendance",
    schedules: "Schedules", profile: "Profile", questions: "Answer Questions", attendanceHome: "Attendance Home",
    registration: "Registration", faceRegistration: "Face Registration", faceAttendance: "Face Attendance",
    language: "Language", english: "English", indonesian: "Bahasa Indonesia", accountSettings: "Account Settings",
    manageProfileSecurity: "Manage your profile and account security", profileInfo: "Profile Information",
    password: "Password", activity: "Activity", saveChanges: "Save Changes",
    languageDescription: "Choose the language used throughout the application.", languageSaved: "Language preference saved.",
    profileUpdated: "Profile updated successfully.", logout: "Log out", morning: "Good Morning", afternoon: "Good Afternoon", evening: "Good Evening",
    adminDashboard: "Admin Dashboard", superAdminDashboard: "Super Admin Dashboard", welcome: "Welcome",
    totalMember: "Total Members", activeEvent: "Active Events", presentToday: "Present Today", attendanceRate: "Attendance Rate",
    todayAttendance: "Today's Attendance", present: "Present", pending: "Pending", absent: "Absent", attendanceTrend: "7-Day Attendance Trend",
    recentActivity: "Recent Activity", noData: "No data yet", noActivity: "No activity", userComposition: "User Composition",
    manage: "Manage", total: "Total", quickActions: "Quick Actions", viewAll: "View All", systemActivity: "Recent System Activity",
    point: "Points", streak: "Streak", registeredSessions: "total registered sessions", upcomingSchedules: "Upcoming Schedules",
    noUpcomingSchedules: "No upcoming schedules", noAnnouncements: "No announcements", important: "Important", eventCount: "Scheduled Events", dateCount: "Dates", manageEventShort: "Manage Event", noEventsInRange: "No events in this range", clickCalendarToSelect: "Click a date on the calendar to select it", maxEventsReached: "Maximum 4 events per day reached.",
    addAdmin: "Add Admin", addAdminDescription: "Create a dedicated admin account that can log in to the admin dashboard.", adminName: "Admin Name", adminEmail: "Admin Gmail", adminPassword: "Admin Password", adminCreated: "Admin account created successfully.",
    secureConnection: "Secure Connection", secureRegistration: "Secure Registration", secureAttendanceSystem: "Secure Attendance Management System",
    emailAddress: "Email Address", rememberMe: "Remember me", forgotPassword: "Forgot Password?", encryptedSecure: "Your data is encrypted and secure",
    loggingIn: "Logging in...", login: "Login", twoFactorAuthentication: "Two-Factor Authentication", twoFactorPrompt: "Enter the 6-digit code from your authenticator app",
    verifying: "Verifying...", verify: "Verify", backToLogin: "Back to Login", createAccountPrompt: "Create an account to start recording attendance",
    registrationSuccess: "Registration successful! You will be redirected to the login page...", fullName: "Full Name", phoneNumber: "Phone Number",
    organizationRole: "Organization Role", confirmPassword: "Confirm Password", weak: "Weak", medium: "Medium", strong: "Strong",
    minCharacters: "At least 8 characters", lowercase: "Lowercase", uppercase: "Uppercase", number: "Number", specialCharacter: "Special character",
    passwordMismatch: "Passwords do not match", agreeTo: "I agree to", termsAndConditions: "Terms & Conditions", privacyPolicy: "Privacy Policy",
    and: "and", registerNow: "Register Now", alreadyHaveAccount: "Already have an account?", signIn: "Sign in", pageNotFound: "Page Not Found",
    pageMoved: "The page you are looking for does not exist or has been moved.", back: "Back", error: "Error", success: "Success", validation: "Validation",
    loading: "Loading...", search: "Search", filter: "Filter", all: "All", clear: "Clear", cancel: "Cancel", close: "Close", confirm: "Confirm",
    delete: "Delete", edit: "Edit", add: "Add", save: "Save", noResults: "No results", required: "Required", verifyCode: "Verify Code",
    resetPassword: "Reset Password", sendResetCode: "Send Reset Code", resendCode: "Resend Code", newPassword: "New Password", verificationCode: "Verification Code",
    minimumCharacters: "Minimum 8 characters", accessDenied: "Access Denied", accessDeniedDescription: "You do not have permission to access this page. Contact a super admin if you believe this is an error.", backToHome: "Back to Home",
    topRankings: "Top Member Points Rankings", topThree: "Top 3 Ranking", leaderboardTable: "Leaderboard table", rank: "Rank", name: "Name", category: "Category",
    management: "Management", createAnnouncement: "Create Announcement", announcementManagement: "Announcement Management", manageAnnouncements: "Create and manage announcements for members",
    announcementCreated: "Announcement created", announcementUpdated: "Announcement updated", announcementDeleted: "Announcement deleted", announcementLoadFailed: "Failed to load announcements",
    announcementStatusFailed: "Failed to update status", announcementPinFailed: "Failed to update pin", announcementSaveFailed: "Failed to save", announcementDeleteFailed: "Failed to delete",
    titleAndBodyRequired: "Title and body are required", announcementVisibleToMembers: "This announcement will be visible to all members", newAnnouncement: "New Announcement", announcementTitle: "Announcement Title",
    announcementBody: "Announcement Body", writeAnnouncement: "Write your announcement here...", markImportant: "Mark as important", publish: "Publish", published: "Published", unpin: "Unpin", pin: "Pin",
    inactive: "Inactive", off: "Off", by: "By", systemUser: "System", permanentlyDeleted: "The announcement will be permanently deleted.", cannotUndo: "This action cannot be undone.", leaderboardAdmin: "Admin Leaderboard",
    allMembersRanking: "Ranking of all members by accumulated points", memberPointsData: "No member points data", completeMemberRanking: "Complete Member Ranking", memberId: "Member ID", lastUpdated: "Last Updated", points: "Points",
    qrManagerDescription: "Generate and manage QR tokens for attendance", generateQr: "Generate QR", selectEventToViewTokens: "Select an event to view tokens...", availableQrTokens: "Available QR Tokens", noTokensForEvent: "No tokens for this event",
    viewQr: "View QR", copyToken: "Copy Token", qrAttendanceCode: "Attendance QR Code", scanQrForCheckIn: "Scan this QR to check in to the event", validUntil: "Valid until", downloadQr: "Download QR",
    qrTokenGenerated: "QR token generated successfully", shareTokenWithMembers: "Share the token with members", tokenCopied: "Token copied to clipboard", qrDownloaded: "QR Code downloaded", generateAgain: "Generate Again",
    validDate: "Valid Date", leaveBlankForToday: "Leave blank for today", validDurationMinutes: "Validity Duration (minutes)", minutes: "minutes", hours: "hours", day: "day",
    scheduleAttendance: "Schedule Attendance", scheduleAttendanceDescription: "Choose when attendance opens. Users can only check in on selected dates.", todayAlreadyActive: "Today is already active", activateToday: "Activate Today",
    selectDateInstruction: "Click a date to select it, then click Add Date to save the schedule.", addDate: "Add Date", saving: "Saving...", scheduledDates: "Scheduled Dates", noScheduledDates: "No scheduled dates",
    clickDateToSelect: "Click a date on the calendar to select it", selectedDate: "Selected", today: "Today", removeFromSchedule: "Remove from schedule", continuePrompt: "Continue?",
    scheduleManagement: "Schedule Management", manageOrganizationSchedules: "Manage organization activity schedules", addSchedule: "Add Schedule", allEvents: "All Events", upcoming: "Upcoming",
    date: "Date", event: "Event", time: "Time", location: "Location", notes: "Notes", description: "Description", actions: "Actions", noSchedules: "No schedules", scheduleDetails: "Enter schedule details",
    startTime: "Start Time", endTime: "End Time", placeOrRoom: "Place / room...", additionalInformation: "Additional information...", attendanceManagement: "Attendance Management",
    viewManageAttendance: "View and manage attendance records", homeAttendance: "Attendance Home", exportCsv: "Export CSV", manualEntry: "Manual Entry", totalRecords: "Total Records", late: "Late",
    excusedSick: "Excused / Sick", searchNameIdEmail: "Search by name, ID or email...", filterByEvent: "Filter by event", filterByStatus: "Filter by status", filterByDate: "Filter by date",
    showingRecords: "Showing records", memberName: "Member Name", checkOut: "Check-out", actionsLabel: "Actions", noDataToExport: "No data to export",
    reportExported: "Report exported successfully", attendanceDataLoadFailed: "Failed to load attendance data", attendanceRecordDeleted: "Attendance record deleted successfully", attendanceRecordUpdated: "Attendance record updated successfully",
    attendanceRecordCreated: "Attendance record created successfully", attendanceRecordSaveFailed: "Failed to save attendance record", deleteAttendanceRecordFailed: "Failed to delete attendance record", attendanceRequired: "Date is required",
    memberRequired: "Member is required", eventRequired: "Event is required", checkInTimeRequired: "Check-in time is required", statusRequired: "Status is required", unknown: "Unknown",
    attendanceNotOpen: "Attendance Not Open", attendanceNotOpenDescription: "Attendance has not been scheduled today. Please try again on a scheduled date.", backHome: "Back Home", attendanceControlCenter: "Attendance Control Center",
    attendanceDashboardTitle: "Attendance Dashboard", attendanceDashboardDescription: "Choose an action to register a new member or run attendance from this dashboard.", startRegistration: "Start Registration", startAttendance: "Start Attendance",
    statusToday: "Today's Status", liveAttendanceSummary: "Live Attendance Summary", activeMember: "Active Members", checkedIn: "Checked In", pendingPeople: "Pending", absentPeople: "Absent",
    secureAttendanceWorkspace: "Secure Attendance Workspace", attendanceHomeTitle: "Attendance Home", openAttendance: "Open Attendance", noActiveEvents: "No active events",
    attendanceTrendChart: "Attendance Trend", attendanceByEvent: "Attendance by Event", noEventData: "No event data available", attendanceStatusDistribution: "Attendance Status Distribution", sick: "Sick", excused: "Excused",
    eventManagement: "Event Management", manageEvent: "Manage Event", eventLocked: "Locked", lockEvent: "Lock event", unlockEvent: "Unlock event", saveEvent: "Save Event", deleteEvent: "Delete Event",
    eventType: "Event Type", customEvent: "Custom Event", selectEventType: "Select event type", selectRegularEvent: "Select regular event", customEventName: "Custom Event Name", themeDescription: "Description / Theme",
    participantAccess: "Participant Access Control", selectParticipantAccess: "Select participant access", everyoneMembers: "Everyone (All Members)", selectedMembers: "Selected Members (Only Selected)", excludedMembers: "Excluded Members (Everyone Except Selected)",
    selectAll: "Select All", memberSearch: "Search member name or ID...", loadingMembers: "Loading members...", noActiveMembers: "No active members", noMatchingMembers: "No matching members", questionGameOptional: "Question Game (Optional)",
    addQuestion: "Add Question", maxQuestions: "Maximum 3 questions per event", noQuestions: "No questions. Add a question to create a Word Search game.", questionNumber: "Question", clue: "Clue", answer: "Answer", uppercaseHint: "uppercase letters",
    generatePuzzle: "Generate Puzzle", regeneratePuzzle: "Regenerate Puzzle", puzzleReady: "Puzzle ready", timeConflict: "Time conflict", eventNameRequired: "Event name is required", eventTimeRequired: "Start and end time are required",
    eventTimeOrder: "Start time must be earlier than end time", emailRequired: "Email is required", invalidEmail: "Invalid email format", resetCodeSent: "Reset code sent! Check your email.", enterResetCode: "Enter the 6-digit code", resetPasswordPrompt: "Create a new password for your account",
    passwordResetSuccess: "Password reset successfully! Redirecting to login...", resetPasswordFailed: "Failed to reset password. Please try again.", profileLoadFailed: "Failed to load profile", profileNameRequired: "Name is required", passwordFieldsRequired: "All password fields are required",
    updateProfileFailed: "Failed to update profile", attendanceReport: "Attendance Report", filterByEventLabel: "Filter by event", allEventsLabel: "All Events", allStatuses: "All Statuses", recordsShown: "Showing records", memberLabel: "Member", status: "Status", excused: "Excused", fileTooLarge: "Maximum photo size is 2MB.",
    noMembersFound: "No members found", systemRole: "System Role", userMember: "User (Member)", adminOperational: "Admin (Operational)", roleAccessDescription: "System role determines dashboard access", emailCannotChange: "Email cannot be changed", show: "Show", hide: "Hide", activeSessionReset: "The user's active sessions will be removed after the password is reset.", deleteMemberConfirmation: "Delete {name}? All attendance data will also be deleted. This action cannot be undone.", permanentDelete: "Delete Permanently", backToDashboard: "Back to Dashboard",
    allTime: "All Time", thisWeek: "This Week", lastWeek: "Last Week", thisMonth: "This Month", lastMonth: "Last Month", thisYear: "This Year", customRange: "Custom Range", generated: "Generated", period: "Period", records: "Records", noReports: "No reports generated yet", reportMemberId: "Member ID", reportName: "Name", reportAttendance: "Attendance", reportCheckIn: "Check-in", generateReport: "Generate Report", until: "to",
    eventManagement: "Event Management", manageEvent: "Manage Event", eventLocked: "Locked", lockEvent: "Lock event", unlockEvent: "Unlock event", saveEvent: "Save Event", deleteEvent: "Delete Event", eventType: "Event Type", customEvent: "Custom Event", selectEventType: "Select event type", selectRegularEvent: "Select regular event", customEventName: "Custom Event Name", themeDescription: "Description / Theme", participantAccess: "Participant Access Control", selectParticipantAccess: "Select participant access", everyoneMembers: "Everyone (All Members)", selectedMembers: "Selected Members (Only Selected)", excludedMembers: "Excluded Members (Everyone Except Selected)", selectAll: "Select All", memberSearch: "Search member name or ID...", loadingMembers: "Loading members...", noActiveMembers: "No active members", noMatchingMembers: "No matching members", questionGameOptional: "Question Game (Optional)", addQuestion: "Add Question", maxQuestions: "Maximum 3 questions per event", noQuestions: "No questions. Add a question to create a Word Search game.", questionNumber: "Question", clue: "Clue", answer: "Answer", uppercaseHint: "uppercase letters", generatePuzzle: "Generate Puzzle", regeneratePuzzle: "Regenerate Puzzle", puzzleReady: "Puzzle ready", timeConflict: "Time conflict", eventNameRequired: "Event name is required", eventTimeRequired: "Start and end time are required", eventTimeOrder: "Start time must be earlier than end time",
  },
  id: {
    dashboard: "Dashboard", members: "Members", events: "Events", regularEvent: "Regular Event", 
    student: "Student", other: "Other", active: "Active",
    noMembersFound: "No members found", systemRole: "System Role", userMember: "User (Member)", adminOperational: "Admin (Operational)", roleAccessDescription: "System role determines dashboard access",
    emailCannotChange: "Email cannot be changed", show: "Show", hide: "Hide", activeSessionReset: "The user's active sessions will be removed after the password is reset.",
    deleteMemberConfirmation: "Delete {name}? All attendance data will also be deleted. This action cannot be undone.", permanentDelete: "Delete Permanently", backToDashboard: "Back to Dashboard",
    activeLiveness: "Active Liveness", randomChallengeAttendance: "Attendance with random challenge", attendanceCheck: "Attendance Check", faceDetectionLivenessRecognition: "Face Detection to Active Liveness to Recognition",
    challenge: "Challenge", timeRemaining: "Time remaining", seconds: "seconds", startActiveAttendance: "Start Active Attendance", silakanAttendance: "Please complete attendance first.",
    questionsAttendanceOnly: "Questions are available only for members who attended today.", noQuestionsToday: "No questions for today. Check again later.", alreadyAnsweredToday: "You have already answered today's questions. Congratulations!",
    bibleStudyQuiz: "Bible Study Quiz", multipleChoice: "Multiple Choice", question: "Question", completed: "Completed", findHiddenWord: "Find the hidden word",
    answeredCorrectly: "This question has already been answered correctly.", allTime: "All Time", thisWeek: "This Week", lastWeek: "Last Week", thisMonth: "This Month",
    lastMonth: "Last Month", thisYear: "This Year", customRange: "Custom Range", generated: "Generated", period: "Period", records: "Records", noReports: "No reports generated yet",
    reportMemberId: "Member ID", reportName: "Name", reportAttendance: "Attendance", reportCheckIn: "Check-in", leader: "Leader", noDivisions: "No divisions yet",
    addFirst: "Add First", divisionDescription: "Divisions are used to group members in the organization", notAssigned: "Not assigned", regularEventsDescription: "Recurring church or organization events",
    addRegularEvent: "Add Regular Event", eventCode: "Event Code", eventName: "Event Name", action: "Action", urlLogoOptional: "Logo URL (optional)", profilePhotoUrl: "Profile Photo URL (optional)", lateThreshold: "Late Threshold (minutes)",
    minutesAfterSchedule: "Minutes after schedule = late", attendanceWindow: "Attendance Window (minutes)", attendanceWindowDescription: "Duration attendance is open",
    qrValid: "QR Validity (minutes)", selfCheckIn: "Self Check-in", selfCheckInDescription: "Allow members to check in via button / QR", emailNotifications: "Email Notifications",
    emailNotificationsDescription: "Send email notifications for attendance events", attendanceStreak: "Attendance Streak", attendanceStreakDescription: "Calculate and display consecutive attendance streaks",
    defaultRankingPeriod: "Default Ranking Period", thisWeekLabel: "This Week", thisMonthLabel: "This Month", sixMonths: "6 Months", autoBackup: "Auto Backup",
    autoBackupDescription: "Automatically back up the database every day", maintenanceMode: "Maintenance Mode", maintenanceDescription: "Disable system access for all users except super admins",
    maintenanceActive: "Maintenance mode active - members and admins cannot log in", todayAttendanceTitle: "Today's Attendance", todayLabel: "Today", number: "No.", currentPassword: "Current Password", confirmNewPassword: "Confirm New Password", passwordRequirements: "At least 8 characters (letters, numbers, or symbols)", nextQuestion: "Next Question", generateReport: "Generate Report",
    generatingApp: "Generating your app...", generationNotice: "Watch the chat on the left for updates that might need your attention to finish generating", rolePreacher: "Preacher / Mentor", roleChair: "Chairperson", roleViceChair: "Vice Chairperson", roleDivisionHead: "Division Head", roleDivisionMember: "Division Member", roleParticipant: "Participant", fullNamePlaceholder: "Full name as shown on your ID", passwordMismatchShort: "Passwords do not match", accountActivity: "Recent Account Activity", emailCannotChange: "Email cannot be changed", actionDescription: "Description", attendanceRateLabel: "Attendance rate", processing: "Processing...", checkInNow: "Check In Now", pastLabel: "(Past)", registrationFailed: "Registration failed. Please try again.", until: "to",
    attendance: "Kehadiran", announcements: "Pengumuman", reports: "Laporan", leaderboard: "Papan Peringkat",
    divisions: "Divisi", auditLogs: "Log Audit", system: "Sistem", settings: "Pengaturan",
    dashboard: "Dasbor", members: "Anggota", events: "Event", regularEvent: "Event Rutin", 
    student: "Pelajar", other: "Lainnya", active: "Aktif",
    noMembersFound: "Anggota tidak ditemukan", systemRole: "Role Sistem", userMember: "User (Member)", adminOperational: "Admin (Operasional)", roleAccessDescription: "Role sistem menentukan hak akses dashboard",
    emailCannotChange: "Email tidak dapat diubah", show: "Tampilkan", hide: "Sembunyikan", activeSessionReset: "Sesi aktif pengguna akan dihapus setelah password direset.",
    deleteMemberConfirmation: "Hapus {name}? Seluruh data kehadiran akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.", permanentDelete: "Hapus Permanen", backToDashboard: "Kembali ke Dashboard",
    activeLiveness: "Liveness Aktif", randomChallengeAttendance: "Absensi wajah dengan challenge acak", attendanceCheck: "Pengecekan Kehadiran", faceDetectionLivenessRecognition: "Deteksi Wajah ke Liveness Aktif ke Pengenalan",
    challenge: "Tantangan", timeRemaining: "Waktu tersisa", seconds: "detik", startActiveAttendance: "Mulai Absensi Aktif", silakanAttendance: "Silakan lakukan attendance terlebih dahulu.",
    questionsAttendanceOnly: "Pertanyaan hanya tersedia untuk member yang sudah attendance hari ini.", noQuestionsToday: "Belum ada pertanyaan untuk hari ini. Cek kembali nanti.", alreadyAnsweredToday: "Anda sudah menjawab pertanyaan hari ini. Selamat!",
    bibleStudyQuiz: "Kuis Pendalaman Alkitab", multipleChoice: "Pilihan Ganda", question: "Soal", completed: "Selesai", findHiddenWord: "Temukan kata tersembunyi",
    answeredCorrectly: "Soal ini sudah dijawab dengan benar.", allTime: "Sepanjang Waktu", thisWeek: "Minggu Ini", lastWeek: "Minggu Lalu", thisMonth: "Bulan Ini",
    lastMonth: "Bulan Lalu", thisYear: "Tahun Ini", customRange: "Rentang Kustom", generated: "Dibuat", period: "Periode", records: "Data", noReports: "Belum ada laporan yang dibuat",
    reportMemberId: "ID Anggota", reportName: "Nama", reportAttendance: "Kehadiran", reportCheckIn: "Check-in", leader: "Leader", noDivisions: "Belum ada divisi",
    addFirst: "Tambah Pertama", divisionDescription: "Divisi digunakan untuk mengelompokkan anggota dalam organisasi", notAssigned: "Belum ditentukan", regularEventsDescription: "Daftar event gereja/organisasi yang bersifat berkala dan regular",
    addRegularEvent: "Tambah Event Rutin", eventCode: "Kode Event", eventName: "Nama Event", action: "Aksi", urlLogoOptional: "URL Logo (opsional)", profilePhotoUrl: "URL Foto Profil (opsional)", lateThreshold: "Batas Terlambat (menit)",
    minutesAfterSchedule: "Menit setelah jadwal = terlambat", attendanceWindow: "Window Absensi (menit)", attendanceWindowDescription: "Durasi absensi dibuka",
    qrValid: "QR Berlaku (menit)", selfCheckIn: "Self Check-in", selfCheckInDescription: "Izinkan anggota check-in sendiri via tombol / QR", emailNotifications: "Notifikasi Email",
    emailNotificationsDescription: "Kirim notifikasi email untuk event absensi", attendanceStreak: "Streak Kehadiran", attendanceStreakDescription: "Hitung dan tampilkan streak kehadiran berturut-turut",
    defaultRankingPeriod: "Periode Ranking Default", thisWeekLabel: "Minggu Ini", thisMonthLabel: "Bulan Ini", sixMonths: "6 Bulan", autoBackup: "Auto Backup",
    autoBackupDescription: "Backup database otomatis setiap hari", maintenanceMode: "Maintenance Mode", maintenanceDescription: "Nonaktifkan akses sistem untuk semua pengguna kecuali super admin",
    maintenanceActive: "Maintenance mode aktif - anggota dan admin tidak dapat login", todayAttendanceTitle: "Kehadiran Hari Ini", todayLabel: "Hari Ini", number: "No.", currentPassword: "Password Saat Ini", confirmNewPassword: "Konfirmasi Password Baru", passwordRequirements: "Minimal 8 karakter (huruf, angka, atau simbol)", nextQuestion: "Soal Berikutnya", generateReport: "Buat Laporan",
    generatingApp: "Sedang membuat aplikasi...", generationNotice: "Lihat chat di sebelah kiri untuk pembaruan yang mungkin memerlukan perhatianmu", rolePreacher: "Pengkhotbah / Pembina", roleChair: "Ketua", roleViceChair: "Wakil Ketua", roleDivisionHead: "Kepala Divisi", roleDivisionMember: "Anggota Divisi", roleParticipant: "Peserta", fullNamePlaceholder: "Nama lengkap sesuai identitas", passwordMismatchShort: "Password tidak cocok", accountActivity: "Aktivitas Akun Terakhir", emailCannotChange: "Email tidak dapat diubah", actionDescription: "Deskripsi", attendanceRateLabel: "Tingkat kehadiran", processing: "Memproses...", checkInNow: "Absen Sekarang", pastLabel: "(Sudah Lewat)", registrationFailed: "Registrasi gagal. Coba lagi.", until: "s/d",
    schedules: "Jadwal", profile: "Profil", questions: "Jawab Soal", attendanceHome: "Beranda Kehadiran",
    registration: "Registrasi", faceRegistration: "Registrasi Wajah", faceAttendance: "Absen Wajah",
    language: "Bahasa", english: "English", indonesian: "Bahasa Indonesia", accountSettings: "Pengaturan Akun",
    manageProfileSecurity: "Kelola profil dan keamanan akun kamu", profileInfo: "Informasi Profil",
    password: "Password", activity: "Aktivitas", saveChanges: "Simpan Perubahan",
    languageDescription: "Pilih bahasa yang digunakan di seluruh aplikasi.", languageSaved: "Preferensi bahasa tersimpan.",
    profileUpdated: "Profil berhasil diperbarui.", logout: "Keluar", morning: "Selamat Pagi", afternoon: "Selamat Siang", evening: "Selamat Malam",
    adminDashboard: "Dasbor Admin", superAdminDashboard: "Dasbor Super Admin", welcome: "Selamat datang",
    totalMember: "Total Member", activeEvent: "Event Aktif", presentToday: "Hadir Hari Ini", attendanceRate: "Tingkat Kehadiran",
    todayAttendance: "Kehadiran Hari Ini", present: "Hadir", pending: "Pending", absent: "Absen", attendanceTrend: "Tren Kehadiran 7 Hari",
    recentActivity: "Aktivitas Terbaru", noData: "Belum ada data", noActivity: "Tidak ada aktivitas", userComposition: "Komposisi Pengguna",
    manage: "Kelola", total: "Total", quickActions: "Aksi Cepat", viewAll: "Lihat Semua", systemActivity: "Aktivitas Sistem Terbaru",
    point: "Poin", streak: "Streak", registeredSessions: "total sesi terdaftar", upcomingSchedules: "Jadwal Mendatang",
    noUpcomingSchedules: "Tidak ada jadwal mendatang", noAnnouncements: "Tidak ada pengumuman", important: "Penting", eventCount: "Event Terjadwal", dateCount: "Tanggal", manageEventShort: "Kelola Event", noEventsInRange: "Tidak ada event pada rentang ini", clickCalendarToSelect: "Klik tanggal di kalender untuk memilih", maxEventsReached: "Maksimal 4 event per hari tercapai.",
    addAdmin: "Tambah Admin", addAdminDescription: "Buat akun admin khusus yang dapat login ke dashboard admin.", adminName: "Nama Admin", adminEmail: "Gmail Admin", adminPassword: "Password Admin", adminCreated: "Akun admin berhasil dibuat.",
    secureConnection: "Koneksi Aman", secureRegistration: "Registrasi Aman", secureAttendanceSystem: "Sistem Manajemen Kehadiran Aman",
    emailAddress: "Alamat Email", rememberMe: "Ingat saya", forgotPassword: "Lupa Password?", encryptedSecure: "Data kamu terenkripsi dan aman",
    loggingIn: "Sedang masuk...", login: "Masuk", twoFactorAuthentication: "Autentikasi Dua Faktor", twoFactorPrompt: "Masukkan kode 6 digit dari aplikasi autentikator",
    verifying: "Memverifikasi...", verify: "Verifikasi", backToLogin: "Kembali ke Login", createAccountPrompt: "Buat akun untuk mulai mencatat kehadiran",
    registrationSuccess: "Registrasi berhasil! Kamu akan diarahkan ke halaman login...", fullName: "Nama Lengkap", phoneNumber: "Nomor HP",
    organizationRole: "Jabatan dalam Organisasi", confirmPassword: "Konfirmasi Password", weak: "Lemah", medium: "Sedang", strong: "Kuat",
    minCharacters: "Minimal 8 karakter", lowercase: "Huruf kecil", uppercase: "Huruf besar", number: "Angka", specialCharacter: "Karakter khusus",
    passwordMismatch: "Password tidak cocok", agreeTo: "Saya menyetujui", termsAndConditions: "Syarat & Ketentuan", privacyPolicy: "Kebijakan Privasi",
    and: "dan", registerNow: "Daftar Sekarang", alreadyHaveAccount: "Sudah punya akun?", signIn: "Masuk", pageNotFound: "Halaman Tidak Ditemukan",
    pageMoved: "Halaman yang kamu cari tidak ada atau telah dipindahkan.", back: "Kembali", error: "Error", success: "Berhasil", validation: "Validasi",
    loading: "Memuat...", search: "Cari", filter: "Filter", all: "Semua", clear: "Bersihkan", cancel: "Batal", close: "Tutup", confirm: "Konfirmasi",
    delete: "Hapus", edit: "Edit", add: "Tambah", save: "Simpan", noResults: "Tidak ada hasil", required: "Wajib diisi", verifyCode: "Verifikasi Kode",
    resetPassword: "Reset Password", sendResetCode: "Kirim Kode Reset", resendCode: "Kirim Ulang Kode", newPassword: "Password Baru", verificationCode: "Kode Verifikasi",
    minimumCharacters: "Minimal 8 karakter", accessDenied: "Akses Ditolak", accessDeniedDescription: "Kamu tidak memiliki izin untuk mengakses halaman ini. Hubungi super admin jika kamu merasa ini adalah kesalahan.", backToHome: "Kembali ke Beranda",
    topRankings: "Peringkat Total Poin Anggota", topThree: "Peringkat 3 Teratas", leaderboardTable: "Tabel Papan Peringkat", rank: "Peringkat", name: "Nama", category: "Kategori",
    management: "Manajemen", createAnnouncement: "Buat Pengumuman", announcementManagement: "Manajemen Pengumuman", manageAnnouncements: "Buat dan kelola pengumuman untuk anggota",
    announcementCreated: "Pengumuman dibuat", announcementUpdated: "Pengumuman diperbarui", announcementDeleted: "Pengumuman dihapus", announcementLoadFailed: "Gagal memuat pengumuman",
    announcementStatusFailed: "Gagal mengubah status", announcementPinFailed: "Gagal mengubah pin", announcementSaveFailed: "Gagal menyimpan", announcementDeleteFailed: "Gagal menghapus",
    titleAndBodyRequired: "Judul dan isi wajib diisi", announcementVisibleToMembers: "Pengumuman akan tampil kepada semua anggota", newAnnouncement: "Pengumuman Baru", announcementTitle: "Judul Pengumuman",
    announcementBody: "Isi Pengumuman", writeAnnouncement: "Tulis isi pengumuman di sini...", markImportant: "Tandai sebagai penting", publish: "Publikasikan", published: "Diterbitkan", unpin: "Lepas Pin", pin: "Pin",
    inactive: "Nonaktif", off: "Nonaktif", by: "Oleh", systemUser: "Sistem", permanentlyDeleted: "Pengumuman akan dihapus permanen.", cannotUndo: "Tindakan ini tidak dapat dibatalkan.", leaderboardAdmin: "Leaderboard Admin",
    allMembersRanking: "Peringkat seluruh anggota berdasarkan akumulasi poin", memberPointsData: "Belum ada data poin anggota", completeMemberRanking: "Peringkat Lengkap Anggota", memberId: "ID Anggota", lastUpdated: "Terakhir Update", points: "Poin",
    qrManagerDescription: "Buat dan kelola token QR untuk absensi", generateQr: "Generate QR", selectEventToViewTokens: "Pilih event untuk lihat token...", availableQrTokens: "Token QR Tersedia", noTokensForEvent: "Belum ada token untuk event ini",
    viewQr: "Lihat QR", copyToken: "Salin Token", qrAttendanceCode: "QR Code Absensi", scanQrForCheckIn: "Scan QR ini untuk check-in di event", validUntil: "Berlaku hingga", downloadQr: "Download QR",
    qrTokenGenerated: "QR Token Berhasil Dibuat!", shareTokenWithMembers: "Bagikan token kepada anggota", tokenCopied: "Token telah disalin ke clipboard", qrDownloaded: "QR Code telah didownload", generateAgain: "Generate Lagi",
    validDate: "Tanggal Berlaku", leaveBlankForToday: "Kosongkan untuk hari ini", validDurationMinutes: "Durasi Berlaku (menit)", minutes: "menit", hours: "jam", day: "hari",
    scheduleAttendance: "Schedule Attendance", scheduleAttendanceDescription: "Pilih tanggal kapan attendance dibuka. User hanya bisa attendance pada tanggal yang dipilih.", todayAlreadyActive: "Hari ini sudah aktif", activateToday: "Aktifkan Hari Ini",
    selectDateInstruction: "Klik tanggal untuk memilih, lalu klik Tambahkan Tanggal untuk menyimpan jadwal.", addDate: "Tambahkan Tanggal", saving: "Menyimpan...", scheduledDates: "Tanggal Terjadwal", noScheduledDates: "Belum ada jadwal",
    clickDateToSelect: "Klik tanggal di kalender untuk memilih", selectedDate: "Dipilih", today: "Hari ini", removeFromSchedule: "Hapus dari jadwal", continuePrompt: "Lanjutkan?",
    scheduleManagement: "Manajemen Jadwal", manageOrganizationSchedules: "Kelola jadwal kegiatan organisasi", addSchedule: "Tambah Jadwal", allEvents: "Semua Event", upcoming: "Mendatang",
    date: "Tanggal", event: "Event", time: "Waktu", location: "Lokasi", notes: "Catatan", description: "Deskripsi", actions: "Aksi", noSchedules: "Tidak ada jadwal", scheduleDetails: "Isi detail jadwal kegiatan",
    startTime: "Jam Mulai", endTime: "Jam Selesai", placeOrRoom: "Nama tempat / ruangan...", additionalInformation: "Informasi tambahan...", attendanceManagement: "Manajemen Kehadiran",
    viewManageAttendance: "Lihat dan kelola catatan kehadiran", homeAttendance: "Home Attendance", exportCsv: "Export CSV", manualEntry: "Manual Entry", totalRecords: "Total Records", late: "Terlambat",
    excusedSick: "Izin / Sakit", searchNameIdEmail: "Cari nama, ID atau email...", filterByEvent: "Filter berdasarkan event", filterByStatus: "Filter berdasarkan status", filterByDate: "Filter berdasarkan tanggal",
    showingRecords: "Menampilkan data", memberName: "Nama Anggota", checkOut: "Check-out", actionsLabel: "Aksi", noDataToExport: "Tidak ada data untuk diekspor",
    reportExported: "Laporan berhasil diekspor", attendanceDataLoadFailed: "Gagal memuat data kehadiran", attendanceRecordDeleted: "Catatan kehadiran berhasil dihapus", attendanceRecordUpdated: "Catatan kehadiran berhasil diperbarui",
    attendanceRecordCreated: "Catatan kehadiran berhasil dibuat", attendanceRecordSaveFailed: "Gagal menyimpan catatan kehadiran", deleteAttendanceRecordFailed: "Gagal menghapus catatan kehadiran", attendanceRequired: "Tanggal wajib diisi",
    memberRequired: "Anggota wajib diisi", eventRequired: "Event wajib diisi", checkInTimeRequired: "Jam check-in wajib diisi", statusRequired: "Status wajib diisi", unknown: "Tidak diketahui",
    attendanceNotOpen: "Attendance Belum Dibuka", attendanceNotOpenDescription: "Attendance hari ini belum dijadwalkan oleh admin. Silakan coba lagi pada tanggal yang telah ditentukan.", backHome: "Kembali ke Beranda", attendanceControlCenter: "Pusat Kontrol Attendance",
    attendanceDashboardTitle: "Dashboard Attendance", attendanceDashboardDescription: "Pilih aksi utama untuk mulai registrasi anggota baru atau langsung menjalankan attendance dari dashboard ini.", startRegistration: "Start Registrasi", startAttendance: "Start Attendance",
    statusToday: "Status hari ini", liveAttendanceSummary: "Live Attendance Summary", activeMember: "Member aktif", checkedIn: "Sudah check-in", pendingPeople: "Pending", absentPeople: "Absent",
    secureAttendanceWorkspace: "Secure attendance workspace", attendanceHomeTitle: "Dashboard Home Attendance RESC", openAttendance: "Buka Attendance", noActiveEvents: "Belum ada event aktif saat ini.",
    attendanceTrendChart: "Tren Kehadiran", attendanceByEvent: "Kehadiran berdasarkan Event", noEventData: "Tidak ada data event", attendanceStatusDistribution: "Distribusi Status Kehadiran", sick: "Sakit", excused: "Izin",
    eventManagement: "Manajemen Event", manageEvent: "Kelola Event", eventLocked: "Terkunci", lockEvent: "Kunci event", unlockEvent: "Buka kunci event", saveEvent: "Simpan Event", deleteEvent: "Hapus Event",
    eventType: "Jenis Event", customEvent: "Event Custom", selectEventType: "Pilih jenis event", selectRegularEvent: "Pilih event rutin", customEventName: "Nama Event Custom", themeDescription: "Deskripsi / Tema",
    participantAccess: "Kontrol Akses Peserta", selectParticipantAccess: "Pilih akses peserta", everyoneMembers: "Semua Anggota", selectedMembers: "Anggota Terpilih", excludedMembers: "Semua Kecuali Anggota Terpilih",
    selectAll: "Pilih Semua", memberSearch: "Cari nama atau ID anggota...", loadingMembers: "Memuat daftar anggota...", noActiveMembers: "Tidak ada anggota aktif", noMatchingMembers: "Tidak ada anggota yang cocok", questionGameOptional: "Permainan Soal (Opsional)",
    addQuestion: "Tambah Soal", maxQuestions: "Maksimal 3 soal per event", noQuestions: "Belum ada soal. Tambahkan soal untuk membuat permainan Word Search.", questionNumber: "Soal", clue: "Petunjuk", answer: "Jawaban", uppercaseHint: "huruf kapital",
    generatePuzzle: "Buat Puzzle", regeneratePuzzle: "Buat Ulang Puzzle", puzzleReady: "Puzzle siap", timeConflict: "Waktu Bertabrakan", eventNameRequired: "Nama event wajib diisi", eventTimeRequired: "Waktu mulai dan selesai wajib diisi",
    eventTimeOrder: "Waktu mulai harus lebih awal dari waktu selesai", emailRequired: "Email wajib diisi", invalidEmail: "Format email tidak valid", resetCodeSent: "Kode reset telah dikirim! Periksa email kamu.", enterResetCode: "Masukkan kode 6 digit", resetPasswordPrompt: "Buat password baru untuk akun kamu",
    passwordResetSuccess: "Password berhasil direset! Mengarahkan ke login...", resetPasswordFailed: "Gagal mereset password. Silakan coba lagi.", profileLoadFailed: "Gagal memuat profil", profileNameRequired: "Nama wajib diisi", passwordFieldsRequired: "Semua field password wajib diisi",
    updateProfileFailed: "Gagal memperbarui profil", attendanceReport: "Laporan Kehadiran", filterByEventLabel: "Filter berdasarkan event", allEventsLabel: "Semua Event", allStatuses: "Semua Status", recordsShown: "Menampilkan data", memberLabel: "Anggota", status: "Status", excused: "Izin", fileTooLarge: "Maksimal ukuran foto 2MB.",
  },
};

const STORAGE_PREFIX = "visiattend.language";

function storageKey() {
  const userId = getSessionUser()?.id ?? "guest";
  return `${STORAGE_PREFIX}.${userId}`;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(storageKey());
    return stored === "id" ? "id" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem(storageKey(), nextLanguage);
  };

  const translate = (key: TranslationKey) => translations[language][key] || translations.en[key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
