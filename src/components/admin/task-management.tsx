"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Task, User, TaskPriority, TaskStatus } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, CheckCircle, Circle } from "lucide-react";

interface NewTask {
    title: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    priority: TaskPriority;
}

export function TaskManagement() {
    const [page, setPage] = useState(1);
    const [localTasks, setLocalTasks] = useState<Task[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCompleted, setShowCompleted] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newTask, setNewTask] = useState<NewTask>({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        priority: "medium",
    });

    const { toast } = useToast();
    const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
    
    // Optimized queries with pagination
    const users = useQuery(api.users.getAllUsers, { limit: 50 });
    const createTask = useMutation(api.tasks.createTask);
    const updateTask = useMutation(api.tasks.updateTask);
    const serverTasks = useQuery(api.tasks.getAllTasks, {
        limit: 10,
        cursor: page === 1 ? undefined : localTasks[localTasks.length - 1]?._id
    });
    const currentUser = useQuery(api.users.getCurrentUser, {
        email: userEmail || undefined
    });

    // Efficient task caching
    useEffect(() => {
        if (serverTasks) {
            if (page === 1) {
                setLocalTasks(serverTasks);
            } else {
                // Prevent duplicate tasks
                const newTasks = serverTasks.filter(
                    newTask => !localTasks.some(existingTask => existingTask._id === newTask._id)
                );
                setLocalTasks(prev => [...prev, ...newTasks]);
            }
            setHasMore(serverTasks.length === 10);
            setIsLoading(false);
        }
    }, [serverTasks, page]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // Reset pagination when search changes
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, showCompleted]);

    const loadMore = () => {
        if (!isLoading && hasMore) {
            setIsLoading(true);
            setPage(prev => prev + 1);
        }
    };

    // Optimistic updates for task creation
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userEmail || !currentUser) return;

        setIsSubmitting(true);
        const optimisticTask: Partial<Task> = {
            title: newTask.title,
            description: newTask.description,
            assignedTo: newTask.assignedTo as Id<"users">,
            dueDate: newTask.dueDate,
            priority: newTask.priority,
            status: "pending",
        };

        try {
            // Add optimistic update
            setLocalTasks(prev => [{ ...optimisticTask, _id: 'temp' as Id<"tasks">, taskId: 'temp', assignedBy: currentUser._id } as Task, ...prev]);
            setIsDialogOpen(false);

            await createTask({
                title: newTask.title,
                description: newTask.description,
                assignedTo: newTask.assignedTo as Id<"users">,
                dueDate: newTask.dueDate,
                priority: newTask.priority,
                userEmail,
            });

            // Reset form
            setNewTask({
                title: "",
                description: "",
                assignedTo: "",
                dueDate: "",
                priority: "medium",
            });

            toast({
                title: "Success",
                description: "Task created successfully",
            });

            // Refresh the first page to get the new task
            setPage(1);
        } catch (error) {
            // Rollback optimistic update
            setLocalTasks(prev => prev.filter(task => task._id !== 'temp'));
            setIsDialogOpen(true);
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create task",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Optimistic updates for task editing
    const handleEditTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTask || !userEmail) return;

        // Store the original task for rollback
        const originalTask = localTasks.find(t => t._id === editTask._id);
        
        try {
            // Optimistic update
            setLocalTasks(prev => 
                prev.map(task => task._id === editTask._id ? editTask : task)
            );
            setIsEditDialogOpen(false);

            await updateTask({
                taskId: editTask._id,
                title: editTask.title,
                description: editTask.description,
                assignedTo: editTask.assignedTo,
                dueDate: editTask.dueDate,
                priority: editTask.priority,
                status: editTask.status,
                userEmail,
            });

            toast({
                title: "Success",
                description: "Task updated successfully",
            });
        } catch (error) {
            // Rollback on error
            if (originalTask) {
                setLocalTasks(prev => 
                    prev.map(task => task._id === editTask._id ? originalTask : task)
                );
            }
            setIsEditDialogOpen(true);
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update task",
            });
        }
    };

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case "pending":
                return "bg-yellow-100 text-yellow-800";
            case "in-progress":
                return "bg-blue-100 text-blue-800";
            case "completed":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getPriorityColor = (priority: TaskPriority) => {
        switch (priority) {
            case "high":
                return "bg-red-100 text-red-800";
            case "medium":
                return "bg-orange-100 text-orange-800";
            case "low":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const filteredTasks = localTasks?.filter(task => {
        const assignedUser = users?.find(u => u._id === task.assignedTo);
        const matchesSearch =
            assignedUser?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            assignedUser?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.title.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = showCompleted ?
            task.status === "completed" :
            task.status !== "completed";

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 bg-white p-6 w-full rounded-lg shadow-sm border">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Search tasks or assigned users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCompleted(!showCompleted)}
                        className={`gap-2 ${showCompleted ? 'bg-primary/5 text-primary' : ''}`}
                    >
                        {showCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                        ) : (
                            <Circle className="h-4 w-4" />
                        )}
                        {showCompleted ? 'Completed' : 'Pending'}
                    </Button>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className={`gap-2 ${currentUser?.role === "admin" && !currentUser?.isApproved ? 'cursor-pointer' : ''}`} disabled={currentUser?.role === "admin" && !currentUser?.isApproved}>
                            <Plus className="h-4 w-4" /> Create New Task
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Task</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    placeholder="Enter task title"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    placeholder="Enter task description"
                                    required
                                    disabled={isSubmitting}
                                    className="min-h-[100px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="assignedTo">Assign To</Label>
                                <select
                                    id="assignedTo"
                                    className="w-full border rounded-md p-2"
                                    value={newTask.assignedTo}
                                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select User</option>
                                    {users?.filter(user => user.role === "user").map((user) => (
                                        <option key={user._id} value={user._id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={newTask.dueDate}
                                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    required
                                    disabled={isSubmitting}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <select
                                    id="priority"
                                    className="w-full border rounded-md p-2"
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Creating..." : "Create Task"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks?.map((task) => (
                    <Card key={task._id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{task.title}</CardTitle>
                                <div className="flex gap-2">
                                    <Badge className={getPriorityColor(task.priority)}>
                                        {task.priority}
                                    </Badge>
                                    <Badge className={getStatusColor(task.status)}>
                                        {task.status}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Badge variant="outline">Due: {task.dueDate}</Badge>
                                    <p className="text-sm text-gray-600">
                                        Assigned to: {users?.find(u => u._id === task.assignedTo)?.name}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setEditTask(task);
                                        setIsEditDialogOpen(true);
                                    }}
                                    disabled={currentUser?.role === "admin" && !currentUser?.isApproved}
                                >
                                    Edit Task
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-4">
                    <Button 
                        variant="outline" 
                        onClick={loadMore}
                        disabled={isLoading}
                    >
                        {isLoading ? "Loading..." : "Load More"}
                    </Button>
                </div>
            )}

            {/* Edit Task Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditTask} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input
                                id="edit-title"
                                value={editTask?.title || ""}
                                onChange={(e) => setEditTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                                placeholder="Enter task title"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={editTask?.description || ""}
                                onChange={(e) => setEditTask(prev => prev ? { ...prev, description: e.target.value } : null)}
                                placeholder="Enter task description"
                                required
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-assignedTo">Assign To</Label>
                            <select
                                id="edit-assignedTo"
                                className="w-full border rounded-md p-2"
                                value={editTask?.assignedTo || ""}
                                onChange={(e) => setEditTask(prev => prev ? { ...prev, assignedTo: e.target.value as Id<"users"> } : null)}
                                required
                            >
                                <option value="">Select User</option>
                                {users?.filter(user => user.role === "user").map((user) => (
                                    <option key={user._id} value={user._id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-dueDate">Due Date</Label>
                            <Input
                                id="edit-dueDate"
                                type="date"
                                value={editTask?.dueDate || ""}
                                onChange={(e) => setEditTask(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                                required
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-priority">Priority</Label>
                            <select
                                id="edit-priority"
                                className="w-full border rounded-md p-2"
                                value={editTask?.priority || ""}
                                onChange={(e) => setEditTask(prev => prev ? { ...prev, priority: e.target.value as TaskPriority } : null)}
                                required
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-status">Status</Label>
                            <select
                                id="edit-status"
                                className="w-full border rounded-md p-2"
                                value={editTask?.status || ""}
                                onChange={(e) => setEditTask(prev => prev ? { ...prev, status: e.target.value as TaskStatus } : null)}
                                required
                            >
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <DialogFooter>
                            <Button type="submit">
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
} 