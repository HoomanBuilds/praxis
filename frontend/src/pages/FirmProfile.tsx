import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { INTERMEDIARY_CLASSES } from "@/lib/constants";
import { Building } from "lucide-react";

const FIRM_TYPES = INTERMEDIARY_CLASSES.map((c) => ({ value: c, label: c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) }));

export default function FirmProfile() {
  const qc = useQueryClient();
  const { data: config } = useQuery({ queryKey: ["org-config"], queryFn: api.getOrgConfig });

  const [firmName, setFirmName] = useState("");
  const [firmType, setFirmType] = useState("");
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    if (config) {
      setFirmName(config.firm_name || "");
      setFirmType(config.firm_type || "");
      setClasses(config.intermediary_classes || []);
    }
  }, [config]);

  const save = useMutation({
    mutationFn: () => api.updateOrgConfig({ firm_name: firmName, firm_type: firmType, intermediary_classes: classes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-config"] }),
  });

  const toggleClass = (c: string) => {
    setClasses((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Building className="h-5 w-5" /> Firm Profile</h1>
        <p className="text-sm text-muted-foreground">Organisation identity and regulatory classification.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Organisation Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Firm Name</label>
            <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="e.g. Meridian Securities Pvt. Ltd." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Primary Firm Type</label>
            <Select options={FIRM_TYPES} value={firmType} onChange={(e) => setFirmType(e.target.value)} placeholder="Select type" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Applicable Intermediary Classes</label>
            <div className="flex flex-wrap gap-2">
              {INTERMEDIARY_CLASSES.map((c) => (
                <button key={c} onClick={() => toggleClass(c)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${classes.includes(c) ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
                  {c.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
