import { Id } from "@/convex/_generated/dataModel";

export type UserRole = "user" | "admin" | "super-admin";
export type TaskStatus = "pending" | "in-progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  role: UserRole;
  image?: string;
  isApproved?: boolean;
}

export interface Task {
  _id: Id<"tasks">;
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: Id<"users">;
  assignedBy: Id<"users">;
  dueDate: string;
  priority: TaskPriority;
} 