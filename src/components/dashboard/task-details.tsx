import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task, TaskStatus } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";

interface TaskDetailsProps {
  taskId: Id<"tasks">;
}

export function TaskDetails({ taskId }: TaskDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const task = useQuery(api.tasks.getTask, { taskId }) as Task | undefined;
  const updateStatus = useMutation(api.tasks.updateTaskStatus);

  if (!task) return null;

  const handleStatusUpdate = async (newStatus: TaskStatus) => {
    try {
      await updateStatus({ taskId, status: newStatus });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(!isOpen)}>
        View Details
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <Card className="w-[500px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{task.title}</CardTitle>
                <Button variant="ghost" onClick={() => setIsOpen(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{task.description}</p>

              <div className="flex justify-between items-center">
                <Badge variant="outline">Due: {task.dueDate}</Badge>
                <Badge>{task.priority}</Badge>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Update Status:</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate("pending")}
                    disabled={task.status === "pending"}
                  >
                    Pending
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate("in-progress")}
                    disabled={task.status === "in-progress"}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate("completed")}
                    disabled={task.status === "completed"}
                  >
                    Completed
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
} 