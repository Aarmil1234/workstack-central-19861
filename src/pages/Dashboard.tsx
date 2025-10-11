import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Users, FileText, Calendar, MessageSquare } from "lucide-react";

export default function Dashboard() {
  const { role, user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingLeaves: 0,
    totalDocuments: 0,
    totalRooms: 0,
  });

  // Helper for navigation on card click
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        if (role === "admin" || role === "hr") {
          // ✅ Fetch all employees (from profiles)
          const { count: usersCount, error: usersError } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true });
          if (usersError) throw usersError;

          // ✅ Fetch pending leaves
          const { count: leavesCount, error: leavesError } = await supabase
            .from("leave_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");
          if (leavesError) throw leavesError;

          // ✅ Fetch total documents
          const { count: docsCount, error: docsError } = await supabase
            .from("documents")
            .select("id", { count: "exact", head: true });
          if (docsError) throw docsError;

          // ✅ Fetch chat rooms
          const { count: roomsCount, error: roomsError } = await supabase
            .from("chat_rooms")
            .select("id", { count: "exact", head: true });
          if (roomsError) throw roomsError;

          setStats({
            totalUsers: usersCount || 0,
            pendingLeaves: leavesCount || 0,
            totalDocuments: docsCount || 0,
            totalRooms: roomsCount || 0,
          });
        } else {
          // ✅ Employee view - personal stats
          const { count: docsCount } = await supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

          const { count: leavesCount } = await supabase
            .from("leave_requests")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "pending");

          const { count: roomsCount } = await supabase
            .from("room_members")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

          setStats({
            totalUsers: 0,
            pendingLeaves: leavesCount || 0,
            totalDocuments: docsCount || 0,
            totalRooms: roomsCount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };

    fetchStats();
  }, [role, user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's your overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(role === "admin" || role === "hr") && (
          <Card
            onClick={() => handleNavigate("/employees")}
            className="cursor-pointer hover:bg-accent transition-colors"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Employees
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        )}

        <Card
          onClick={() => handleNavigate("/leave-requests")}
          className="cursor-pointer hover:bg-accent transition-colors"
        >
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

        <Card
          onClick={() => handleNavigate("/documents")}
          className="cursor-pointer hover:bg-accent transition-colors"
        >
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

        <Card
          onClick={() => handleNavigate("/chat-room")}
          className="cursor-pointer hover:bg-accent transition-colors"
        >
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
