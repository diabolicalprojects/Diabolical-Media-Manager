"use client";
import { useEffect, useState, useMemo } from "react";
import { getProjects, getClients, createProject, deleteProject } from "@/lib/api";
import { Plus, Trash2, FolderOpen, Folder, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Project {
    id: string;
    name: string;
    slug: string;
    client_id: string;
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
    const searchParams = useSearchParams();
    const initialClientFilter = searchParams.get("client") || "";

    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ client_id: "", name: "", slug: "" });
    const [submitting, setSubmitting] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState(initialClientFilter);

    const fetchData = async () => {
        try {
            const [projectsRes, clientsRes] = await Promise.all([getProjects(), getClients()]);
            setProjects(projectsRes.data.projects || []);
            setClients(clientsRes.data.clients || []);
        } catch {
            // handle error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Update selected client if url param changes
    useEffect(() => {
        if (searchParams.get("client")) {
            setSelectedClient(searchParams.get("client") || "");
        }
    }, [searchParams]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createProject(formData.client_id, formData.name, formData.slug);
            setFormData({ client_id: "", name: "", slug: "" });
            setShowForm(false);
            fetchData();
        } catch {
            // handle error
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        if (!confirm("Delete this project?")) return;
        try { await deleteProject(id); fetchData(); } catch { /* handle error */ }
    };

    // Filter and group projects by client
    const groupedProjects = useMemo(() => {
        let filtered = projects;

        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedClient) {
            filtered = filtered.filter(p => p.client_id === selectedClient);
        }

        const groups: Record<string, { client_name: string, projects: Project[] }> = {};
        for (const p of filtered) {
            if (!groups[p.client_id]) {
                groups[p.client_id] = { client_name: p.client_name, projects: [] };
            }
            groups[p.client_id].projects.push(p);
        }

        return groups;
    }, [projects, searchTerm, selectedClient]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <FolderOpen size={24} /> Projects
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage projects per client</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="h-10 px-4 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> Add Project
                </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 text-sm"
                    />
                </div>
                <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="h-10 px-4 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:border-white/30 text-sm min-w-[200px]"
                >
                    <option value="">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Create Form */}
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

            {/* Project List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl animate-shimmer" />)}
                </div>
            ) : Object.keys(groupedProjects).length === 0 ? (
                <div className="text-center py-20">
                    <Folder size={48} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-muted">No projects found.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {Object.entries(groupedProjects).map(([clientId, group]) => (
                        <div key={clientId} className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-border pb-2">
                                <h2 className="text-lg font-semibold tracking-wide">{group.client_name}</h2>
                                <span className="bg-surface-2 px-2 py-0.5 rounded-full text-xs font-medium text-muted">{group.projects.length}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.projects.map((project, i) => (
                                    <Link
                                        href={`/dashboard/media?project=${project.id}`}
                                        key={project.id}
                                        className="bg-surface border border-border rounded-xl p-5 hover:border-white/20 transition-all group block relative hover:bg-surface-2"
                                        style={{ animationDelay: `${i * 50}ms` }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold">{project.name}</h3>
                                                <p className="text-sm text-muted font-mono mt-1">{project.slug}</p>
                                            </div>
                                            <button 
                                                onClick={(e) => handleDelete(e, project.id)} 
                                                className="p-2 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all absolute top-3 right-3 z-10"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
