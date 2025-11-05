import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

        if (roomsData) setRooms(roomsData);
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
    const roomName = formData.get("roomName") as string;
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const userId = session.user.id;
      const { data: roomData, error: roomError } = await supabase
        .from("chat_rooms")
        .insert({
          name: roomName,
          room_code: roomCode,
          created_by: userId,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      await supabase.from("room_members").insert({
        room_id: roomData.id,
        user_id: userId,
      });

      toast.success(`Room created with code: ${roomCode}`);
      setCreateDialogOpen(false);
      fetchRooms();
    } catch (error: any) {
      toast.error(error.message || "Failed to create room");
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

      await supabase.from("room_members").insert({
        room_id: roomData.id,
        user_id: user?.id,
      });

      toast.success("Joined room successfully");
      setJoinDialogOpen(false);
      fetchRooms();
    } catch {
      toast.error("Failed to join room");
    }
  };

  const handleAddWorkLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await supabase.from("work_logs").insert({
        user_id: user?.id,
        room_id: selectedRoom,
        log_date: formData.get("logDate") as string,
        log_time: (formData.get("logTime") as string) || null,
        tasks: formData.get("tasks") as string,
      });

      toast.success("Work log added");
      setLogDialogOpen(false);
      if (selectedRoom) fetchWorkLogs(selectedRoom);
    } catch {
      toast.error("Failed to add work log");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chat Rooms</h1>
          <p className="text-muted-foreground">
            View your rooms and manage work logs
          </p>
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
                    <Input
                      id="roomName"
                      name="roomName"
                      placeholder="Enter room name"
                      required
                    />
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

      {/* Layout */}
      {rooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No rooms yet. Create or join one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* LEFT SIDE - ROOMS */}
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

          {/* RIGHT SIDE - DETAILS */}
          {!selectedRoom ? (
            <Card className="flex items-center justify-center">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  👈 Select a room to view members and work logs
                </p>
              </CardContent>
            </Card>
          ) : (
            <RoomDetails
              roomId={selectedRoom}
              userId={user?.id}
              fetchWorkLogs={fetchWorkLogs}
              workLogs={workLogs}
              logDialogOpen={logDialogOpen}
              setLogDialogOpen={setLogDialogOpen}
              handleAddWorkLog={handleAddWorkLog}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ============ ROOM DETAILS COMPONENT ============ */
function RoomDetails({ roomId, userId }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [logDate, setLogDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Fetch all room data + logs
  const fetchMessages = async () => {
    const { data: roomData } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    const { data: memberData } = await supabase
      .from("room_members")
      .select("user_id, profiles(full_name)")
      .eq("room_id", roomId);

    const { data: logData, error } = await supabase
      .from("work_logs")
      .select("*, profiles(full_name)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch error:", error);
      toast.error("Error fetching messages");
      return;
    }

    setRoomInfo(roomData || null);
    setMembers(memberData || []);
    setMessages(logData || []);
  };

  // ✅ Initial + realtime fetch
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`room_${roomId}_realtime`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "work_logs",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchMessages(); // Always reload to stay in sync
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // ✅ Send new work log
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      toast.error("Please enter your work details.");
      return;
    }

    if (!logDate || !startTime || !endTime) {
      toast.error("Please select date, start and end time.");
      return;
    }

    const { error } = await supabase.from("work_logs").insert({
      user_id: userId,
      room_id: roomId,
      log_date: logDate,
      start_time: startTime,
      end_time: endTime,
      tasks: newMessage.trim(),
    });

    if (error) {
      console.error("Insert error:", error);
      toast.error(`Failed to send: ${error.message}`);
    } else {
      setNewMessage("");
      setLogDate("");
      setStartTime("");
      setEndTime("");
    }
  };

  return (
    <Card className="flex flex-col h-[80vh]">
      <CardHeader className="border-b">
        <CardTitle>{roomInfo?.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Room Code: <b>{roomInfo?.room_code}</b>
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-4 rounded-lg space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground mt-10">
              No work logs yet. Start adding your work!
            </p>
          ) : (
            messages.map((msg: any) => {
              const isMine = msg.user_id === userId;
              const senderName = isMine
                ? "You"
                : msg.profiles?.full_name ||
                  members.find((m) => m.user_id === msg.user_id)?.profiles
                    ?.full_name ||
                  "Unknown";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  <span className="text-xs text-muted-foreground mb-1">
                    {senderName}
                  </span>

                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-accent text-accent-foreground rounded-bl-none"
                    }`}
                  >
                    <div className="text-xs opacity-80 mb-1">
                      📅 {msg.log_date || "--"} <br />
                      🕒 {msg.start_time || "--:--"} - {msg.end_time || "--:--"}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.tasks}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Form */}
        <form
          onSubmit={sendMessage}
          className="mt-4 flex flex-col gap-3 border-t pt-3"
        >
          <div className="flex gap-2">
            <Input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-1/3"
              required
            />
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-1/3"
              required
            />
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-1/3"
              required
            />
          </div>

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Describe your work..."
              className="flex-1"
              required
            />
            <Button type="submit">Add</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

