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

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  created_at: string;
  user_id: string;
}

export default function Documents() {
  const { role, user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canUpload = role === "admin";

  useEffect(() => {
    fetchDocuments();
  }, [role, user]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase.from("documents").select("*").order("created_at", { ascending: false });

      if (role === "employee") {
        query = query.eq("user_id", user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      toast.error("Please select a file and employee");
      setUploading(false);
      return;
    }

    try {
      // For demo purposes, we'll store file info in the database
      // In production, you'd upload to storage bucket first
      const { error } = await supabase.from("documents").insert({
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_url: "#", // Would be actual storage URL
        uploaded_by: user?.id,
      });

      if (error) throw error;

      toast.success("Document uploaded successfully");
      setDialogOpen(false);
      fetchDocuments();
    } catch (error: any) {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            {role === "employee" ? "Your salary slips and documents" : "Manage employee documents"}
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
                  <Label htmlFor="userId">Employee ID</Label>
                  <Input id="userId" name="userId" placeholder="Enter employee user ID" required />
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

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {doc.file_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Type: {doc.file_type}</p>
                  <p className="text-muted-foreground">
                    Date: {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <Download className="mr-2 h-3 w-3" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
