import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [role, setRole] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Fetch available roles from "roles" table
  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase.from("roles").select("name");

      if (error) {
        console.error("Error fetching roles:", error);
        toast.error("Failed to load roles");
        return;
      }

      if (data && data.length > 0) {
        const uniqueRoles = Array.from(new Set(data.map((r) => r.name)));
        setRoles(uniqueRoles);
        setRole(uniqueRoles[0]);
      } else {
        toast.error("No roles found. Please add roles in your roles table.");
      }
    };

    fetchRoles();
  }, []);

  // ✅ Redirect if logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  // ✅ Handle login or signup
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // 🔑 LOGIN
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Logged in successfully!");
        navigate("/dashboard");
      } else {
        // 🆕 SIGNUP
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        const userId = signUpData?.user?.id;
        if (userId) {
          // ✅ STEP 1 — Insert into profiles (no role)
          const { error: profileError } = await supabase.from("profiles").insert([
            {
              id: userId,
              email,
              full_name: fullName,
              phone,
              profile_pic_url: profilePic,
              date_of_birth: dateOfBirth,
              created_at: new Date().toISOString(),
            },
          ]);
          if (profileError) throw profileError;

          // ✅ STEP 2 — Get role_id from roles table
          const { data: roleData, error: roleFetchError } = await supabase
            .from("roles")
            .select("id")
            .eq("name", role)
            .single();
          
          if (roleFetchError || !roleData) throw roleFetchError || new Error("Role not found");

          // ✅ STEP 3 — Insert into user_roles
          const { error: roleError } = await supabase.from("user_roles").insert([
            {
              user_id: userId,
              role_id: roleData.id,
              role: role as "admin" | "hr" | "employee",
            },
          ]);
          if (roleError) throw roleError;
        }

        toast.success("Account created successfully!");
        setIsLogin(true);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-lg border border-border/40">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary p-3">
              <Briefcase className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-primary">WorkStack</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profilePic">Profile Picture URL</Label>
                  <Input
                    id="profilePic"
                    placeholder="Enter image URL"
                    value={profilePic}
                    onChange={(e) => setProfilePic(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Select Role</Label>
                  <Select value={role} onValueChange={(val) => setRole(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.length > 0 ? (
                        roles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">
                          No roles found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
