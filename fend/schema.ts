import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("super-admin")),
    image: v.optional(v.string()),
    isApproved: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_approval", ["isApproved"]),

  tasks: defineTable({
    taskId: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("completed")
    ),
    assignedTo: v.id("users"),
    assignedBy: v.id("users"),
    dueDate: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
  })
    .index("by_assignedTo", ["assignedTo"])
    .index("by_status", ["status"])
    .index("by_taskId", ["taskId"])
    .index("by_priority", ["priority"])
    .index("by_dueDate", ["dueDate"])
    .index("by_assignedBy", ["assignedBy"]),
}); 