"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User, Camera, Eye, EyeOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    image: "",
    currentPassword: "",
    newPassword: "",
  });

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
  const currentUser = useQuery(api.users.getCurrentUser, {
    email: userEmail || undefined
  });
  const updateUser = useMutation(api.users.updateUser);
  const updatePassword = useMutation(api.users.updatePassword);

  const handleSignOut = () => {
    localStorage.removeItem('userEmail');
    router.push('/sign-in');
    router.refresh();
  };

  const handleSignIn = () => {
    router.push('/sign-in');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      toast({
        title: "Uploading image...",
        description: "Please wait while we process your image",
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, image: reader.result as string }));
        setIsUploading(false);
        toast({
          title: "Image uploaded!",
          description: "Your profile picture has been updated",
        });
      };
      reader.onerror = () => {
        setIsUploading(false);
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: "Failed to upload image. Please try again.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditProfile = async () => {
    if (!userEmail || !currentUser) return;

    try {
      // Update profile info
      await updateUser({
        userId: currentUser._id,
        name: profileData.name || currentUser.name,
        email: currentUser.email,
        image: profileData.image || currentUser.image,
        userEmail,
      });

      // Update password if provided
      if (profileData.currentPassword && profileData.newPassword) {
        await updatePassword({
          userId: currentUser._id,
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword,
          userEmail,
        });
      }

      setIsEditProfileOpen(false);
      setProfileData({
        name: "",
        image: "",
        currentPassword: "",
        newPassword: "",
      });
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
      });
    }
  };

  return (
    <nav className="bg-white/70 backdrop-blur-md border-b fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <span className="text-xl font-semibold text-gray-900">Task Manager</span>
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.image} />
                        <AvatarFallback>
                          {currentUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white/90 backdrop-blur-sm">
                    <DropdownMenuItem
                      onClick={() => {
                        setProfileData({
                          name: currentUser.name,
                          image: currentUser.image || "",
                          currentPassword: "",
                          newPassword: "",
                        });
                        setIsEditProfileOpen(true);
                      }}
                      className="hover:bg-white/50"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-red-50/50 text-red-500"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-blue-50/50 text-blue-500"
                onClick={handleSignIn}
              >
                <LogIn className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Profile Picture Section */}
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileData.image || currentUser?.image} />
                  <AvatarFallback>
                    {isUploading ? (
                      <div className="animate-pulse">
                        <div className="h-full w-full bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs text-gray-500">Loading...</span>
                        </div>
                      </div>
                    ) : (
                      currentUser?.name.charAt(0).toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="icon"
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
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPassword ? "text" : "password"}
                  value={profileData.currentPassword}
                  onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={profileData.newPassword}
                  onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button onClick={handleEditProfile} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
} 