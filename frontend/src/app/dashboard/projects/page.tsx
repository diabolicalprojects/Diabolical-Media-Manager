"use client";
import { useEffect, useState, useMemo } from "react";
import { getProjects, getClients, createProject, deleteProject, getApiKeys, createApiKey, deleteApiKey } from "@/lib/api";
import { Plus, Trash2, FolderOpen, Folder, Search, Key, Copy, Check, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

interface ApiKey {
    id: string;
    name: string;
    key: string;
    created_at: string;
    last_used_at: string | null;
}

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
    
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState(initialClientFilter);

    // API Keys logic
    const [selectedProjectForKeys, setSelectedProjectForKeys] = useState<Project | null>(null);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [keysLoading, setKeysLoading] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [creatingKey, setCreatingKey] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const fetchKeys = async (projectId: string) => {
        setKeysLoading(true);
        try {
            const res = await getApiKeys(projectId);
            setApiKeys(res.data.keys || []);
        } catch { /* ignore */ } finally {
            setKeysLoading(false);
        }
    };

    const handleOpenKeys = (e: React.MouseEvent, project: Project) => {
        e.preventDefault(); // Prevent Link navigation
        setSelectedProjectForKeys(project);
        fetchKeys(project.id);
    };

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectForKeys || !newKeyName.trim()) return;
        setCreatingKey(true);
        try {
            await createApiKey(selectedProjectForKeys.id, newKeyName.trim());
            setNewKeyName("");
            fetchKeys(selectedProjectForKeys.id);
        } catch (error: any) {
            alert(error.response?.data?.error || "Error creating key");
        } finally {
            setCreatingKey(false);
        }
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
        try {
            await deleteApiKey(keyId);
            if (selectedProjectForKeys) fetchKeys(selectedProjectForKeys.id);
        } catch { /* ignore */ }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(text);
        setTimeout(() => setCopiedKey(null), 2000);
    };

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
                                            <div className="flex items-center gap-1 absolute top-3 right-3 z-10 transition-all">
                                                <button 
                                                    onClick={(e) => handleOpenKeys(e, project)} 
                                                    className="p-2 text-muted hover:text-brand bg-surface border border-transparent rounded-lg hover:border-border hover:bg-surface-2"
                                                    title="API Keys"
                                                >
                                                    <Key size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDelete(e, project.id)} 
                                                    className="p-2 text-muted hover:text-danger bg-surface border border-transparent rounded-lg hover:border-border hover:bg-surface-2"
                                                    title="Delete Project"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* API Keys Modal */}
            {selectedProjectForKeys && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] p-4 sm:p-8 flex items-center justify-center animate-fade-in" onClick={() => setSelectedProjectForKeys(null)}>
                    <div 
                        className="bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-xl flex items-center gap-2">
                                    <Key size={20} className="text-brand" /> {selectedProjectForKeys.name} - API Keys
                                </h3>
                                <p className="text-sm text-muted mt-1">Manage access keys for this project</p>
                            </div>
                            <button onClick={() => setSelectedProjectForKeys(null)} className="p-2 text-muted hover:text-white rounded-lg hover:bg-surface-2 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Create new key */}
                            <form onSubmit={handleCreateKey} className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="New key name (e.g. Website Plugin)"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    className="flex-1 h-11 px-4 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 text-sm"
                                    required
                                />
                                <button type="submit" disabled={creatingKey || !newKeyName.trim()} className="h-11 px-6 bg-brand text-white font-medium rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50">
                                    {creatingKey ? 'Creating...' : 'Generate New Key'}
                                </button>
                            </form>

                            {/* List existing keys */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-muted">Active Keys</h4>
                                
                                {keysLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl animate-shimmer" />)}
                                    </div>
                                ) : apiKeys.length === 0 ? (
                                    <div className="text-center py-8 bg-surface-2/30 rounded-xl border border-dashed border-border/50">
                                        <p className="text-sm text-muted">No API keys generated yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {apiKeys.map((k) => (
                                            <div key={k.id} className="bg-surface-2 border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="font-semibold text-sm">{k.name}</span>
                                                        <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded text-muted font-medium">
                                                            {new Date(k.created_at).toLocaleDateString()}
                                                        </span>
                                                        {k.last_used_at && (
                                                            <span className="text-[10px] text-brand/80 font-medium">
                                                                Last used: {new Date(k.last_used_at).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-xs bg-black/50 px-3 py-1.5 rounded-md font-mono text-emerald-400 break-all select-all flex-1 border border-border/50 shadow-inner">
                                                            {k.key}
                                                        </code>
                                                        <button
                                                            onClick={() => copyToClipboard(k.key)}
                                                            className="p-1.5 bg-surface border border-border rounded-md hover:bg-surface-3 transition-colors text-muted hover:text-white"
                                                            title="Copy key"
                                                        >
                                                            {copiedKey === k.key ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRevokeKey(k.id)}
                                                    className="sm:self-stretch px-4 py-2 text-xs font-semibold text-danger border border-danger/30 rounded-lg hover:bg-danger/10 hover:border-danger hover:text-danger flex-shrink-0 transition-all"
                                                >
                                                    Revoke
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>, 
                document.body
            )}
        </div>
    );
}
