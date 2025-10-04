import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Room {
  id: string;
  name: string;
  room_code: string;
  created_at: string;
}

interface WorkLog {
  id: string;
  user_id: string;
  room_id: string;
  log_date: string;
  log_time: string | null;
  tasks: string;
  created_at: string;
}

export default function ChatRoom() {
  const { role, user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  const canCreateRoom = role === "admin" || role === "hr";

  useEffect(() => {
    fetchRooms();
  }, [user]);

  useEffect(() => {
    if (selectedRoom) {
      fetchWorkLogs(selectedRoom);
    }
  }, [selectedRoom]);

  const fetchRooms = async () => {
    try {
      const { data: memberData } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", user?.id);

      if (memberData && memberData.length > 0) {
        const roomIds = memberData.map((m) => m.room_id);
        const { data: roomsData } = await supabase
          .from("chat_rooms")
          .select("*")
          .in("id", roomIds);

        if (roomsData) {
          setRooms(roomsData);
          if (roomsData.length > 0 && !selectedRoom) {
            setSelectedRoom(roomsData[0].id);
          }
        }
      }
    } catch (error: any) {
      toast.error("Failed to fetch rooms");
    }
  };

  const fetchWorkLogs = async (roomId: string) => {
    try {
      const { data } = await supabase
        .from("work_logs")
        .select("*")
        .eq("room_id", roomId)
        .order("log_date", { ascending: false });

      setWorkLogs(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch work logs");
    }
  };

  const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const { data: roomData, error: roomError } = await supabase
        .from("chat_rooms")
        .insert({
          name: formData.get("roomName") as string,
          room_code: roomCode,
          created_by: user?.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Auto-join creator
      await supabase.from("room_members").insert({
        room_id: roomData.id,
        user_id: user?.id,
      });

      toast.success(`Room created with code: ${roomCode}`);
      setCreateDialogOpen(false);
      fetchRooms();
    } catch (error: any) {
      toast.error("Failed to create room");
    }
  };

  const handleJoinRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomCode = formData.get("roomCode") as string;

    try {
      const { data: roomData } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("room_code", roomCode.toUpperCase())
        .single();

      if (!roomData) {
        toast.error("Invalid room code");
        return;
      }

      const { error } = await supabase.from("room_members").insert({
        room_id: roomData.id,
        user_id: user?.id,
      });

      if (error) throw error;

      toast.success("Joined room successfully");
      setJoinDialogOpen(false);
      fetchRooms();
    } catch (error: any) {
      toast.error("Failed to join room");
    }
  };

  const handleAddWorkLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const { error } = await supabase.from("work_logs").insert({
        user_id: user?.id,
        room_id: selectedRoom,
        log_date: formData.get("logDate") as string,
        log_time: formData.get("logTime") as string || null,
        tasks: formData.get("tasks") as string,
      });

      if (error) throw error;

      toast.success("Work log added");
      setLogDialogOpen(false);
      if (selectedRoom) fetchWorkLogs(selectedRoom);
    } catch (error: any) {
      toast.error("Failed to add work log");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chat Room</h1>
          <p className="text-muted-foreground">Manage work logs and collaborate</p>
        </div>

        <div className="flex gap-2">
          {canCreateRoom && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Chat Room</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomName">Room Name</Label>
                    <Input id="roomName" name="roomName" placeholder="Enter room name" required />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Room
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Join Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Room</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomCode">Room Code</Label>
                  <Input
                    id="roomCode"
                    name="roomCode"
                    placeholder="Enter 6-character code"
                    required
                    maxLength={6}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Join Room
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No rooms yet. Create or join one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Your Rooms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedRoom === room.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <p className="font-medium">{room.name}</p>
                  <p className="text-xs opacity-70">Code: {room.room_code}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedRoom && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Work Logs</CardTitle>
                  <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Log
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Work Log</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddWorkLog} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="logDate">Date</Label>
                          <Input id="logDate" name="logDate" type="date" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="logTime">Time (optional)</Label>
                          <Input id="logTime" name="logTime" type="time" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tasks">Tasks</Label>
                          <Textarea
                            id="tasks"
                            name="tasks"
                            placeholder="Describe your work for the day"
                            rows={4}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">
                          Submit Log
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {workLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No work logs yet</p>
                ) : (
                  <div className="space-y-4">
                    {workLogs.map((log) => (
                      <div key={log.id} className="border-l-2 border-primary pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {new Date(log.log_date).toLocaleDateString()}
                          </Badge>
                          {log.log_time && (
                            <span className="text-xs text-muted-foreground">{log.log_time}</span>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{log.tasks}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
