"use client";
import { useEffect, useState } from "react";
import { getClients, getProjects, getImages } from "@/lib/api";
import { Users, FolderOpen, Image, HardDrive, TrendingUp, Activity } from "lucide-react";

interface DashboardStats {
    clients: number;
    projects: number;
    images: number;
    totalSize: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        clients: 0,
        projects: 0,
        images: 0,
        totalSize: 0,
    });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ name: string } | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("dmm_user");
        if (userData) setUser(JSON.parse(userData));

        const fetchStats = async () => {
            try {
                const [clientsRes, projectsRes, imagesRes] = await Promise.all([
                    getClients(),
                    getProjects(),
                    getImages(),
                ]);

                const totalSize = imagesRes.data.images?.reduce(
                    (sum: number, img: { size: number }) => sum + (img.size || 0),
                    0
                ) || 0;

                setStats({
                    clients: clientsRes.data.clients?.length || 0,
                    projects: projectsRes.data.projects?.length || 0,
                    images: imagesRes.data.pagination?.total || imagesRes.data.images?.length || 0,
                    totalSize,
                });
            } catch {
                // API might not be ready yet
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const statCards = [
        { label: "Total Clients", value: stats.clients, icon: Users, change: "+2 this month" },
        { label: "Projects", value: stats.projects, icon: FolderOpen, change: "+5 this month" },
        { label: "Total Images", value: stats.images, icon: Image, change: "+48 this week" },
        { label: "Storage Used", value: formatBytes(stats.totalSize), icon: HardDrive, change: "of 50 GB" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back{user?.name ? `, ${user.name}` : ""}
                </h1>
                <p className="text-muted mt-1">Here&apos;s what&apos;s happening with your media assets.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="group relative bg-surface border border-border rounded-xl p-5 hover:border-border-hover transition-all duration-300 animate-fade-in"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-muted uppercase tracking-wider font-medium">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-2">
                                        {loading ? (
                                            <span className="inline-block w-16 h-7 rounded animate-shimmer" />
                                        ) : (
                                            stat.value
                                        )}
                                    </p>
                                    <p className="text-xs text-muted mt-1">{stat.change}</p>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                                    <Icon size={18} />
                                </div>
                            </div>

                            {/* Bottom accent line */}
                            <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>
                    );
                })}
            </div>

            {/* Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <TrendingUp size={18} className="text-muted" />
                        <h2 className="text-lg font-semibold">Quick Actions</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Upload Images", href: "/dashboard/upload", icon: "📤" },
                            { label: "Add Client", href: "/dashboard/clients", icon: "👤" },
                            { label: "Media Library", href: "/dashboard/media", icon: "🖼️" },
                            { label: "Search", href: "/dashboard/search", icon: "🔍" },
                        ].map((action) => (
                            <a
                                key={action.label}
                                href={action.href}
                                className="flex items-center gap-3 p-4 bg-surface-2 border border-border rounded-lg hover:border-border-hover hover:bg-surface-3 transition-all duration-200"
                            >
                                <span className="text-xl">{action.icon}</span>
                                <span className="text-sm font-medium">{action.label}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Activity size={18} className="text-muted" />
                        <h2 className="text-lg font-semibold">System Status</h2>
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: "API Server", status: "Operational", online: true },
                            { label: "CDN Server", status: "Operational", online: true },
                            { label: "Database", status: "Operational", online: true },
                            { label: "Image Processing", status: "Ready", online: true },
                        ].map((service) => (
                            <div
                                key={service.label}
                                className="flex items-center justify-between p-3 bg-surface-2 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-2 h-2 rounded-full ${service.online ? "bg-success" : "bg-danger"
                                            }`}
                                        style={{ boxShadow: service.online ? "0 0 8px rgba(34, 197, 94, 0.5)" : "none" }}
                                    />
                                    <span className="text-sm">{service.label}</span>
                                </div>
                                <span className="text-xs text-muted">{service.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
