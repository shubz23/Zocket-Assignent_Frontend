import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getCurrentUser = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email;
    if (!email) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    return user;
  },
});

export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("users")),
    role: v.optional(v.union(v.literal("all"), v.literal("user"), v.literal("admin"), v.literal("super-admin"))),
  },
  handler: async (ctx, args) => {
    const { limit = 20, cursor, role } = args;
    
    let query = ctx.db.query("users");
    
    // Use the role index for better performance
    if (role && role !== "all") {
      query = query.withIndex("by_role", (q) => q.eq("role", role));
    }
    
    if (cursor) {
      query = query.filter(q => q.gt(q.field("_id"), cursor));
    }
    
    return await query.take(limit);
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("super-admin")),
    image: v.optional(v.string()),
    isApproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingUser) {
      throw new Error("User already exists");
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      password: args.password,
      role: args.role,
      image: args.image,
      isApproved: args.isApproved,
    });
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.union(v.literal("user"), v.literal("admin"), v.literal("super-admin")),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, newRole, userEmail } = args;
    
    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), userEmail))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Only super-admin can create super-admin
    if (newRole === "super-admin" && currentUser.role !== "super-admin") {
      throw new Error("Only super-admin can create super-admin");
    }

    // If current user is admin and creating another admin
    if (currentUser.role === "admin" && newRole === "admin") {
      return await ctx.db.patch(userId, { 
        role: newRole,
        isApproved: false // New admin needs approval
      });
    }

    // If super-admin, no approval needed
    if (currentUser.role === "super-admin") {
      return await ctx.db.patch(userId, { 
        role: newRole,
        isApproved: true
      });
    }

    // For other role updates by admin (e.g., making someone a regular user)
    if (currentUser.role === "admin") {
      return await ctx.db.patch(userId, { role: newRole });
    }

    throw new Error("Insufficient permissions");
  },
});

// New mutation for approving admins
export const approveAdmin = mutation({
  args: {
    userId: v.id("users"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, userEmail } = args;
    
    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), userEmail))
      .first();

    if (!currentUser || currentUser.role !== "super-admin") {
      throw new Error("Only super-admin can approve admins");
    }

    const targetUser = await ctx.db.get(userId);
    if (!targetUser || targetUser.role !== "admin") {
      throw new Error("Invalid user or user is not an admin");
    }

    return await ctx.db.patch(userId, { isApproved: true });
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, userEmail, ...updates } = args;
    
    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), userEmail))
      .first();

    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super-admin")) {
      throw new Error("Only admins can update users");
    }

    return await ctx.db.patch(userId, updates);
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, userEmail } = args;
    
    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), userEmail))
      .first();

    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super-admin")) {
      throw new Error("Only admins can delete users");
    }

    // Check if user has any assigned tasks
    const userTasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("assignedTo"), userId))
      .collect();

    if (userTasks.length > 0) {
      throw new Error("Cannot delete user with assigned tasks");
    }

    return await ctx.db.delete(userId);
  },
});

// Add updatePassword mutation
export const updatePassword = mutation({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, currentPassword, newPassword, userEmail } = args;

    // Verify current user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), userEmail))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    if (user.password !== currentPassword) {
      throw new Error("Current password is incorrect");
    }

    // Update password
    return await ctx.db.patch(userId, { password: newPassword });
  },
}); 