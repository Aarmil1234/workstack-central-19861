import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlusCircle, Edit, Trash } from "lucide-react";

export default function Employees() {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    role: "employee",
  });

  // Restrict access
  useEffect(() => {
    if (role !== "admin" && role !== "hr") navigate("/");
  }, [role, navigate]);

  // Fetch joined data
  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        name,
        email,
        phone,
        user_roles (
          role
        )
      `
      );

    if (error) console.error("Error fetching employees:", error);
    else {
      const formatted = data.map((emp) => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: emp.user_roles?.[0]?.role || "employee",
      }));
      setEmployees(formatted);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Handle Add or Edit
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || !formData.email) {
      alert("Please fill in name and email.");
      setLoading(false);
      return;
    }

    try {
      if (editMode) {
        // Update profiles
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
          })
          .eq("id", formData.id);

        // Update role in user_roles
        const { error: roleErr } = await supabase
          .from("user_roles")
          .update({ role: formData.role })
          .eq("user_id", formData.id);

        if (profileErr || roleErr) throw profileErr || roleErr;
      } else {
        // Create new profile
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .insert([
            {
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
            },
          ])
          .select("id")
          .single();

        if (profileErr) throw profileErr;

        // Insert into user_roles
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert([{ user_id: profileData.id, role: formData.role }]);

        if (roleErr) throw roleErr;
      }

      fetchEmployees();
      setOpen(false);
      setFormData({ id: "", name: "", email: "", phone: "", role: "employee" });
      setEditMode(false);
    } catch (err) {
      console.error("Error saving employee:", err);
      alert("Failed to save employee.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;

    const { error: roleErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", id);

    const { error: profileErr } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileErr || roleErr) {
      console.error("Error deleting employee:", profileErr || roleErr);
      alert("Failed to delete employee.");
    } else {
      setEmployees(employees.filter((emp) => emp.id !== id));
    }
  };

  const openEditModal = (emp) => {
    setFormData(emp);
    setEditMode(true);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employees, roles, and details.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData({ id: "", name: "", email: "", phone: "", role: "employee" });
            setEditMode(false);
            setOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-5 w-5" /> Add Employee
        </Button>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-muted-foreground">No employees found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 font-medium">Name</th>
                    <th className="p-2 font-medium">Email</th>
                    <th className="p-2 font-medium">Phone</th>
                    <th className="p-2 font-medium">Role</th>
                    <th className="p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b hover:bg-accent/40 transition-colors"
                    >
                      <td className="p-2">{emp.name}</td>
                      <td className="p-2">{emp.email}</td>
                      <td className="p-2">{emp.phone || "-"}</td>
                      <td className="p-2 capitalize">{emp.role}</td>
                      <td className="p-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(emp)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(emp.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Employee Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="grid gap-3">
              <Input
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="border rounded-md p-2"
              >
                <option value="employee">Employee</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editMode ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
