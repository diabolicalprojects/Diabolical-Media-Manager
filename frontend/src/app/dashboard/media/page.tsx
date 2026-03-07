"use client";
import { useEffect, useState, useMemo } from "react";
import { getImages, deleteImage } from "@/lib/api";
import { Image as ImageIcon, Trash2, Copy, ExternalLink, ChevronLeft, ChevronRight, ImageOff, LayoutGrid, List } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

interface ImageItem {
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

export default function MediaLibraryPage() {
    const searchParams = useSearchParams();
    const projectFilter = searchParams.get("project") || null;

    const [images, setImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const fetchImages = async (p: number = 1) => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(p), limit: "48" };
            if (projectFilter) {
                params.project_id = projectFilter;
            }
            const res = await getImages(params);
            setImages(res.data.images || []);
            setTotalPages(res.data.pagination?.pages || 1);
            setPage(p);
        } catch { /* handle */ } finally { setLoading(false); }
    };

    useEffect(() => { fetchImages(); }, [projectFilter]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this image?")) return;
        try {
            await deleteImage(id);
            setSelectedImage(null);
            fetchImages(page);
        } catch { /* handle */ }
    };

    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const selectedIndex = selectedImage ? images.findIndex((img) => img.id === selectedImage.id) : -1;
    const hasPrev = selectedIndex > 0;
    const hasNext = selectedIndex !== -1 && selectedIndex < images.length - 1;

    const handlePrev = () => {
        if (selectedIndex > 0) setSelectedImage(images[selectedIndex - 1]);
    };

    const handleNext = () => {
        if (selectedIndex !== -1 && selectedIndex < images.length - 1) setSelectedImage(images[selectedIndex + 1]);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedImage) return;
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "Escape") setSelectedImage(null);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedImage, selectedIndex, images]);

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const minSwipeDistance = 50;
        if (distance > minSwipeDistance) handleNext();
        if (distance < -minSwipeDistance) handlePrev();
    };

    const getCdnUrl = (image: ImageItem) => {
        // Because backend express.static mounts '/storage/clients' at '/'
        // We remove 'clients/' from the relative path and normalize backslashes
        const normalizedPath = (image.path || "").replace(/\\/g, "/").replace(/^clients\//, "");
        return `${CDN_URL}/${normalizedPath}`;
    };

    const copyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return "—";
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    // Portal for modal to escape layout stacking context
    const Modal = useMemo(() => {
        if (!selectedImage || typeof document === 'undefined') return null;
        return createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] p-4 sm:p-8 flex items-center justify-center" onClick={() => setSelectedImage(null)}>
                <div 
                    className="bg-surface border border-border shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden animate-fade-in" 
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Left: Image Preview */}
                    <div 
                        className="md:w-3/5 bg-surface-2 flex items-center justify-center p-4 relative min-h-[300px]"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        <div className="absolute inset-0 pattern-dots text-muted/20 opacity-30 pointer-events-none" />
                        
                        {hasPrev && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
                                title="Previous image (Left Arrow)"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        {hasNext && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleNext(); }} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 sm:p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
                                title="Next image (Right Arrow)"
                            >
                                <ChevronRight size={20} />
                            </button>
                        )}

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
                            {copied && <p className="text-xs text-success animate-fade-in font-medium">URL copied to clipboard!</p>}
                        </div>

                        {/* Search Tags */}
                        {selectedImage.tags && selectedImage.tags.length > 0 && (
                            <div className="space-y-2 mb-6 flex-1">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Tags</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedImage.tags.map((tag: string) => (
                                        <span key={tag} className="px-2.5 py-1 bg-surface-2 border border-border rounded-full text-[11px] font-medium text-muted-foreground">{tag}</span>
                                    ))}
                                </div>
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
    }, [selectedImage, copied, images, selectedIndex, hasPrev, hasNext]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <ImageIcon size={24} /> {projectFilter ? "Project Media" : "Media Library"}
                    </h1>
                    <p className="text-muted text-sm mt-1">Browse and manage all uploaded images</p>
                </div>
                
                {/* View Toggles */}
                <div className="flex items-center gap-2 bg-surface-2 p-1 rounded-lg border border-border self-start">
                    <button 
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-surface shadow-sm text-white' : 'text-muted hover:text-white/80'}`}
                    >
                        <LayoutGrid size={16} /> Grid
                    </button>
                    <button 
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-surface shadow-sm text-white' : 'text-muted hover:text-white/80'}`}
                    >
                        <List size={16} /> List
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-xl animate-shimmer" />
                    ))}
                </div>
            ) : images.length === 0 ? (
                <div className="text-center py-24 bg-surface-2/30 rounded-2xl border border-dashed border-border/50">
                    <ImageOff size={48} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-muted text-lg font-medium">No images uploaded yet.</p>
                    <a href="/dashboard/upload" className="inline-block mt-4 text-sm font-semibold bg-white text-black px-6 py-2.5 rounded-lg hover:bg-white/90 transition-colors">
                        Upload Image
                    </a>
                </div>
            ) : (
                <>
                    {/* Items */}
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                            {images.map((image, i) => (
                                <button
                                    key={image.id}
                                    onClick={() => setSelectedImage(image)}
                                    className="group relative aspect-square bg-surface-2 border border-border rounded-xl overflow-hidden hover:border-white/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in"
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
                                        <p className="text-[10px] font-medium text-white/70 text-left mt-0.5">{formatBytes(image.size)} • {image.format}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-surface border border-border rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-2 border-b border-border text-xs uppercase tracking-wider text-muted">
                                        <th className="px-4 py-3 font-medium">Image Preview</th>
                                        <th className="px-4 py-3 font-medium">Filename</th>
                                        <th className="px-4 py-3 font-medium">Format</th>
                                        <th className="px-4 py-3 font-medium">Size</th>
                                        <th className="px-4 py-3 font-medium">Client</th>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {images.map(image => (
                                        <tr key={image.id} onClick={() => setSelectedImage(image)} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors cursor-pointer text-sm">
                                            <td className="px-4 py-3 w-20">
                                                <div className="w-12 h-12 bg-black rounded-lg overflow-hidden relative">
                                                    <img src={getCdnUrl(image)} alt={image.filename} className="w-full h-full object-cover" loading="lazy" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{image.filename}</td>
                                            <td className="px-4 py-3 text-muted">{image.format}</td>
                                            <td className="px-4 py-3 text-muted">{formatBytes(image.size)}</td>
                                            <td className="px-4 py-3 text-muted">{image.client_name}</td>
                                            <td className="px-4 py-3 text-muted">{new Date(image.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-4">
                            <button
                                onClick={() => fetchImages(page - 1)}
                                disabled={page <= 1}
                                className="p-2 border border-border rounded-lg hover:bg-surface-2 disabled:opacity-30 transition-all font-medium flex items-center gap-1 text-sm bg-surface"
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <span className="text-sm font-medium text-muted">Page <span className="text-white mx-1">{page}</span> of {totalPages}</span>
                            <button
                                onClick={() => fetchImages(page + 1)}
                                disabled={page >= totalPages}
                                className="p-2 border border-border rounded-lg hover:bg-surface-2 disabled:opacity-30 transition-all font-medium flex items-center gap-1 text-sm bg-surface"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {Modal}
        </div>
    );
}
