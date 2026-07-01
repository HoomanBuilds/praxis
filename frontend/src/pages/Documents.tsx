import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/badges";
import { titleCase } from "@/lib/utils";
import { Upload, Play, Loader2, ArrowRight } from "lucide-react";

export default function Documents() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: documents, isLoading } = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });

  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");

  const uploadMut = useMutation({
    mutationFn: () => api.ingest(file!, reference, title, false),
    onSuccess: () => {
      setFile(null); setReference(""); setTitle("");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const processMut = useMutation({
    mutationFn: (id: string) => api.processDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Regulations</h1>
        <p className="text-sm text-muted-foreground">Ingest SEBI circulars and run the scale-aware extraction pipeline. Each becomes a compliance workspace.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" /> Upload a circular</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground">PDF file</label>
              <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reference (optional)</label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="SEBI/HO/.../CIR/2026/1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Title (optional)</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cyber Security Circular" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button disabled={!file || uploadMut.isPending} onClick={() => uploadMut.mutate()}>
              {uploadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
            {uploadMut.isError && <span className="text-sm text-destructive">Upload failed.</span>}
            {uploadMut.isSuccess && <span className="text-sm text-success">Uploaded — run extraction below.</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Documents</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : documents?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 font-medium">Document</th>
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Obligations</th>
                    <th className="py-2 font-medium">LLM calls</th>
                    <th className="py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5">
                        <div className="font-medium">{d.title || d.reference || d.id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{d.page_count} pages · quality {(d.parse_quality * 100).toFixed(0)}%</div>
                      </td>
                      <td className="py-2.5">{titleCase(d.document_type)}</td>
                      <td className="py-2.5"><StatusBadge status={d.status} /></td>
                      <td className="py-2.5">{d.funnel?.obligations_total ?? "—"}</td>
                      <td className="py-2.5">{d.funnel ? `${d.funnel.llm_calls}` : "—"}</td>
                      <td className="py-2.5 text-right">
                        {d.status === "ingested" ? (
                          <Button size="sm" variant="outline" disabled={processMut.isPending} onClick={() => processMut.mutate(d.id)}>
                            {processMut.isPending && processMut.variables === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            Run extraction
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/documents/${d.id}/review`)}>
                            Review <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No documents yet.</div>
          )}
          {processMut.isError && <div className="text-sm text-destructive mt-2">Extraction failed — is the LLM (Ollama) running?</div>}
        </CardContent>
      </Card>
    </div>
  );
}
