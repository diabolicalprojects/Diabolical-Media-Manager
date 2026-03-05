"use client";
import { useEffect, useState } from "react";
import { getProjects, getClients, createProject, deleteProject } from "@/lib/api";
import { Plus, Trash2, FolderOpen, Folder } from "lucide-react";

interface Project {
    id: string;
    name: string;
    slug: string;
    client_name: string;
    client_slug: string;
    created_at: string;
}

interface Client {
    id: string;
    name: string;
    slug: string;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ client_id: "", name: "", slug: "" });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const [projects, clients] = await Promise.all([getProjects(), getClients()]);
            setProjects(projects.data.projects || []);
            setClients(clients.data.clients || []);
        } catch {
            // handle
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createProject(formData.client_id, formData.name, formData.slug);
            setFormData({ client_id: "", name: "", slug: "" });
            setShowForm(false);
            fetchData();
        } catch {
            // handle
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this project?")) return;
        try { await deleteProject(id); fetchData(); } catch { /* handle */ }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <FolderOpen size={24} /> Projects
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage projects for each client</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="h-10 px-4 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> Add Project
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-6 space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Client</label>
                            <select
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                required
                                className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground focus:outline-none focus:border-white/30 text-sm"
                            >
                                <option value="">Select client...</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Project Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    name: e.target.value,
                                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                                })}
                                required
                                placeholder="e.g. Website Redesign"
                                className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Slug</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                required
                                className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground focus:outline-none focus:border-white/30 text-sm font-mono"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" disabled={submitting} className="h-10 px-6 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50">
                            {submitting ? "Creating..." : "Create Project"}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="h-10 px-6 border border-border text-sm rounded-lg hover:bg-surface-2 transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl animate-shimmer" />)}
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-20">
                    <Folder size={48} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-muted">No projects yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project, i) => (
                        <div
                            key={project.id}
                            className="bg-surface border border-border rounded-xl p-5 hover:border-border-hover transition-all group animate-fade-in"
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold">{project.name}</h3>
                                    <p className="text-sm text-muted font-mono mt-1">{project.slug}</p>
                                    <p className="text-xs text-muted mt-2">Client: {project.client_name}</p>
                                </div>
                                <button onClick={() => handleDelete(project.id)} className="p-2 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
