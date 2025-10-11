"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DebugRoles() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      setData(data);
      setError(error);
      console.log("USER ROLES DATA =>", data);
      console.log("USER ROLES ERROR =>", error);
    };
    fetch();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">🔍 Debug user_roles</h1>
      {error && <div className="text-red-500">❌ {error.message}</div>}
      <pre className="bg-gray-100 p-2 rounded text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
