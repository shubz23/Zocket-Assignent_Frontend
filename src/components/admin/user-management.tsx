"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, UserRole } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Search, Pencil, Trash2, Plus, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";

interface EditUserData {
    id: Id<"users">;
    name: string;
    email: string;
    image?: string;
}

export function UserManagement() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "users" | "admins">("all");
    const [editUser, setEditUser] = useState<EditUserData | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCreateAdminDialogOpen, setIsCreateAdminDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [localUsers, setLocalUsers] = useState<User[] | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newAdmin, setNewAdmin] = useState({
        name: "",
        email: "",
        password: "",
        image: "",
        role: "admin" as UserRole,
    });
    const [deleteUserId, setDeleteUserId] = useState<Id<"users"> | null>(null);

    // Convert filter to role for the query
    const queryRole = filter === "admins" ? "admin" : filter === "users" ? "user" : "all";
    
    const serverUsers = useQuery(api.users.getAllUsers, { 
        limit: 20,
        role: queryRole
    }) as User[] | undefined;

    // Handle loading state
    useEffect(() => {
        if (serverUsers === undefined) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
            setLocalUsers(serverUsers);
        }
    }, [serverUsers]);

    const updateRole = useMutation(api.users.updateUserRole);
    const updateUser = useMutation(api.users.updateUser);
    const deleteUser = useMutation(api.users.deleteUser);
    const approveAdmin = useMutation(api.users.approveAdmin);
    const createUser = useMutation(api.users.createUser);
    const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
    const currentUser = useQuery(api.users.getCurrentUser, {
        email: userEmail || undefined
    }) as User | undefined;
    const { toast } = useToast();

    const handleRoleUpdate = async (userId: Id<"users">, newRole: UserRole) => {
        if (!userEmail) return;

        try {
            await updateRole({
                userId,
                newRole,
                userEmail
            });
            toast({
                title: "Success",
                description: "User role updated successfully",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update user role",
            });
        }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUser || !userEmail || !localUsers) return;

        setIsSaving(true);
        setIsEditDialogOpen(false);

        // Optimistic update
        const updatedUsers = localUsers.map(user => 
            user._id === editUser.id 
                ? { ...user, name: editUser.name, email: editUser.email, image: editUser.image }
                : user
        );
        setLocalUsers(updatedUsers);
        
        try {
            await updateUser({
                userId: editUser.id,
                name: editUser.name,
                email: editUser.email,
                image: editUser.image,
                userEmail,
            });

            setEditUser(null);
            // Clear local state to get fresh server data
            setLocalUsers(undefined);
            toast({
                title: "Success",
                description: "User updated successfully",
            });
        } catch (error) {
            // Rollback on error
            setLocalUsers(undefined);
            setIsEditDialogOpen(true);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update user",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteUserId || !userEmail) return;

        try {
            await deleteUser({
                userId: deleteUserId,
                userEmail,
            });

            setDeleteUserId(null);
            toast({
                title: "Success",
                description: "User deleted successfully",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete user",
            });
        }
    };

    const handleApproveAdmin = async (userId: Id<"users">) => {
        if (!userEmail) return;

        try {
            await approveAdmin({
                userId,
                userEmail
            });
            toast({
                title: "Success",
                description: "Admin approved successfully",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to approve admin",
            });
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({
                variant: "destructive",
                title: "Error",
                description: "Image size should be less than 2MB",
            });
            return;
        }

        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const result = e.target?.result as string;
                // Compress image if it's too large
                if (result.length > 500000) { // If larger than 500KB
                    const img = new Image();
                    img.src = result;
                    await new Promise(resolve => img.onload = resolve);
                    
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate new dimensions (max 150x150)
                    const maxSize = 150;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    const compressedImage = canvas.toDataURL('image/jpeg', 0.7);
                    
                    if (editUser) {
                        setEditUser(prev => prev ? { ...prev, image: compressedImage } : null);
                    } else {
                        setNewAdmin(prev => ({ ...prev, image: compressedImage }));
                    }
                } else {
                    if (editUser) {
                        setEditUser(prev => prev ? { ...prev, image: result } : null);
                    } else {
                        setNewAdmin(prev => ({ ...prev, image: result }));
                    }
                }
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            setIsUploading(false);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to upload image",
            });
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userEmail || !currentUser || !localUsers) return;

        if (newAdmin.password.length < 6) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Password should be at least 6 characters long",
            });
            return;
        }

        setIsCreating(true);
        setIsCreateAdminDialogOpen(false);

        try {
            // Create the new admin
            const newUserId = await createUser({
                name: newAdmin.name,
                email: newAdmin.email,
                password: newAdmin.password,
                role: newAdmin.role,
                image: newAdmin.image,
                isApproved: currentUser.role === "super-admin" && newAdmin.role === "admin",
            });

            // Create optimistic user with the actual ID
            const newUserData: User = {
                _id: newUserId,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role,
                image: newAdmin.image,
                isApproved: currentUser.role === "super-admin" && newAdmin.role === "admin"
            };

            // Update local state immediately
            setLocalUsers([...localUsers, newUserData]);

            setNewAdmin({
                name: "",
                email: "",
                password: "",
                image: "",
                role: "admin",
            });

            toast({
                title: "Success",
                description: currentUser.role === "super-admin"
                    ? "Admin created and approved"
                    : "Admin created and pending super-admin approval",
            });

            // Refresh the data after a short delay
            setTimeout(() => {
                setLocalUsers(undefined); // This will trigger a fresh fetch
            }, 1000);

        } catch (error) {
            setIsCreateAdminDialogOpen(true);
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create admin",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const filteredUsers = localUsers?.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());

        // Hide super-admins from regular admins
        if (currentUser?.role === "admin" && user.role === "super-admin") {
            return false;
        }

        return matchesSearch;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-gray-500">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-white p-6 w-full rounded-lg shadow-sm border">
            <div className="flex items-center justify-between gap-4">
                {/* Left side: Create Admin button */}
                {currentUser && (currentUser.role === "admin" || currentUser.role === "super-admin") && (
                    <Button
                        onClick={() => setIsCreateAdminDialogOpen(true)}
                        className={`gap-2 ${currentUser?.role === "admin" && !currentUser?.isApproved ? 'cursor-pointer' : ''}`}
                        disabled={currentUser?.role === "admin" && !currentUser?.isApproved}
                    >
                        <Plus className="h-4 w-4" /> Create Admin
                    </Button>
                )}

                {/* Right side: Search and filter */}
                <div className="flex items-center gap-4">
                    <div className="relative w-[300px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as "all" | "users" | "admins")}
                        className="border rounded-md px-3 py-2 bg-transparent"
                    >
                        <option value="all">All Users</option>
                        <option value="users">Users Only</option>
                        <option value="admins">Admins Only</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers?.map((user) => (
                    <Card key={user._id} className="overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        {user.image ? (
                                            <AvatarImage src={user.image} alt={user.name} />
                                        ) : (
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        )}
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                        <div className="flex gap-2 items-center">
                                            <Badge
                                                className={
                                                    user.role === "super-admin"
                                                        ? "bg-purple-100 text-purple-800"
                                                        : user.role === "admin"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-gray-100 text-gray-800"
                                                }
                                            >
                                                {user.role}
                                            </Badge>
                                            {currentUser?.role === "super-admin" && user.role === "admin" && (
                                                <Badge
                                                    className={
                                                        user.isApproved
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-yellow-100 text-yellow-800"
                                                    }
                                                >
                                                    {user.isApproved ? "Approved" : "Pending Approval"}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {currentUser && (
                                    (currentUser.role === "super-admin" && user.role !== "super-admin") ||
                                    (currentUser.role === "admin" && user.role === "user")
                                ) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setEditUser({
                                                            id: user._id,
                                                            name: user.name,
                                                            email: user.email,
                                                            image: user.image,
                                                        });
                                                        setIsEditDialogOpen(true);
                                                    }}
                                                    className={`gap-2 ${currentUser?.role === "admin" && !currentUser?.isApproved ? 'cursor-not-allowed' : ''}`}
                                                    disabled={currentUser?.role === "admin" && !currentUser?.isApproved}
                                                >
                                                    <Pencil className="h-4 w-4" /> Edit User
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleRoleUpdate(user._id, "user")}
                                                    disabled={user.role === "user"}
                                                >
                                                    Make User
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleRoleUpdate(user._id, "admin")}
                                                    disabled={user.role === "admin"}
                                                >
                                                    Make Admin
                                                </DropdownMenuItem>
                                                {currentUser.role === "super-admin" && user.role === "admin" && !user.isApproved && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleApproveAdmin(user._id)}
                                                        className="text-green-600"
                                                    >
                                                        Approve Admin
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => setDeleteUserId(user._id)}
                                                    className="text-red-600 gap-2"
                                                >
                                                    <Trash2 className="h-4 w-4" /> Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditUser} className="space-y-4">
                        {/* Profile Picture Section */}
                        <div className="flex justify-center">
                            <div className="relative">
                                <Avatar className="h-20 w-20">
                                    {editUser?.image ? (
                                        <AvatarImage src={editUser.image} alt={editUser.name} />
                                    ) : (
                                        <AvatarFallback>
                                            {isUploading ? (
                                                <div className="animate-pulse">
                                                    <div className="h-full w-full bg-gray-200 rounded-full flex items-center justify-center">
                                                        <span className="text-xs text-gray-500">Loading...</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                editUser?.name.charAt(0).toUpperCase()
                                            )}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    type="button"
                                    className="absolute bottom-0 right-0 rounded-full"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" />
                                    ) : (
                                        <Camera className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={editUser?.name || ""}
                                onChange={(e) => setEditUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={editUser?.email || ""}
                                onChange={(e) => setEditUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-white"></div>
                                        Saving Changes...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Hidden file input for image upload */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* Create Admin Dialog */}
            <Dialog open={isCreateAdminDialogOpen} onOpenChange={setIsCreateAdminDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Admin</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateAdmin} className="space-y-4">
                        {/* Profile Picture Section */}
                        <div className="flex justify-center">
                            <div className="relative">
                                <Avatar className="h-20 w-20">
                                    {newAdmin.image ? (
                                        <AvatarImage src={newAdmin.image} alt={newAdmin.name} />
                                    ) : (
                                        <AvatarFallback>
                                            {isUploading ? (
                                                <div className="animate-pulse">
                                                    <div className="h-full w-full bg-gray-200 rounded-full flex items-center justify-center">
                                                        <span className="text-xs text-gray-500">Loading...</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                newAdmin.name.charAt(0).toUpperCase() || "A"
                                            )}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    type="button"
                                    className="absolute bottom-0 right-0 rounded-full"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" />
                                    ) : (
                                        <Camera className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={newAdmin.name}
                                onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newAdmin.email}
                                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={newAdmin.password}
                                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <select
                                id="role"
                                className="w-full border rounded-md p-2"
                                value={newAdmin.role}
                                onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as UserRole })}
                                required
                            >
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                            </select>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-white"></div>
                                        Creating...
                                    </>
                                ) : (
                                    'Create Admin'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete User Alert Dialog */}
            <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user and remove their data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
} 