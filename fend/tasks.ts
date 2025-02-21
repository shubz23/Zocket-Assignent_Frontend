import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper function to generate unique task ID
function generateTaskId() {
  // Generate a random 5-digit number between 10000 and 99999
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `TASK-${randomNum}`;
}

// Helper function to check if taskId already exists
async function isTaskIdUnique(ctx: any, taskId: string): Promise<boolean> {
  const existingTask = await ctx.db
    .query("tasks")
    .filter((q: { eq: Function; field: Function }) => q.eq(q.field("taskId"), taskId))
    .first();
  return !existingTask;
}

// Helper function to generate a unique task ID with collision checking
async function generateUniqueTaskId(ctx: any): Promise<string> {
  let taskId = generateTaskId();
  let maxAttempts = 10; // Prevent infinite loop
  let attempts = 0;

  while (!(await isTaskIdUnique(ctx, taskId)) && attempts < maxAttempts) {
    taskId = generateTaskId();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error("Failed to generate unique task ID. Please try again.");
  }

  return taskId;
}

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    assignedTo: v.id("users"),
    dueDate: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { userEmail, ...taskData } = args;
    
    // Find the current user using email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), userEmail))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin" && user.role !== "super-admin") {
      throw new Error("Only admins can create tasks");
    }

    // Generate unique task ID with collision checking
    const taskId = await generateUniqueTaskId(ctx);

    return await ctx.db.insert("tasks", {
      taskId,
      title: taskData.title,
      description: taskData.description,
      status: "pending", // Default status
      assignedTo: taskData.assignedTo,
      assignedBy: user._id,
      dueDate: taskData.dueDate,
      priority: taskData.priority,
    });
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
    description: v.string(),
    assignedTo: v.id("users"),
    dueDate: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("completed")
    ),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { taskId, userEmail, ...updates } = args;

    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), userEmail))
      .first();

    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super-admin")) {
      throw new Error("Only admins can update tasks");
    }

    if (currentUser.role === "admin" && !currentUser.isApproved) {
      throw new Error("Admin approval pending");
    }

    return await ctx.db.patch(taskId, updates);
  },
});

export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (!currentUser || currentUser.role === "user") {
      throw new Error("Only admins can delete tasks");
    }

    return await ctx.db.delete(args.taskId);
  },
});

export const getAllTasks = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const { limit = 10, cursor } = args;
    
    let query = ctx.db.query("tasks");
    
    if (cursor) {
      query = query.filter(q => q.gt(q.field("_id"), cursor));
    }
    
    return await query.take(limit);
  },
});

export const getTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

export const getTasksByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("assignedTo"), args.userId))
      .collect();

    return tasks;
  },
});

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    return await ctx.db.patch(args.taskId, { status: args.status });
  },
}); 