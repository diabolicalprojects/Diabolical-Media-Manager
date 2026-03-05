"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    Users,
    FolderOpen,
    Globe,
    Image,
    Upload,
    Search,
    UserCog,
    LogOut,
    Menu,
    X,
    ChevronRight,
} from "lucide-react";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/clients", label: "Clients", icon: Users },
    { href: "/dashboard/projects", label: "Projects", icon: FolderOpen },
    { href: "/dashboard/domains", label: "Domains", icon: Globe },
    { href: "/dashboard/media", label: "Media Library", icon: Image },
    { href: "/dashboard/upload", label: "Upload", icon: Upload },
    { href: "/dashboard/search", label: "Search", icon: Search },
    { href: "/dashboard/users", label: "Users", icon: UserCog },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("dmm_token");
        const userData = localStorage.getItem("dmm_user");

        if (!token || !userData) {
            router.replace("/login");
            return;
        }

        try {
            setUser(JSON.parse(userData));
        } catch {
            router.replace("/login");
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("dmm_token");
        localStorage.removeItem("dmm_user");
        router.push("/login");
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    }`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                                <path d="M6 8L16 4L26 8V18L16 28L6 18V8Z" fill="black" />
                                <path d="M16 12L20 14V18L16 22L12 18V14L16 12Z" fill="white" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-sm tracking-tight">Diabolical</p>
                            <p className="text-[10px] text-muted uppercase tracking-widest">Media Manager</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="ml-auto lg:hidden p-1 text-muted hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${isActive
                                        ? "bg-white text-black font-medium"
                                        : "text-muted hover:text-white hover:bg-surface-2"
                                    }`}
                            >
                                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                                <span>{item.label}</span>
                                {isActive && <ChevronRight size={14} className="ml-auto" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="p-3 border-t border-border">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-bold uppercase">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-[10px] text-muted uppercase tracking-wider">{user.role}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-muted hover:text-danger transition-colors"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Top bar - mobile */}
                <div className="lg:hidden h-14 bg-surface border-b border-border flex items-center px-4">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-muted hover:text-white transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <span className="ml-3 font-semibold text-sm">Diabolical Media</span>
                </div>

                <div className="p-6 lg:p-8 animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
