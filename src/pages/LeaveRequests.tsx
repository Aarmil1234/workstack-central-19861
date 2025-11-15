import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  extra_info?: string | null; // for storing time or half info
}

export default function LeaveRequests() {
  const { role, user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  const canApprove = role === "admin" || role === "hr";

  useEffect(() => {
    fetchRequests();
  }, [role, user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
      if (role === "employee") {
        query = query.eq("user_id", user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const startDate = formData.get("startDate") as string;
      const endDate = formData.get("endDate") as string;
      
      const { error } = await supabase.from("leave_requests").insert({
        user_id: user?.id,
        leave_type: formData.get("leaveType") as string,
        start_date: startDate,
        end_date: endDate || startDate, // Use start_date if end_date is not provided
        reason: formData.get("reason") as string,
        extra_info: extraInfo || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Leave request submitted");
      setDialogOpen(false);
      setLeaveType("");
      setExtraInfo("");
      fetchRequests();
    } catch (error: any) {
      toast.error("Failed to submit leave request");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Leave request ${status}`);
      fetchRequests();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">
            {canApprove ? "Manage employee leave requests" : "View and submit leave requests"}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Type */}
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  name="leaveType"
                  onValueChange={(value) => {
                    setLeaveType(value);
                    setExtraInfo("");
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-day">Full Day</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                    <SelectItem value="early-out">Early Out</SelectItem>
                    <SelectItem value="late-arrival">Late Arrival</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Date</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>

              {/* End Date (only for full day) */}
              {leaveType === "full-day" && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" name="endDate" type="date" required />
                </div>
              )}

              {/* Dynamic extra fields */}
              {leaveType === "early-out" && (
                <div className="space-y-2">
                  <Label htmlFor="earlyTime">Time of Early Out</Label>
                  <Input
                    id="earlyTime"
                    name="earlyTime"
                    type="time"
                    required
                    onChange={(e) => setExtraInfo(`Early out at ${e.target.value}`)}
                  />
                </div>
              )}

              {leaveType === "late-arrival" && (
                <div className="space-y-2">
                  <Label htmlFor="lateTime">Expected Arrival Time</Label>
                  <Input
                    id="lateTime"
                    name="lateTime"
                    type="time"
                    required
                    onChange={(e) => setExtraInfo(`Arriving at ${e.target.value}`)}
                  />
                </div>
              )}

              {leaveType === "half-day" && (
                <div className="space-y-2">
                  <Label>Which Half?</Label>
                  <Select
                    onValueChange={(value) => setExtraInfo(`Half Day (${value} half)`)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select half" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">First Half</SelectItem>
                      <SelectItem value="second">Second Half</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" name="reason" placeholder="Enter reason for leave" rows={3} />
              </div>

              <Button type="submit" className="w-full">
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Request list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No leave requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize">
                    {request.leave_type.replace("-", " ")}
                  </CardTitle>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Date:</span>{" "}
                    {new Date(request.start_date).toLocaleDateString()}
                    {request.end_date && ` - ${new Date(request.end_date).toLocaleDateString()}`}
                  </p>

                  {request.extra_info && (
                    <p>
                      <span className="font-medium">Details:</span> {request.extra_info}
                    </p>
                  )}

                  {request.reason && (
                    <p>
                      <span className="font-medium">Reason:</span> {request.reason}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Submitted: {new Date(request.created_at).toLocaleDateString()}
                  </p>

                  {canApprove && request.status === "pending" && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(request.id, "approved")}
                        className="flex-1"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(request.id, "rejected")}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
