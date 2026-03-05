"use client";
import { useState } from "react";
import { searchImages } from "@/lib/api";
import { Search as SearchIcon, Image, ImageOff } from "lucide-react";

interface ImageResult {
    id: string;
    filename: string;
    slug: string;
    size: number;
    format: string;
    client_name: string;
    client_slug: string;
    created_at: string;
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ImageResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSearched(true);
        try {
            const res = await searchImages(query);
            setResults(res.data.images || []);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return "—";
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                    <SearchIcon size={24} /> Search
                </h1>
                <p className="text-muted text-sm mt-1">Search images by filename or slug</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1 relative">
                    <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search images..."
                        className="w-full h-12 pl-11 pr-4 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted/50 focus:outline-none focus:border-white/30 transition-colors"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-6 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors"
                >
                    Search
                </button>
            </form>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg animate-shimmer" />)}
                </div>
            ) : searched && results.length === 0 ? (
                <div className="text-center py-16">
                    <ImageOff size={40} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-muted">No results found for &ldquo;{query}&rdquo;</p>
                </div>
            ) : results.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-sm text-muted">{results.length} result{results.length !== 1 ? "s" : ""}</p>
                    <div className="bg-surface border border-border rounded-xl overflow-hidden">
                        {results.map((image) => (
                            <div key={image.id} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                                <div className="w-10 h-10 rounded bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
                                    <Image size={16} className="text-muted/30" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{image.filename}</p>
                                    <p className="text-xs text-muted">{image.client_name} · {image.format} · {formatBytes(image.size)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
