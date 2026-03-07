"use client";
import { useEffect, useState, useMemo } from "react";
import { searchImages, deleteImage } from "@/lib/api";
import { Search as SearchIcon, ImageOff, Trash2, Copy, ExternalLink, Image as ImageIcon } from "lucide-react";
import { createPortal } from "react-dom";

interface ImageResult {
    id: string;
    filename: string;
    slug: string;
    path: string;
    size: number;
    width: number;
    height: number;
    format: string;
    client_name: string;
    client_slug: string;
    project_name: string;
    tags: string[];
    created_at: string;
}

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "https://api.diabolicalservices.tech";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ImageResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
    const [copied, setCopied] = useState(false);

    // Debounced search
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (!query.trim()) {
                setResults([]);
                setSearched(false);
                return;
            }
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
        }, 400); // 400ms debounce

        return () => clearTimeout(handler);
    }, [query]);

    const formatBytes = (bytes: number) => {
        if (!bytes) return "—";
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const getCdnUrl = (image: ImageResult) => {
        const normalizedPath = (image.path || "").replace(/\\/g, "/").replace(/^clients\//, "");
        return `${CDN_URL}/${normalizedPath}`;
    };

    const copyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this image?")) return;
        try {
            await deleteImage(id);
            setSelectedImage(null);
            setResults(prev => prev.filter(img => img.id !== id));
        } catch { /* handle error */ }
    };

    const Modal = useMemo(() => {
        if (!selectedImage || typeof document === 'undefined') return null;
        return createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] p-4 sm:p-8 flex items-center justify-center animate-fade-in" onClick={() => setSelectedImage(null)}>
                <div 
                    className="bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden" 
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Left: Image Preview */}
                    <div className="md:w-3/5 bg-surface-2 flex items-center justify-center p-4 relative min-h-[300px]">
                        <div className="absolute inset-0 pattern-dots text-muted/20 opacity-30" />
                        {selectedImage.format === 'svg' || selectedImage.format === 'svg+xml' ? (
                            <img src={getCdnUrl(selectedImage)} alt={selectedImage.filename} className="w-full h-full object-contain object-center z-10" />
                        ) : (
                            <img src={getCdnUrl(selectedImage)} alt={selectedImage.filename} className="w-full h-full object-contain object-center z-10 rounded shadow-md" />
                        )}
                    </div>

                    {/* Right: Info panel */}
                    <div className="md:w-2/5 p-6 sm:p-8 overflow-y-auto flex flex-col bg-surface border-l border-border relative">
                        <h3 className="font-semibold text-xl tracking-tight leading-tight mb-6">{selectedImage.filename}</h3>
                        
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mb-6 bg-surface-2 p-4 rounded-xl border border-border/50">
                            <div>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Format</p>
                                <p className="font-medium">{selectedImage.format || "—"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Size</p>
                                <p className="font-medium text-purple-400">{formatBytes(selectedImage.size)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Dimensions</p>
                                <p className="font-medium font-mono">{selectedImage.width && selectedImage.height ? `${selectedImage.width} × ${selectedImage.height}` : "—"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Client</p>
                                <p className="font-medium text-emerald-400">{selectedImage.client_name}</p>
                            </div>
                        </div>

                        {/* CDN URL */}
                        <div className="space-y-2 mb-6">
                            <p className="text-[10px] font-bold text-muted uppercase tracking-wider">CDN URL</p>
                            <div className="flex items-stretch gap-2">
                                <code className="flex-1 text-[11px] bg-black/40 border border-white/5 rounded-lg p-3 font-mono break-all text-white/80 overflow-hidden flex items-center">
                                    {getCdnUrl(selectedImage)}
                                </code>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => copyUrl(getCdnUrl(selectedImage))}
                                        className="p-2.5 bg-brand text-white font-medium rounded-lg hover:bg-brand-hover transition-colors"
                                        title="Copy URL"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <a
                                        href={getCdnUrl(selectedImage)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2.5 border border-border rounded-lg hover:bg-surface-2 transition-colors flex items-center justify-center text-muted hover:text-white"
                                        title="Open in new tab"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                            </div>
                            {copied && <p className="text-xs text-success animate-fade-in font-medium">URL copied!</p>}
                        </div>

                        {selectedImage.project_name && (
                            <div className="space-y-2 mb-6">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Project</p>
                                <span className="inline-block px-3 py-1.5 bg-brand/20 text-brand-foreground font-semibold rounded-lg text-xs border border-brand/30">
                                    {selectedImage.project_name}
                                </span>
                            </div>
                        )}

                        <div className="mt-auto pt-6 flex gap-3 w-full border-t border-border">
                            <button onClick={() => setSelectedImage(null)} className="flex-1 h-11 border border-border rounded-lg text-sm font-semibold hover:bg-surface-2 transition-colors">
                                Close
                            </button>
                            <button onClick={() => handleDelete(selectedImage.id)} className="flex-1 h-11 border border-danger/30 text-danger rounded-lg text-sm font-semibold hover:bg-danger/10 hover:border-danger/50 transition-colors flex items-center justify-center gap-2">
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }, [selectedImage, copied]);


    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10 pt-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-2 border border-border mb-6">
                    <SearchIcon size={28} className="text-white" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-3">
                    Search Media
                </h1>
                <p className="text-muted text-base">Type keywords, client names, projects, or file extensions to instantly retrieve media.</p>
            </div>

            <div className="relative max-w-3xl mx-auto group">
                <div className="absolute inset-0 bg-brand/20 rounded-2xl blur-xl transition-all duration-300 group-hover:bg-brand/30 opacity-50 block -z-10" />
                <SearchIcon size={22} className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${loading ? 'text-brand animate-pulse' : 'text-muted'}`} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search anything..."
                    className="w-full h-16 pl-14 pr-6 bg-surface/90 backdrop-blur border border-white/10 rounded-2xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-brand/50 focus:ring-4 focus:ring-brand/10 transition-all text-lg font-medium shadow-2xl"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-8">
                    {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square rounded-xl animate-shimmer" />)}
                </div>
            ) : searched && results.length === 0 ? (
                <div className="text-center py-24 bg-surface-2/30 rounded-3xl border border-dashed border-border/50 mt-12">
                    <ImageOff size={48} className="mx-auto text-muted/30 mb-5" />
                    <p className="text-muted text-lg font-medium">No details matched your search.</p>
                    <p className="text-muted/60 text-sm mt-2">Try searching by client name or different file name.</p>
                </div>
            ) : results.length > 0 ? (
                <div className="space-y-4 pt-8 animate-fade-in">
                    <p className="text-sm font-semibold px-2 text-muted-foreground w-full border-b border-border/50 pb-4">
                        Found <span className="text-white">{results.length}</span> images matching "<span className="text-white">{query}</span>"
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {results.map((image, i) => (
                            <button
                                key={image.id}
                                onClick={() => setSelectedImage(image)}
                                className="group relative aspect-square bg-surface-2 border border-border rounded-xl overflow-hidden hover:border-white/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                                style={{ animationDelay: `${(i % 12) * 30}ms` }}
                            >
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center p-2">
                                    <img 
                                        src={getCdnUrl(image)} 
                                        alt={image.filename} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                        loading="lazy"
                                    />
                                </div>
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-3 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <p className="text-xs font-semibold text-white truncate text-left">{image.filename}</p>
                                    <p className="text-[10px] font-medium text-white/70 text-left mt-0.5">{image.client_name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 mt-10">
                    <ImageIcon size={48} className="mx-auto text-muted/20 mb-4 opacity-50" />
                    <p className="text-muted/60 font-medium">Enter a search query to discover media</p>
                </div>
            )}
            {Modal}
        </div>
    );
}
