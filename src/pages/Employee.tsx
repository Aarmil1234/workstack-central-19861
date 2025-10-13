import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, UserCircle, Loader2, Edit } from "lucide-react";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    profile_pic_url: "",
    role: "employee",
  });

  // 🔹 Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, date_of_birth, profile_pic_url");
      if (error) {
        console.error(error);
        toast.error("Failed to load employees");
      } else {
        setEmployees(data);
      }
      setLoading(false);
    };
    fetchEmployees();
  }, []);

  // 🔹 Fetch roles from user_roles table
  // 🔹 Fetch roles from the "roles" table
useEffect(() => {
  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("roles")
      .select("name") // assuming your column is "name"
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles");
    } else {
      setRoles(data.map((r: any) => r.name));
    }
  };

  fetchRoles();
}, []);


  // 🔹 Add or update employee
  const handleSaveEmployee = async () => {
    try {
      if (selectedEmployee) {
        // Update profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            date_of_birth: formData.date_of_birth,
            profile_pic_url: formData.profile_pic_url,
          })
          .eq("id", selectedEmployee.id);

        if (updateError) throw updateError;

        // Update role in user_roles
        const { error: roleUpdateError } = await supabase
          .from("user_roles")
          .update({ role: formData.role })
          .eq("user_id", selectedEmployee.id);

        if (roleUpdateError) throw roleUpdateError;

        toast.success("Employee updated successfully!");
      } else {
        // Insert profile
        const { data: insertedProfile, error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              full_name: formData.full_name,
              email: formData.email,
              phone: formData.phone,
              date_of_birth: formData.date_of_birth,
              profile_pic_url: formData.profile_pic_url,
            },
          ])
          .select("id")
          .single();

        if (profileError) throw profileError;
        const newUserId = insertedProfile.id;

        // Insert role in user_roles
        const { error: roleError } = await supabase.from("user_roles").insert([
          {
            user_id: newUserId,
            role: formData.role,
          },
        ]);

        if (roleError) throw roleError;

        toast.success("Employee added successfully!");
      }

      // Reset
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        date_of_birth: "",
        profile_pic_url: "",
        role: "employee",
      });
      setSelectedEmployee(null);
      setOpenAddModal(false);
      setOpenViewModal(false);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save employee");
    }
  };

  // 🔹 Handle card click (open edit modal)
  const handleCardClick = (employee: any) => {
    setSelectedEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      date_of_birth: employee.date_of_birth,
      profile_pic_url: employee.profile_pic_url,
      role: "employee",
    });
    setOpenViewModal(true);
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Employee Management</h1>
          <p className="text-gray-500 text-sm">Manage all employees in your organization</p>
        </div>
        <Button onClick={() => setOpenAddModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* CONTENT */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
              <span className="ml-2 text-gray-600">Loading employees...</span>
            </div>
          ) : employees.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No employees found</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {employees.map((emp) => (
                <Card
                  key={emp.id}
                  className="p-5 hover:shadow-xl transition cursor-pointer border-gray-200"
                  onClick={() => handleCardClick(emp)}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    {emp.profile_pic_url ? (
                      <img
                        src={emp.profile_pic_url}
                        alt={emp.full_name}
                        className="w-20 h-20 rounded-full object-cover border"
                      />
                    ) : (
                      <UserCircle className="w-20 h-20 text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{emp.full_name}</h3>
                      <p className="text-sm text-gray-600">{emp.email}</p>
                      <p className="text-sm text-gray-500">{emp.phone}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD EMPLOYEE MODAL */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSaveEmployee}
            roles={roles}
          />
        </DialogContent>
      </Dialog>

      {/* VIEW / EDIT EMPLOYEE MODAL */}
      <Dialog open={openViewModal} onOpenChange={setOpenViewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee Details</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSaveEmployee}
            roles={roles}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ✅ Employee Form Component
function EmployeeForm({
  formData,
  setFormData,
  onSave,
  roles,
}: {
  formData: any;
  setFormData: any;
  onSave: any;
  roles: string[];
}) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Full Name</Label>
        <Input
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
        />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div>
        <Label>Phone</Label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>
      <div>
        <Label>Date of Birth</Label>
        <Input
          type="date"
          value={formData.date_of_birth}
          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
        />
      </div>
      <div>
        <Label>Profile Picture URL</Label>
        <Input
          value={formData.profile_pic_url}
          onChange={(e) => setFormData({ ...formData, profile_pic_url: e.target.value })}
        />
      </div>
      <div>
        <Label>Role</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onSave} className="w-full mt-2 flex items-center justify-center gap-2">
        <Edit className="h-4 w-4" />
        Save Changes
      </Button>
    </div>
  );
}
