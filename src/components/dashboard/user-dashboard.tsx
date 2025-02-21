"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskDetails } from "./task-details";
import { Task, User } from "@/lib/types";
import { SignOutButton } from "../auth/sign-out-button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function UserDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [activeTab, setActiveTab] = useState("active");

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
  const currentUser = useQuery(api.users.getCurrentUser, { 
    email: userEmail || undefined 
  }) as User | undefined;
  
  const tasks = currentUser?._id 
    ? useQuery(api.tasks.getTasksByUser, { userId: currentUser._id })
    : undefined;
  const users = useQuery(api.users.getAllUsers) as User[] | undefined;

  const getStatusColor = (status: string) => {
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

  const getPriorityColor = (priority: string) => {
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

  const isToday = (dateStr: string) => {
    const today = new Date();
    const taskDate = new Date(dateStr);
    return today.toDateString() === taskDate.toDateString();
  };

  const todaysTasks = tasks?.filter(task => isToday(task.dueDate) && task.status !== "completed");
  
  const filteredAndSortedTasks = tasks?.filter(task => {
    // Exclude tasks that are due today from the main list
    if (isToday(task.dueDate) && task.status !== "completed") {
      return false;
    }

    // Search filter
    const matchesSearch = 
      task.taskId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Priority filter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

    // Status filter based on active tab
    const matchesTab = activeTab === "completed" 
      ? task.status === "completed"
      : task.status !== "completed";

    return matchesSearch && matchesPriority && matchesTab;
  }).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  const TasksList = ({ tasks }: { tasks: Task[] }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tasks.map((task) => {
        const assignedByAdmin = users?.find(u => u._id === task.assignedBy);
        return (
          <Card key={task._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{task.title}</CardTitle>
                  <CardDescription className="mt-1 text-xs text-gray-500">
                    ID: {task.taskId}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                </div>
              </div>
              <CardDescription>Due: {task.dueDate}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {task.description}
              </p>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-gray-600">
                    Assigned by: {assignedByAdmin?.name}
                  </Badge>
                </div>
                <TaskDetails taskId={task._id} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Tasks</h1>
      </div>

      {/* Today's Tasks Section */}
      {todaysTasks && todaysTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Due Today</h2>
          <TasksList tasks={todaysTasks} />
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "all" | "high" | "medium" | "low")}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* Tabs for Active and Completed Tasks */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active Tasks</TabsTrigger>
          <TabsTrigger value="completed">Completed Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {filteredAndSortedTasks && filteredAndSortedTasks.length > 0 ? (
            <TasksList tasks={filteredAndSortedTasks} />
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">No active tasks found.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {filteredAndSortedTasks && filteredAndSortedTasks.length > 0 ? (
            <TasksList tasks={filteredAndSortedTasks} />
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-500">No completed tasks found.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 