import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, Calendar, MessageSquare, CalendarDays, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  extra_info?: string | null;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
}

export default function Dashboard() {
  const { role, user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingLeaves: 0,
    totalDocuments: 0,
    totalRooms: 0,
  });
  
  const [upcomingLeaves, setUpcomingLeaves] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  // Helper for navigation on card click
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  useEffect(() => {
    const fetchUpcomingLeaves = async () => {
      if (!user) return;
      setLoadingLeaves(true);

      try {
        const today = new Date();
        const nextWeek = addDays(today, 7);

        let query = supabase
          .from("leave_requests")
          .select("*, profiles(full_name, email)")
          .eq("status", "approved")
          .gte("start_date", today.toISOString().split('T')[0])
          .lte("start_date", nextWeek.toISOString().split('T')[0])
          .order("start_date", { ascending: true })
          .limit(5);

        if (role === "employee") {
          query = query.eq("user_id", user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setUpcomingLeaves(data || []);
      } catch (error) {
        console.error("Error fetching upcoming leaves:", error);
      } finally {
        setLoadingLeaves(false);
      }
    };

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
    fetchUpcomingLeaves();

    // Set up realtime subscription for leave requests
    const channel = supabase
      .channel('dashboard-leaves')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
        },
        () => {
          fetchUpcomingLeaves();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      {/* Upcoming Leaves Widget */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <CardTitle>Upcoming Leaves</CardTitle>
            </div>
            <CardDescription>
              {role === "employee" ? "Your approved leaves for the next 7 days" : "Team leaves for the next 7 days"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLeaves ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : upcomingLeaves.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming leaves</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {format(parseISO(leave.start_date), "dd")}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {format(parseISO(leave.start_date), "MMM")}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {(role === "admin" || role === "hr") && leave.profiles && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">
                            {leave.profiles.full_name || leave.profiles.email}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {leave.leave_type.replace("-", " ")}
                        </Badge>
                        {leave.end_date !== leave.start_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Until {format(parseISO(leave.end_date), "MMM dd")}
                          </span>
                        )}
                      </div>
                      {leave.extra_info && (
                        <p className="text-xs text-muted-foreground truncate">
                          {leave.extra_info}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {upcomingLeaves.length >= 5 && (
                  <button
                    onClick={() => navigate("/leave-requests")}
                    className="w-full text-sm text-primary hover:underline py-2"
                  >
                    View all leaves →
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Availability Summary (for admins/HR) */}
        {(role === "admin" || role === "hr") && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Team Availability</CardTitle>
              </div>
              <CardDescription>Quick overview of team status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Available</p>
                      <p className="text-xs text-muted-foreground">Currently working</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.totalUsers - upcomingLeaves.filter(l => {
                      const today = new Date().toISOString().split('T')[0];
                      return l.start_date <= today && l.end_date >= today;
                    }).length}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">On Leave</p>
                      <p className="text-xs text-muted-foreground">Today</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {upcomingLeaves.filter(l => {
                      const today = new Date().toISOString().split('T')[0];
                      return l.start_date <= today && l.end_date >= today;
                    }).length}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pending</p>
                      <p className="text-xs text-muted-foreground">Leave requests</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.pendingLeaves}
                  </div>
                </div>

                <button
                  onClick={() => navigate("/leave-requests")}
                  className="w-full text-sm text-primary hover:underline py-2"
                >
                  Manage leave requests →
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
