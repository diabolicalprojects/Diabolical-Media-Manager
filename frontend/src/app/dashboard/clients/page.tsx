"use client";
import { useEffect, useState } from "react";
import { getClients, createClient, deleteClient } from "@/lib/api";
import { Plus, Trash2, Users, Building2 } from "lucide-react";
import Link from "next/link";

interface Client {
    id: string;
    name: string;
    slug: string;
    created_at: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: "", slug: "" });
    const [submitting, setSubmitting] = useState(false);

    const fetchClients = async () => {
        try {
            const res = await getClients();
            setClients(res.data.clients || []);
        } catch {
            // handle error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createClient(formData.name, formData.slug);
            setFormData({ name: "", slug: "" });
            setShowForm(false);
            fetchClients();
        } catch {
            // handle error
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this client and all associated data?")) return;
        try {
            await deleteClient(id);
            fetchClients();
        } catch {
            // handle error
        }
    };

    const handleNameChange = (name: string) => {
        setFormData({
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"),
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <Users size={24} /> Clients
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage your client accounts</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="h-10 px-4 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> Add Client
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <form
                    onSubmit={handleCreate}
                    className="bg-surface border border-border rounded-xl p-6 space-y-4 animate-fade-in"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Client Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                required
                                placeholder="e.g. Famux"
                                className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 transition-colors text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Slug</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                required
                                placeholder="e.g. famux"
                                className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 transition-colors text-sm font-mono"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="h-10 px-6 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                        >
                            {submitting ? "Creating..." : "Create Client"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="h-10 px-6 border border-border text-sm rounded-lg hover:bg-surface-2 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Clients List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 rounded-xl animate-shimmer" />
                    ))}
                </div>
            ) : clients.length === 0 ? (
                <div className="text-center py-20">
                    <Building2 size={48} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-muted">No clients yet. Add your first client to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client, i) => (
                        <Link 
                            href={`/dashboard/projects?client=${client.id}`}
                            key={client.id}
                            className="bg-surface border border-border rounded-xl p-5 hover:border-white/20 transition-all duration-200 group animate-fade-in block relative cursor-pointer hover:bg-surface-2"
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold">{client.name}</h3>
                                    <p className="text-sm text-muted font-mono mt-1">{client.slug}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDelete(client.id);
                                    }}
                                    className="p-2 text-muted z-10 hover:text-danger opacity-0 group-hover:opacity-100 transition-all absolute top-3 right-3"
                                    title="Delete client"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <p className="text-xs text-muted mt-4">
                                Created {new Date(client.created_at).toLocaleDateString()}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
