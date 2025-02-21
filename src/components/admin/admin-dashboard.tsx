"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "./user-management";
import { TaskManagement } from "./task-management";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { User, Task } from "@/lib/types";
import { Users, ListTodo, Loader2 } from "lucide-react";

export function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("users");
    const [isLoading, setIsLoading] = useState(true);

    const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
    const currentUser = useQuery(api.users.getCurrentUser, {
        email: userEmail || undefined
    }) as User | undefined;

    // Handle loading state
    useEffect(() => {
        if (currentUser === undefined) {
            setIsLoading(true);
        } else {
            // Add a small delay to ensure all data is loaded
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentUser]);

    // Persist active tab in localStorage
    useEffect(() => {
        const savedTab = localStorage.getItem('adminActiveTab');
        if (savedTab && (savedTab === 'users' || savedTab === 'tasks')) {
            setActiveTab(savedTab);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('adminActiveTab', activeTab);
    }, [activeTab]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) return null;

    const isSuperAdmin = currentUser.role === "super-admin";

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Welcome back, {currentUser.name}! 👋
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        {currentUser.role === "admin" && !currentUser.isApproved && (
                            <span className="text-xs ml-2">(Approval Pending)</span>
                        )}
                        Here's what's happening with your account today.
                    </p>
                </div>

                {isSuperAdmin ? (
                    <div className="relative">
                        <Tabs defaultValue="users" className="w-full h-full">
                            <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                <TabsList className="grid bg-white rounded-lg p-1 shadow-md h-full">
                                    <TabsTrigger
                                        value="users"
                                        className="rounded-md py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span>Manage Admins/Users</span>
                                        </div>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-6 pt-12 w-full">
                                <TabsContent value="users" className="mt-6 border-0 p-0">
                                    <UserManagement />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                ) : (
                    <div className="relative">
                        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full">
                            <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                <TabsList className="w-[400px] grid grid-cols-2 bg-white rounded-lg p-1 shadow-md h-full">
                                    <TabsTrigger
                                        value="users"
                                        className="rounded-md py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span>Manage Users</span>
                                        </div>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="tasks"
                                        className="rounded-md py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ListTodo className="h-4 w-4" />
                                            <span>Manage Tasks</span>
                                        </div>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-6 pt-12 w-full">
                                <TabsContent value="users" className="mt-6 border-0 p-0">
                                    <UserManagement />
                                </TabsContent>

                                <TabsContent value="tasks" className="mt-6 border-0 p-0">
                                    <TaskManagement />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                )}
            </main>
        </div>
    );
} 