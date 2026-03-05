"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await login(email, password);
            localStorage.setItem("dmm_token", res.data.token);
            localStorage.setItem("dmm_user", JSON.stringify(res.data.user));
            router.push("/dashboard");
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background grid-pattern relative flex items-center justify-center p-4">
            {/* Ambient gradient */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-6">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M6 8L16 4L26 8V18L16 28L6 18V8Z" fill="black" />
                            <path d="M16 12L20 14V18L16 22L12 18V14L16 12Z" fill="white" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Diabolical Media</h1>
                    <p className="text-muted text-sm mt-2">Internal asset management system</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm animate-fade-in">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-muted">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="admin@diabolicalservices.tech"
                            className="w-full h-12 px-4 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-muted">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full h-12 px-4 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <p className="text-center text-muted/50 text-xs mt-8">
                    Diabolical Services © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
