import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Users,
  Send,
  MoreVertical,
  Hash,
  Calendar,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  start_time?: string;
  end_time?: string;
  tasks: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  };
}

export default function ChatRoom() {
  const { role, user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");

  const canCreateRoom = role === "admin" || role === "hr";

  useEffect(() => {
    if (user) fetchRooms();
  }, [user]);

  const fetchRooms = async () => {
    try {
      const { data: memberData } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", user?.id);

      if (!memberData?.length) return;

      const roomIds = memberData.map((m) => m.room_id);
      const { data: roomsData } = await supabase
        .from("chat_rooms")
        .select("*")
        .in("id", roomIds);

      setRooms(roomsData || []);
    } catch {
      toast.error("Failed to fetch rooms");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Work Log Rooms</h1>
            <p className="text-sm text-gray-500">
              Track and share your daily work
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {canCreateRoom && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-green-600">
                  <Plus className="mr-2 h-4 w-4" /> Create Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Work Log Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Label>Room Name</Label>
                  <Input
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    placeholder="Enter room name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateRoom();
                      }
                    }}
                  />
                  <Button
                    onClick={handleCreateRoom}
                    className="w-full bg-primary hover:bg-green-600"
                  >
                    Create Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" /> Join Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Label>Room Code</Label>
                <Input
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleJoinRoom();
                    }
                  }}
                />
                <Button
                  onClick={handleJoinRoom}
                  className="w-full bg-primary hover:bg-green-600"
                >
                  Join Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Layout */}
      {rooms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No rooms yet
            </h3>
            <p className="text-gray-500">
              Create or join a room to start tracking work with your team.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r flex flex-col">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-900">Your Rooms</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {rooms.length} active {rooms.length === 1 ? "room" : "rooms"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-l-4 ${selectedRoom === room.id
                      ? "bg-green-50 border-green-500"
                      : "border-transparent"
                    }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold ${selectedRoom === room.id ? "bg-primary" : "bg-gray-400"
                      }`}
                  >
                    {room.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className={`font-medium ${selectedRoom === room.id
                          ? "text-green-700"
                          : "text-gray-900"
                        }`}
                    >
                      {room.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Code: {room.room_code}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          {!selectedRoom ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Hash className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a room
                </h3>
                <p className="text-gray-500">
                  Choose a room from the sidebar to view work logs
                </p>
              </div>
            </div>
          ) : (
            <RoomDetails roomId={selectedRoom} userId={user?.id} />
          )}
        </div>
      )}
    </div>
  );

  // Create / Join functions
  async function handleCreateRoom() {
    if (!roomNameInput.trim()) {
      toast.error("Please enter a room name");
      return;
    }
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) return toast.error("Session expired");

      const userId = session.user.id;
      const { data: roomData } = await supabase
        .from("chat_rooms")
        .insert({
          name: roomNameInput,
          room_code: roomCode,
          created_by: userId,
        })
        .select()
        .single();

      await supabase.from("room_members").insert({
        room_id: roomData.id,
        user_id: userId,
      });

      toast.success(`Room created! Code: ${roomCode}`);
      setRoomNameInput("");
      setCreateDialogOpen(false);
      fetchRooms();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleJoinRoom() {
    if (!roomCodeInput.trim()) {
      toast.error("Please enter a room code");
      return;
    }
    try {
      const { data: roomData } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("room_code", roomCodeInput.toUpperCase())
        .single();

      if (!roomData) return toast.error("Invalid room code");

      await supabase.from("room_members").insert({
        room_id: roomData.id,
        user_id: user?.id,
      });

      toast.success("Joined room successfully!");
      setRoomCodeInput("");
      setJoinDialogOpen(false);
      fetchRooms();
    } catch {
      toast.error("Failed to join room");
    }
  }
}

/* ===================== ROOM DETAILS ===================== */
function RoomDetails({ roomId, userId }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [logDate, setLogDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState({ hour: 9, minute: 0 });
  const [endTime, setEndTime] = useState({ hour: 17, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState<"start" | "end" | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "--";
    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  };


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Fetch messages
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

    const { data: logData } = await supabase
      .from("work_logs")
      .select("*, profiles(full_name)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    setRoomInfo(roomData);
    setMembers(memberData || []);
    setMessages(logData || []);
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`room_${roomId}_realtime`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "work_logs", filter: `room_id=eq.${roomId}` }, fetchMessages)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [roomId]);

  const sendMessage = async () => {
    const startTimeString = `${startTime.hour.toString().padStart(2, "0")}:${startTime.minute
      .toString()
      .padStart(2, "0")}`;
    const endTimeString = `${endTime.hour.toString().padStart(2, "0")}:${endTime.minute
      .toString()
      .padStart(2, "0")}`;
    if (!newMessage.trim() || !logDate)
      return toast.error("Please fill all fields before submitting.");

    const { error } = await supabase.from("work_logs").insert({
      user_id: userId,
      room_id: roomId,
      log_date: logDate,
      start_time: startTimeString,
      end_time: endTimeString,
      tasks: newMessage.trim(),
    });

    if (error) toast.error(error.message);
    else {
      setNewMessage("");
      setLogDate("");
      setStartTime({ hour: 9, minute: 0 });
      setEndTime({ hour: 17, minute: 0 });
    }
  };

  /* -------------------- Date Picker -------------------- */
  const DatePicker = () => {
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState<Date>(
      logDate ? new Date(logDate) : today
    );
    const [currentMonth, setCurrentMonth] = useState<Date>(
      logDate ? new Date(logDate) : today
    );

    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();

    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    ).getDay();

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const handlePrevMonth = () =>
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
      );
    const handleNextMonth = () =>
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
      );

    const handleDateSelect = (day: number) => {
      const newDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      setSelectedDate(newDate);

      // ✅ Local date format (fixes 1-day behind bug)
      const formattedDate = `${newDate.getFullYear()}-${String(
        newDate.getMonth() + 1
      ).padStart(2, "0")}-${String(newDate.getDate()).padStart(2, "0")}`;

      setLogDate(formattedDate);
      setShowDatePicker(false);
    };


    const isToday = (day: number) =>
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();

    const isSelected = (day: number) =>
      selectedDate &&
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear();

    return (
      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-2xl border p-6 z-50 w-96">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-700">Select Date</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDatePicker(false)}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
          >
            ✕
          </Button>
        </div>
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 bg-purple-50 rounded-xl px-6 py-3">
            <span className="text-2xl font-bold text-purple-600">
              {selectedDate.getDate().toString().padStart(2, "0")}
            </span>
            <div className="border-l-2 border-purple-200 pl-3">
              <div className="text-xs text-purple-500 font-medium">
                {monthNames[selectedDate.getMonth()].slice(0, 3).toUpperCase()}
              </div>
              <div className="text-lg font-bold text-purple-600">
                {selectedDate.getFullYear()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
          >
            ←
          </Button>
          <span className="font-semibold text-gray-800">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
          >
            →
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-gray-500 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            return (
              <button
                key={day}
                onClick={() => handleDateSelect(day)}
                className={`h-10 rounded-lg text-sm font-medium transition-all hover:scale-105 ${isSelected(day)
                    ? "bg-purple-500 text-white shadow-md scale-105"
                    : isToday(day)
                      ? "bg-purple-100 text-purple-600 border-2 border-purple-300"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                  }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <Button
          onClick={() => setShowDatePicker(false)}
          className="w-full mt-4 bg-purple-500 hover:bg-purple-600"
        >
          Confirm
        </Button>
      </div>
    );
  };

  /* -------------------- Circular Time Picker -------------------- */
  const CircularTimePicker = ({
    type,
  }: {
    type: "start" | "end";
  }) => {
    const currentTime = type === "start" ? startTime : endTime;
    const setTime = type === "start" ? setStartTime : setEndTime;

    const minutes = [0, 15, 30, 45];

    return (
      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-2xl border p-6 z-50 w-96">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-700">
            {type === "start" ? "Start Time" : "End Time"}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTimePicker(null)}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
          >
            ✕
          </Button>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-green-50 rounded-xl px-6 py-3">
            <span className="text-4xl font-bold text-green-600">
              {currentTime.hour.toString().padStart(2, "0")}
            </span>
            <span className="text-3xl font-bold text-green-600">:</span>
            <span className="text-4xl font-bold text-green-600">
              {currentTime.minute.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex justify-between mb-4">
          {minutes.map((m) => (
            <button
              key={m}
              onClick={() => setTime({ ...currentTime, minute: m })}
              className={`px-4 py-2 rounded-lg text-sm ${currentTime.minute === m
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {m.toString().padStart(2, "0")}
            </button>
          ))}
        </div>

        <Button
          onClick={() => setShowTimePicker(null)}
          className="w-full mt-4 bg-primary hover:bg-green-600"
        >
          Confirm
        </Button>
      </div>
    );
  };

  /* -------------------- Chat Layout -------------------- */
  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="px-6 py-4 border-b bg-white flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-gray-900">{roomInfo?.name}</h2>
          <p className="text-xs text-gray-500">
            {members.length} members • Code: {roomInfo?.room_code}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((msg: any) => {
          const isMine = msg.user_id === userId;
          const senderName = isMine
            ? "You"
            : msg.profiles?.full_name ||
            members.find((m) => m.user_id === msg.user_id)?.profiles
              ?.full_name ||
            "Unknown";

          const currentTime = new Date(msg.created_at).toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
          );
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}


            >
              {!isMine && (
                <span className="text-xs font-medium text-gray-700 mb-1 px-3">
                  {senderName}
                </span>
              )}
              <div
                className={`max-w-[70%] ${isMine ? "bg-primary text-white" : "bg-white text-gray-800"
                  } p-3 rounded-2xl shadow-lg border my-1 relative`}
              >
                <div className="text-xs opacity-80 mb-1">
                  📅 {formatDisplayDate(msg.log_date)} • 🕒 {msg.start_time} - {msg.end_time}

                </div>
                <p className="whitespace-pre-wrap">{msg.tasks}</p>
                <span
                  className={`absolute bottom-1 right-2 text-[10px] ${isMine ? "text-white/80" : "text-gray-500"
                    }`}
                >
                  {currentTime}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-6 py-4 bg-white border-t">
        <div className="flex flex-col-12 gap-3 max-w-4xl mx-auto">
          {/* Date Picker */}
          <div className="relative flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border">
            <Calendar
              className="h-4 w-4 text-gray-500 cursor-pointer"
              onClick={() => setShowDatePicker(!showDatePicker)}
            />
            <span
              className="text-sm text-gray-700 cursor-pointer"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              {logDate ? formatDisplayDate(logDate) : "Select date"}
            </span>

            {showDatePicker && <DatePicker />}
          </div>

          {/* Time Pickers */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                setShowTimePicker(showTimePicker === "start" ? null : "start")
              }
              className="flex items-center gap-2 bg-green-50 rounded-lg px-4 py-2 border-2 border-green-200 hover:border-green-300 transition-all shadow-sm hover:shadow"
            >
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                {startTime.hour.toString().padStart(2, "0")}:
                {startTime.minute.toString().padStart(2, "0")}
              </span>
            </button>
            {showTimePicker === "start" && <CircularTimePicker type="start" />}

            <span className="text-gray-400 font-bold self-center">→</span>

            <button
              onClick={() =>
                setShowTimePicker(showTimePicker === "end" ? null : "end")
              }
              className="flex items-center gap-2 bg-blue-50 rounded-lg px-4 py-2 border-2 border-blue-200 hover:border-blue-300 transition-all shadow-sm hover:shadow"
            >
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">
                {endTime.hour.toString().padStart(2, "0")}:
                {endTime.minute.toString().padStart(2, "0")}
              </span>
            </button>
            {showTimePicker === "end" && <CircularTimePicker type="end" />}
          </div>
              </div>
              <div className="flex flex-col-12 my-2 mx-auto">
          {/* Message Input */}
          <div className="flex items-center gap-3 w-full">
  <Input
    value={newMessage}
    onChange={(e) => setNewMessage(e.target.value)}
    placeholder="Describe your work..."
    className="flex-1 w-full"
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }}
  />
  <Button
    onClick={sendMessage}
    className="bg-primary hover:bg-green-600 rounded-full h-10 w-10 p-0 flex-shrink-0"
    size="icon"
  >
    <Send className="h-5 w-5" />
  </Button>
</div>

        </div>
      </div>
    </div>
  );
}
