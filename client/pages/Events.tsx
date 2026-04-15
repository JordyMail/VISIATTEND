import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { eventApi, userApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface Event {
  id: number;
  event_code: string;
  event_name: string;
  description?: string;
  preacher_id: number;
  preacher_name?: string;
  season: string;
  event_type: 'worship' | 'meeting' | 'study' | 'fellowship' | 'outreach';
  is_active: boolean;
  created_at: string;
}

interface User {
  id: number;
  full_name: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [preachers, setPreachers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventMembers, setEventMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    eventCode: "",
    eventName: "",
    description: "",
    preacherId: "",
    season: "2024 Season",
    eventType: "worship" as const,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsRes, preachersRes] = await Promise.all([
        eventApi.getAll(),
        userApi.getAll({ role: 'preacher' }),
      ]);
      setEvents(eventsRes.data.data);
      setPreachers(preachersRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchSearch =
      evt.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.event_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType =
      filterType === "all" || evt.event_type === filterType;

    return matchSearch && matchType;
  });

  const handleAddEvent = async () => {
    if (!formData.eventCode || !formData.eventName) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await eventApi.create({
        eventCode: formData.eventCode,
        eventName: formData.eventName,
        description: formData.description,
        preacherId: parseInt(formData.preacherId),
        season: formData.season,
        eventType: formData.eventType,
      });
      
      toast({
        title: "Success",
        description: "Event added successfully",
      });
      
      setIsAddDialogOpen(false);
      setFormData({
        eventCode: "",
        eventName: "",
        description: "",
        preacherId: "",
        season: "2024 Season",
        eventType: "worship",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add event",
        variant: "destructive",
      });
    }
  };

  const handleEditEvent = async () => {
    if (!selectedEvent) return;

    try {
      await eventApi.update(selectedEvent.id, {
        eventName: formData.eventName,
        description: formData.description,
        preacherId: parseInt(formData.preacherId),
        eventType: formData.eventType,
      });
      
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      
      setIsEditDialogOpen(false);
      setSelectedEvent(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      await eventApi.delete(selectedEvent.id);
      
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedEvent(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (evt: Event) => {
    setSelectedEvent(evt);
    setFormData({
      eventCode: evt.event_code,
      eventName: evt.event_name,
      description: evt.description || "",
      preacherId: evt.preacher_id.toString(),
      season: evt.season,
      eventType: evt.event_type,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDetail = async (evt: Event) => {
    setSelectedEvent(evt);
    try {
      const response = await eventApi.getEnrolledMembers(evt.id);
      setEventMembers(response.data.data);
      setIsDetailDialogOpen(true);
    } catch (error) {
      console.error('Error fetching event members:', error);
      toast({
        title: "Error",
        description: "Failed to load event members",
        variant: "destructive",
      });
    }
  };

  const getPreacherName = (preacherId: number) => {
    const preacher = preachers.find((p) => p.id === preacherId);
    return preacher?.full_name || "Unassigned";
  };

  const getEventTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      worship: "bg-blue-500/20 text-blue-700 border-blue-200",
      meeting: "bg-green-500/20 text-green-700 border-green-200",
      study: "bg-purple-500/20 text-purple-700 border-purple-200",
      fellowship: "bg-orange-500/20 text-orange-700 border-orange-200",
      outreach: "bg-red-500/20 text-red-700 border-red-200",
    };
    return colors[type] || "bg-gray-500/20 text-gray-700 border-gray-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Events Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage church events
          </p>
        </div>
        <Button
          className="gap-2 bg-primary hover:bg-primary/90 w-full md:w-auto"
          onClick={() => {
            setFormData({
              eventCode: "",
              eventName: "",
              description: "",
              preacherId: "",
              season: "2024 Season",
              eventType: "worship",
            });
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add New Event
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by event name or code..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="worship">Worship</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="study">Study</SelectItem>
              <SelectItem value="fellowship">Fellowship</SelectItem>
              <SelectItem value="outreach">Outreach</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Events Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Code</TableHead>
                <TableHead>Event Name</TableHead>
                <TableHead>Preacher</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => (
                  <TableRow key={evt.id}>
                    <TableCell className="font-medium">{evt.event_code}</TableCell>
                    <TableCell>{evt.event_name}</TableCell>
                    <TableCell className="text-sm">
                      {getPreacherName(evt.preacher_id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getEventTypeBadgeColor(evt.event_type)}>
                        {evt.event_type.charAt(0).toUpperCase() + evt.event_type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{evt.season}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          evt.is_active
                            ? "bg-status-success/20 text-status-success border-status-success/20"
                            : "bg-status-error/20 text-status-error border-status-error/20"
                        }
                      >
                        {evt.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(evt)}
                        >
                          <UsersIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(evt)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedEvent(evt);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No events found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog - same as before but with updated handlers */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedEvent(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Edit Event" : "Add New Event"}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? "Update the event information below"
                : "Fill in the details to create a new event"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventCode">Event Code</Label>
              <Input
                id="eventCode"
                value={formData.eventCode}
                onChange={(e) =>
                  setFormData({ ...formData, eventCode: e.target.value })
                }
                placeholder="e.g., EVT001"
                disabled={isEditDialogOpen}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={formData.eventName}
                onChange={(e) =>
                  setFormData({ ...formData, eventName: e.target.value })
                }
                placeholder="e.g., Sunday Worship Service"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief event description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preacher">Preacher</Label>
              <Select value={formData.preacherId} onValueChange={(value) =>
                setFormData({ ...formData, preacherId: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select preacher" />
                </SelectTrigger>
                <SelectContent>
                  {preachers.map((preacher) => (
                    <SelectItem key={preacher.id} value={preacher.id.toString()}>
                      {preacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    eventType: value as "worship" | "meeting" | "study" | "fellowship" | "outreach",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worship">Worship</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="study">Bible Study</SelectItem>
                  <SelectItem value="fellowship">Fellowship</SelectItem>
                  <SelectItem value="outreach">Outreach</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={isEditDialogOpen ? handleEditEvent : handleAddEvent}
            >
              {isEditDialogOpen ? "Update Event" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.event_name}</DialogTitle>
            <DialogDescription>{selectedEvent?.event_code}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Preacher</p>
                <p className="font-medium">
                  {selectedEvent ? getPreacherName(selectedEvent.preacher_id) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Event Type</p>
                <p className="font-medium">
                  {selectedEvent?.event_type.charAt(0).toUpperCase() + selectedEvent?.event_type.slice(1)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">
                Enrolled Members ({eventMembers.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                {eventMembers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.full_name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {member.member_id}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {member.email}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No members enrolled yet
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEvent?.event_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}