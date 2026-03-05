"use client";
import { useEffect, useState } from "react";
import { getUsers, register, deleteUser, updateUser } from "@/lib/api";
import { UserCog, Plus, Trash2, Shield, Edit3, UserX } from "lucide-react";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "viewer" });
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = async () => {
        try {
            const res = await getUsers();
            setUsers(res.data.users || []);
        } catch { /* handle */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await register(formData.name, formData.email, formData.password, formData.role);
            setFormData({ name: "", email: "", password: "", role: "viewer" });
            setShowForm(false);
            fetchUsers();
        } catch { /* handle */ }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this user?")) return;
        try { await deleteUser(id); fetchUsers(); } catch { /* handle */ }
    };

    const handleRoleChange = async (id: string, role: string) => {
        try {
            await updateUser(id, { role });
            fetchUsers();
        } catch { /* handle */ }
    };

    const roleColors: Record<string, string> = {
        admin: "bg-white text-black",
        editor: "bg-surface-3 text-foreground border border-border",
        viewer: "bg-surface-2 text-muted border border-border",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <UserCog size={24} /> Users
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage team access and permissions</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="h-10 px-4 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2">
                    <Plus size={16} /> Add User
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-6 space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Name</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="John Doe" className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Email</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="john@example.com" className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Password</label>
                            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required placeholder="••••••••" className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wider text-muted">Role</label>
                            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground focus:outline-none focus:border-white/30 text-sm">
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" disabled={submitting} className="h-10 px-6 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50">{submitting ? "Creating..." : "Create User"}</button>
                        <button type="button" onClick={() => setShowForm(false)} className="h-10 px-6 border border-border text-sm rounded-lg hover:bg-surface-2">Cancel</button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-shimmer" />)}</div>
            ) : users.length === 0 ? (
                <div className="text-center py-20">
                    <UserX size={48} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-muted">No users found.</p>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted px-5 py-3">User</th>
                                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted px-5 py-3">Role</th>
                                <th className="text-left text-xs font-medium uppercase tracking-wider text-muted px-5 py-3">Created</th>
                                <th className="text-right text-xs font-medium uppercase tracking-wider text-muted px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-bold uppercase">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{user.name}</p>
                                                <p className="text-xs text-muted">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            className={`px-2 py-1 rounded text-xs font-medium ${roleColors[user.role] || ""}`}
                                        >
                                            <option value="viewer">Viewer</option>
                                            <option value="editor">Editor</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-muted">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="px-5 py-3 text-right">
                                        <button onClick={() => handleDelete(user.id)} className="p-1 text-muted hover:text-danger transition-colors">
                                            <Trash2 size={14} />
                                        </button>
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
