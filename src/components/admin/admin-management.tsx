"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, UserRole } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";

export function AdminManagement() {
  const users = useQuery(api.users.getAllUsers) as User[] | undefined;
  const updateRole = useMutation(api.users.updateUserRole);

  const handleRoleUpdate = async (userId: Id<"users">, newRole: UserRole) => {
    try {
      await updateRole({ userId, newRole });
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const adminUsers = users?.filter((user) => user.role === "admin");

  return (
    <div className="space-y-4">
      {adminUsers?.map((admin) => (
        <Card key={admin._id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{admin.name}</CardTitle>
              <Badge>Admin</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{admin.email}</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleRoleUpdate(admin._id, "user")}
            >
              Remove Admin Role
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 