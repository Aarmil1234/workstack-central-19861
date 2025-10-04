import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Calendar, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { role, user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingLeaves: 0,
    totalDocuments: 0,
    totalRooms: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (role === "admin" || role === "hr") {
        // Fetch all users count
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch pending leaves
        const { count: leavesCount } = await supabase
          .from("leave_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        // Fetch documents count
        const { count: docsCount } = await supabase
          .from("documents")
          .select("*", { count: "exact", head: true });

        // Fetch chat rooms count
        const { count: roomsCount } = await supabase
          .from("chat_rooms")
          .select("*", { count: "exact", head: true });

        setStats({
          totalUsers: usersCount || 0,
          pendingLeaves: leavesCount || 0,
          totalDocuments: docsCount || 0,
          totalRooms: roomsCount || 0,
        });
      } else {
        // Employee view - personal stats
        const { count: docsCount } = await supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user?.id);

        const { count: leavesCount } = await supabase
          .from("leave_requests")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user?.id)
          .eq("status", "pending");

        const { count: roomsCount } = await supabase
          .from("room_members")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user?.id);

        setStats({
          totalUsers: 0,
          pendingLeaves: leavesCount || 0,
          totalDocuments: docsCount || 0,
          totalRooms: roomsCount || 0,
        });
      }
    };

    fetchStats();
  }, [role, user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(role === "admin" || role === "hr") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {role === "employee" ? "My Pending Leaves" : "Pending Leaves"}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {role === "employee" ? "My Documents" : "Total Documents"}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {role === "employee" ? "My Rooms" : "Chat Rooms"}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRooms}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
