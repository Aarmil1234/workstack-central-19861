import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Download } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  created_at: string;
  uploaded_by: string;
  employee_name?: string;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function Documents() {
  const { role, user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");

  const canUpload = role === "admin";

  useEffect(() => {
    fetchDocuments();
    if (canUpload) fetchProfiles();
  }, [role, user]);

  // 🔹 Fetch all employee profiles (for dropdown)
  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Failed to fetch employees");
    } else {
      setProfiles(data || []);
    }
  };

  // 🔹 Fetch documents with employee names
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase.from("documents").select("*").order("created_at", { ascending: false });

      if (role === "employee") {
        query = query.eq("user_id", user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch employee names from profiles
      const { data: profileData } = await supabase.from("profiles").select("id, full_name");

      const documentsWithNames = (data || []).map((doc: Document) => {
        const employee = profileData?.find((p) => p.id === doc.user_id);
        return {
          ...doc,
          employee_name: employee?.full_name || "Unknown Employee",
        };
      });

      setDocuments(documentsWithNames);
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle file upload
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    const userId = selectedUser;

    if (!file || !userId) {
      toast.error("Please select a file and employee");
      setUploading(false);
      return;
    }

    try {
      const filePath = `${userId}/${Date.now()}_${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert metadata into DB
      const { error: insertError } = await supabase.from("documents").insert({
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_url: filePath,
        uploaded_by: user?.id,
      });

      if (insertError) throw insertError;

      toast.success("Document uploaded successfully");
      setDialogOpen(false);
      fetchDocuments();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Group documents by date
  const groupedDocs = documents.reduce((acc: Record<string, Document[]>, doc) => {
    const dateKey = new Date(doc.created_at).toLocaleDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            {role === "employee" ? "Your salary slips and files" : "Manage employee documents"}
          </p>
        </div>

        {canUpload && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Select Employee</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <Input id="file" name="file" type="file" required />
                </div>
                <Button type="submit" disabled={uploading} className="w-full">
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* FILE EXPLORER STYLE DISPLAY */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      ) : Object.keys(groupedDocs).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedDocs).map(([date, docs]) => (
            <div key={date}>
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">{date}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc) => {
                  const { data: publicUrlData } = supabase.storage
                    .from("documents")
                    .getPublicUrl(doc.file_url);
                  const publicUrl = publicUrlData.publicUrl;

                  return (
                    <Card key={doc.id} className="hover:shadow-md transition">
                      <CardHeader>
                        <CardTitle className="text-base flex flex-col">
                          <span className="font-semibold text-gray-800">{doc.employee_name}</span>
                          <span className="text-sm text-gray-500">{doc.file_name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>Type: {doc.file_type}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => window.open(publicUrl, "_blank")}
                          >
                            <Download className="mr-2 h-3 w-3" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
