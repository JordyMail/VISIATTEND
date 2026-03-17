import { useState } from "react";
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
import { mockClasses, mockUsers, getStudentsInClass, Class } from "@/data/mockData";

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>(mockClasses);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSemester, setFilterSemester] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    classCode: "",
    className: "",
    description: "",
    lecturerId: "",
    academicYear: "2023/2024",
    semester: "ganjil" as const,
  });

  // Filter classes
  const filteredClasses = classes.filter((cls) => {
    const matchSearch =
      cls.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.classCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchSemester =
      filterSemester === "all" || cls.semester === filterSemester;

    return matchSearch && matchSemester;
  });

  const handleAddClass = () => {
    if (formData.classCode && formData.className) {
      const newClass: Class = {
        id: Math.max(...classes.map((c) => c.id), 0) + 1,
        ...formData,
        lecturerId: parseInt(formData.lecturerId) || 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setClasses([...classes, newClass]);
      setIsAddDialogOpen(false);
      setFormData({
        classCode: "",
        className: "",
        description: "",
        lecturerId: "",
        academicYear: "2023/2024",
        semester: "ganjil",
      });
    }
  };

  const handleEditClass = () => {
    if (selectedClass) {
      setClasses(
        classes.map((c) =>
          c.id === selectedClass.id
            ? {
                ...selectedClass,
                ...formData,
                lecturerId: parseInt(formData.lecturerId) || selectedClass.lecturerId,
              }
            : c
        )
      );
      setIsEditDialogOpen(false);
      setSelectedClass(null);
      setFormData({
        classCode: "",
        className: "",
        description: "",
        lecturerId: "",
        academicYear: "2023/2024",
        semester: "ganjil",
      });
    }
  };

  const handleDeleteClass = () => {
    if (selectedClass) {
      setClasses(classes.filter((c) => c.id !== selectedClass.id));
      setIsDeleteDialogOpen(false);
      setSelectedClass(null);
    }
  };

  const handleOpenEdit = (cls: Class) => {
    setSelectedClass(cls);
    setFormData({
      classCode: cls.classCode,
      className: cls.className,
      description: cls.description || "",
      lecturerId: cls.lecturerId.toString(),
      academicYear: cls.academicYear,
      semester: cls.semester,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDetail = (cls: Class) => {
    setSelectedClass(cls);
    setIsDetailDialogOpen(true);
  };

  const getLecturerName = (lecturerId: number) => {
    const lecturer = mockUsers.find((u) => u.id === lecturerId);
    return lecturer?.fullName || "Unassigned";
  };

  const classStudents = selectedClass ? getStudentsInClass(selectedClass.id) : [];

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Events Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage events
          </p>
        </div>
        <Button
          className="gap-2 bg-primary hover:bg-primary/90 w-full md:w-auto"
          onClick={() => {
            setFormData({
              classCode: "",
              className: "",
              description: "",
              lecturerId: "",
              academicYear: "2023/2024",
              semester: "ganjil",
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
          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Filter by semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              <SelectItem value="ganjil">Odd (Ganjil)</SelectItem>
              <SelectItem value="genap">Even (Genap)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Classes Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BS Week</TableHead>
                <TableHead>Class Name</TableHead>
                <TableHead>Lecturer</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.classCode}</TableCell>
                    <TableCell>{cls.className}</TableCell>
                    <TableCell className="text-sm">
                      {getLecturerName(cls.lecturerId)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {cls.semester === "ganjil" ? "Odd" : "Even"}
                      </Badge>
                    </TableCell>
                    <TableCell>{cls.academicYear}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          cls.isActive
                            ? "bg-status-success/20 text-status-success border-status-success/20"
                            : "bg-status-error/20 text-status-error border-status-error/20"
                        }
                      >
                        {cls.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(cls)}
                        >
                          <UsersIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(cls)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedClass(cls);
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
                    No classes found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedClass(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Edit Class" : "Add New Class"}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? "Update the class information below"
                : "Fill in the details to create a new class"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="classCode">Class Code</Label>
              <Input
                id="classCode"
                value={formData.classCode}
                onChange={(e) =>
                  setFormData({ ...formData, classCode: e.target.value })
                }
                placeholder="e.g., CS101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="className">Class Name</Label>
              <Input
                id="className"
                value={formData.className}
                onChange={(e) =>
                  setFormData({ ...formData, className: e.target.value })
                }
                placeholder="e.g., Introduction to Programming"
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
                placeholder="Brief class description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lecturer">Lecturer</Label>
              <Select value={formData.lecturerId} onValueChange={(value) =>
                setFormData({ ...formData, lecturerId: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select lecturer" />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.filter((u) => u.role === "lecturer").map((lecturer) => (
                    <SelectItem key={lecturer.id} value={lecturer.id.toString()}>
                      {lecturer.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={formData.semester}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    semester: value as "ganjil" | "genap",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ganjil">Odd (Ganjil)</SelectItem>
                  <SelectItem value="genap">Even (Genap)</SelectItem>
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
              onClick={isEditDialogOpen ? handleEditClass : handleAddClass}
            >
              {isEditDialogOpen ? "Update Class" : "Add Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedClass?.className}</DialogTitle>
            <DialogDescription>{selectedClass?.classCode}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Lecturer</p>
                <p className="font-medium">
                  {selectedClass ? getLecturerName(selectedClass.lecturerId) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Semester</p>
                <p className="font-medium">
                  {selectedClass?.semester === "ganjil" ? "Odd" : "Even"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">
                Enrolled Students ({classStudents.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                {classStudents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.fullName}
                          </TableCell>
                          <TableCell className="text-sm">
                            {student.studentId}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {student.email}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No students enrolled yet
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
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedClass?.className}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
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
