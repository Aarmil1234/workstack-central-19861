import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Send, MoreVertical, Hash, Calendar, Clock } from "lucide-react";
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
  log_time: string | null;
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
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");

  const canCreateRoom = role === "admin" || role === "hr";

  useEffect(() => {
    if (user) fetchRooms();
  }, [user]);

  useEffect(() => {
    if (!selectedRoom) return;

    fetchWorkLogs(selectedRoom);

    const channel = supabase
      .channel("work-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_logs",
          filter: `room_id=eq.${selectedRoom}`,
        },
        () => fetchWorkLogs(selectedRoom)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom]);

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

  const fetchWorkLogs = async (roomId: string) => {
    try {
      const { data } = await supabase
        .from("work_logs")
        .select("*, profiles(full_name)")
        .eq("room_id", roomId)
        .order("log_date", { ascending: false });

      setWorkLogs((data as WorkLog[]) || []);
    } catch {
      toast.error("Failed to fetch work logs");
    }
  };

  const handleCreateRoom = async () => {
    if (!roomNameInput.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      const session = sessionData?.session;

      if (sessionError || !session) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const userId = session.user.id;

      const { data: roomData, error: roomError } = await supabase
        .from("chat_rooms")
        .insert({
          name: roomNameInput,
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

      toast.success(`Room created successfully! Code: ${roomCode}`);
      setCreateDialogOpen(false);
      setRoomNameInput("");
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message || "Failed to create room");
    }
  };

  const handleJoinRoom = async () => {
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

      if (!roomData) {
        toast.error("Invalid room code");
        return;
      }

      await supabase.from("room_members").insert({
        room_id: roomData.id,
        user_id: user?.id,
      });

      toast.success("Joined room successfully!");
      setJoinDialogOpen(false);
      setRoomCodeInput("");
      fetchRooms();
    } catch {
      toast.error("Failed to join room");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Work Log Rooms</h1>
            <p className="text-sm text-gray-500">Track and share your daily work</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canCreateRoom && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-500 hover:bg-green-600">
                  <Plus className="mr-2 h-4 w-4" /> Create Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Work Log Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomName">Room Name</Label>
                    <Input
                      id="roomName"
                      value={roomNameInput}
                      onChange={(e) => setRoomNameInput(e.target.value)}
                      placeholder="Enter room name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateRoom();
                        }
                      }}
                    />
                  </div>
                  <Button onClick={handleCreateRoom} className="w-full bg-green-500 hover:bg-green-600">
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
                <div className="space-y-2">
                  <Label htmlFor="roomCode">Room Code</Label>
                  <Input
                    id="roomCode"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    placeholder="Enter 6-character code"
                    maxLength={6}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleJoinRoom();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleJoinRoom} className="w-full bg-green-500 hover:bg-green-600">
                  Join Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      {rooms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No rooms yet</h3>
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
              <p className="text-xs text-gray-500 mt-0.5">{rooms.length} active {rooms.length === 1 ? 'room' : 'rooms'}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-l-4 ${
                    selectedRoom === room.id
                      ? "bg-green-50 border-green-500"
                      : "border-transparent"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold ${
                    selectedRoom === room.id ? "bg-green-500" : "bg-gray-400"
                  }`}>
                    {room.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${selectedRoom === room.id ? "text-green-700" : "text-gray-900"}`}>
                      {room.name}
                    </p>
                    <p className="text-xs text-gray-500">Code: {room.room_code}</p>
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a room</h3>
                <p className="text-gray-500">Choose a room from the sidebar to view work logs</p>
              </div>
            </div>
          ) : (
            <RoomDetails roomId={selectedRoom} userId={user?.id} />
          )}
        </div>
      )}
    </div>
  );
}

/* ===================== ROOM DETAILS ===================== */
function RoomDetails({ roomId, userId }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [logDate, setLogDate] = useState("");
  const [startTime, setStartTime] = useState({ hour: 9, minute: 0 });
  const [endTime, setEndTime] = useState({ hour: 17, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    .select("*") // 🔹 no profiles join here
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  // Merge manually
  const merged = logData?.map(log => {
    const profile = memberData?.find(m => m.user_id === log.user_id)?.profiles;
    return {
      ...log,
      profiles: profile || null,
    };
  });

  setRoomInfo(roomData);
  setMembers(memberData || []);
  setMessages(merged || []);
};


  useEffect(() => {
  fetchMessages();
  const channel = supabase
    .channel(`room_${roomId}_realtime`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "work_logs", filter: `room_id=eq.${roomId}` },
      () => fetchMessages()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [roomId]);


  const sendMessage = async () => {
    const startTimeString = `${startTime.hour.toString().padStart(2, '0')}:${startTime.minute.toString().padStart(2, '0')}`;
    const endTimeString = `${endTime.hour.toString().padStart(2, '0')}:${endTime.minute.toString().padStart(2, '0')}`;
    
    if (!newMessage.trim() || !logDate) {
      toast.error("Please fill all fields before submitting.");
      return;
    }

    const { error } = await supabase.from("work_logs").insert({
      user_id: userId,
      room_id: roomId,
      log_date: logDate,
      start_time: startTimeString,
      end_time: endTimeString,
      tasks: newMessage.trim(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      setNewMessage("");
      setLogDate("");
      setStartTime({ hour: 9, minute: 0 });
      setEndTime({ hour: 17, minute: 0 });
    }
  };

  const DatePicker = () => {
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState<Date>(logDate ? new Date(logDate) : today);
    const [currentMonth, setCurrentMonth] = useState<Date>(logDate ? new Date(logDate) : today);

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
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const handlePrevMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const handleNextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const handleDateSelect = (day: number) => {
      const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      setSelectedDate(newDate);
      setLogDate(newDate.toISOString().split('T')[0]);
      setShowDatePicker(false);
    };

    const isToday = (day: number) => {
      return (
        day === today.getDate() &&
        currentMonth.getMonth() === today.getMonth() &&
        currentMonth.getFullYear() === today.getFullYear()
      );
    };

    const isSelected = (day: number) => {
      return (
        selectedDate &&
        day === selectedDate.getDate() &&
        currentMonth.getMonth() === selectedDate.getMonth() &&
        currentMonth.getFullYear() === selectedDate.getFullYear()
      );
    };

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

        {/* Display Selected Date */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 bg-purple-50 rounded-xl px-6 py-3">
            <span className="text-2xl font-bold text-purple-600">
              {selectedDate.getDate().toString().padStart(2, '0')}
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

        {/* Month/Year Navigation */}
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

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-semibold text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
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
                className={`h-10 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                  isSelected(day)
                    ? 'bg-purple-500 text-white shadow-md scale-105'
                    : isToday(day)
                    ? 'bg-purple-100 text-purple-600 border-2 border-purple-300'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Quick Select Buttons */}
        <div className="mt-4 pt-4 border-t space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
            Quick Select
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                setCurrentMonth(today);
                setLogDate(today.toISOString().split('T')[0]);
                setShowDatePicker(false);
              }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-purple-100 hover:bg-purple-200 text-purple-700 transition-all"
            >
              Today
            </button>
            <button
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDate(yesterday);
                setCurrentMonth(yesterday);
                setLogDate(yesterday.toISOString().split('T')[0]);
                setShowDatePicker(false);
              }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
            >
              Yesterday
            </button>
          </div>
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

  const CircularTimePicker = ({ type }: { type: 'start' | 'end' }) => {
    const currentTime = type === 'start' ? startTime : endTime;
    const setTime = type === 'start' ? setStartTime : setEndTime;
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    
    return (
      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-2xl border p-6 z-50 w-96">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-700">
            {type === 'start' ? 'Start Time' : 'End Time'}
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
        
        {/* Display Selected Time */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-green-50 rounded-xl px-6 py-3">
            <span className="text-4xl font-bold text-green-600">
              {currentTime.hour.toString().padStart(2, '0')}
            </span>
            <span className="text-3xl font-bold text-green-600">:</span>
            <span className="text-4xl font-bold text-green-600">
              {currentTime.minute.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Hour Selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
            Hour
          </label>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="23"
              step="1"
              value={currentTime.hour}
              onChange={(e) => setTime({ ...currentTime, hour: parseInt(e.target.value) })}
              className="w-full h-3 bg-gradient-to-r from-blue-200 via-green-200 to-orange-200 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, 
                  #6EE7B7 0%, 
                  #10B981 ${(currentTime.hour / 23) * 100}%, 
                  #E5E7EB ${(currentTime.hour / 23) * 100}%, 
                  #E5E7EB 100%)`
              }}
            />
            <div className="flex justify-between mt-1 px-1">
              <span className="text-xs text-gray-400">00</span>
              <span className="text-xs text-gray-400">06</span>
              <span className="text-xs text-gray-400">12</span>
              <span className="text-xs text-gray-400">18</span>
              <span className="text-xs text-gray-400">23</span>
            </div>
          </div>
        </div>

        {/* Minute Selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
            Minute
          </label>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="59"
              step="1"
              value={currentTime.minute}
              onChange={(e) => setTime({ ...currentTime, minute: parseInt(e.target.value) })}
              className="w-full h-3 bg-gradient-to-r from-green-200 to-green-400 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, 
                  #6EE7B7 0%, 
                  #10B981 ${(currentTime.minute / 59) * 100}%, 
                  #E5E7EB ${(currentTime.minute / 59) * 100}%, 
                  #E5E7EB 100%)`
              }}
            />
            <div className="flex justify-between mt-1 px-1">
              <span className="text-xs text-gray-400">00</span>
              <span className="text-xs text-gray-400">15</span>
              <span className="text-xs text-gray-400">30</span>
              <span className="text-xs text-gray-400">45</span>
              <span className="text-xs text-gray-400">59</span>
            </div>
          </div>
        </div>

        {/* Quick Minute Buttons */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
            Quick Select Minutes
          </label>
          <div className="grid grid-cols-6 gap-2">
            {minutes.map((min) => (
              <button
                key={min}
                onClick={() => setTime({ ...currentTime, minute: min })}
                className={`px-2 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentTime.minute === min
                    ? 'bg-green-500 text-white shadow-md scale-105'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {min.toString().padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => setShowTimePicker(null)}
          className="w-full mt-4 bg-green-500 hover:bg-green-600"
        >
          Confirm
        </Button>

        <style>{`
          .slider-thumb::-webkit-slider-thumb {
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            cursor: grab;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4), 0 0 0 4px white;
            border: 2px solid white;
            transition: transform 0.1s ease, box-shadow 0.1s ease;
          }
          .slider-thumb::-moz-range-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 3px 12px rgba(16, 185, 129, 0.5), 0 0 0 4px white;
          }
          .slider-thumb::-moz-range-thumb:active {
            cursor: grabbing;
            transform: scale(1.15);
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.6), 0 0 0 4px white;
          }
          .slider-thumb:focus {
            outline: none;
          }
          .slider-thumb::-webkit-slider-runnable-track {
            height: 12px;
            border-radius: 6px;
          }
          .slider-thumb::-moz-range-track {
            height: 12px;
            border-radius: 6px;
          }
        `}</style>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Room Header */}
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">
            {roomInfo?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{roomInfo?.name}</h2>
            <p className="text-xs text-gray-500">
              {members.length} {members.length === 1 ? "member" : "members"} • Code: {roomInfo?.room_code}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-sm">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">No work logs yet. Start tracking your work!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
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
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[70%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                    {!isMine && (
                      <span className="text-xs font-medium text-gray-700 mb-1 px-3">
                        {senderName}
                      </span>
                    )}
                    <div
                      className={`relative px-4 py-3 rounded-2xl shadow-lg border ${
                        isMine
                          ? "bg-green-500 text-white rounded-br-md"
                          : "bg-white text-gray-800 rounded-bl-md"
                      }`}
                    >
                      {/* Work Log Info */}
                      <div className={`flex items-center gap-3 text-xs mb-2 pb-2 border-b ${
                        isMine ? "border-white/20" : "border-gray-200"
                      }`}>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{msg.log_date || "--"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{msg.start_time || "--:--"} - {msg.end_time || "--:--"}</span>
                        </div>
                      </div>

                      {/* Task Description */}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed pr-12">
                        {msg.tasks}
                      </div>

                      {/* Time Stamp */}
                      <span
                        className={`absolute bottom-2 right-3 text-[10px] ${
                          isMine ? "text-white/80" : "text-gray-500"
                        }`}
                      >
                        {currentTime}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 bg-white border-t">
        <div className="space-y-3 max-w-4xl mx-auto">
          <div className="flex gap-3 items-center">
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg px-4 py-2 border-2 border-purple-200 hover:border-purple-300 transition-all shadow-sm hover:shadow"
              >
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700">
                  {logDate ? new Date(logDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  }) : 'Select Date'}
                </span>
              </button>
              {showDatePicker && <DatePicker />}
            </div>
            
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                <button
                  onClick={() => setShowTimePicker(showTimePicker === 'start' ? null : 'start')}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-green-100 rounded-lg px-4 py-2 border-2 border-green-200 hover:border-green-300 transition-all shadow-sm hover:shadow"
                >
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">
                    {startTime.hour.toString().padStart(2, '0')}:{startTime.minute.toString().padStart(2, '0')}
                  </span>
                </button>
                {showTimePicker === 'start' && <CircularTimePicker type="start" />}
              </div>
              
              <span className="text-gray-400 font-bold">→</span>
              
              <div className="relative">
                <button
                  onClick={() => setShowTimePicker(showTimePicker === 'end' ? null : 'end')}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg px-4 py-2 border-2 border-blue-200 hover:border-blue-300 transition-all shadow-sm hover:shadow"
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">
                    {endTime.hour.toString().padStart(2, '0')}:{endTime.minute.toString().padStart(2, '0')}
                  </span>
                </button>
                {showTimePicker === 'end' && <CircularTimePicker type="end" />}
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Describe your work..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button 
              onClick={sendMessage}
              className="bg-green-500 hover:bg-green-600 rounded-full h-10 w-10 p-0"
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

