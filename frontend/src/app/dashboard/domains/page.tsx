"use client";
import { useEffect, useState } from "react";
import { getDomains, getProjects, createDomain, deleteDomain } from "@/lib/api";
import { Plus, Trash2, Globe, Globe2 } from "lucide-react";

interface Domain {
    id: string;
    domain: string;
    project_name: string;
    client_name: string;
    created_at: string;
}

interface Project {
    id: string;
    name: string;
    client_name: string;
}

export default function DomainsPage() {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ project_id: "", domain: "" });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const [d, p] = await Promise.all([getDomains(), getProjects()]);
            setDomains(d.data.domains || []);
            setProjects(p.data.projects || []);
        } catch { /* handle */ } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createDomain(formData.project_id, formData.domain);
            setFormData({ project_id: "", domain: "" });
            setShowForm(false);
            fetchData();
        } catch { /* handle */ } finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this domain?")) return;
        try { await deleteDomain(id); fetchData(); } catch { /* handle */ }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <Globe size={24} /> Domains
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage domains for projects</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="h-10 px-4 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2">
                    <Plus size={16} /> Add Domain
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-6 space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Project</label>
                            <select value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })} required className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground focus:outline-none focus:border-white/30 text-sm">
                                <option value="">Select project...</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.client_name})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Domain</label>
                            <input type="text" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} required placeholder="e.g. famux.com.mx" className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 text-sm font-mono" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" disabled={submitting} className="h-10 px-6 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50">{submitting ? "Creating..." : "Create Domain"}</button>
                        <button type="button" onClick={() => setShowForm(false)} className="h-10 px-6 border border-border text-sm rounded-lg hover:bg-surface-2">Cancel</button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-shimmer" />)}</div>
            ) : domains.length === 0 ? (
                <div className="text-center py-20">
                    <Globe2 size={48} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-muted">No domains configured yet.</p>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted px-5 py-3">Domain</th>
                                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted px-5 py-3">Project</th>
                                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted px-5 py-3">Client</th>
                                <th className="text-right text-xs font-medium uppercase tracking-wider text-muted px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {domains.map((domain) => (
                                <tr key={domain.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                                    <td className="px-5 py-3 text-sm font-mono">{domain.domain}</td>
                                    <td className="px-5 py-3 text-sm">{domain.project_name}</td>
                                    <td className="px-5 py-3 text-sm text-muted">{domain.client_name}</td>
                                    <td className="px-5 py-3 text-right">
                                        <button onClick={() => handleDelete(domain.id)} className="p-1 text-muted hover:text-danger transition-colors"><Trash2 size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
