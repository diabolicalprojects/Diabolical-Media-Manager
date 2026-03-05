"use client";
import { useEffect, useState } from "react";
import { getImages, deleteImage } from "@/lib/api";
import { Image, Trash2, Copy, ExternalLink, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

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

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "http://localhost:4002";

export default function MediaLibraryPage() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchImages = async (p: number = 1) => {
        setLoading(true);
        try {
            const res = await getImages({ page: String(p), limit: "24" });
            setImages(res.data.images || []);
            setTotalPages(res.data.pagination?.pages || 1);
            setPage(p);
        } catch { /* handle */ } finally { setLoading(false); }
    };

    useEffect(() => { fetchImages(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this image?")) return;
        try {
            await deleteImage(id);
            setSelectedImage(null);
            fetchImages(page);
        } catch { /* handle */ }
    };

    const getCdnUrl = (image: ImageItem) => {
        return `${CDN_URL}/${image.client_slug}/${image.filename}`;
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                    <Image size={24} /> Media Library
                </h1>
                <p className="text-muted text-sm mt-1">Browse and manage all uploaded images</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-lg animate-shimmer" />
                    ))}
                </div>
            ) : images.length === 0 ? (
                <div className="text-center py-20">
                    <ImageOff size={48} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-muted">No images uploaded yet.</p>
                    <a href="/dashboard/upload" className="inline-block mt-4 text-sm text-white underline underline-offset-4">Upload your first image</a>
                </div>
            ) : (
                <>
                    {/* Gallery Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {images.map((image, i) => (
                            <button
                                key={image.id}
                                onClick={() => setSelectedImage(image)}
                                className="group relative aspect-square bg-surface-2 border border-border rounded-lg overflow-hidden hover:border-border-hover transition-all animate-fade-in"
                                style={{ animationDelay: `${i * 30}ms` }}
                            >
                                <div className="absolute inset-0 flex items-center justify-center text-muted/30">
                                    <Image size={24} />
                                </div>
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[10px] text-white truncate">{image.filename}</p>
                                    <p className="text-[9px] text-white/60">{formatBytes(image.size)}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => fetchImages(page - 1)}
                                disabled={page <= 1}
                                className="p-2 border border-border rounded-lg hover:bg-surface-2 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-muted">Page {page} of {totalPages}</span>
                            <button
                                onClick={() => fetchImages(page + 1)}
                                disabled={page >= totalPages}
                                className="p-2 border border-border rounded-lg hover:bg-surface-2 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Image Detail Modal */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                    <div className="bg-surface border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Preview */}
                        <div className="aspect-video bg-surface-2 flex items-center justify-center rounded-t-xl">
                            <Image size={48} className="text-muted/20" />
                        </div>

                        {/* Info */}
                        <div className="p-6 space-y-4">
                            <h3 className="font-semibold text-lg">{selectedImage.filename}</h3>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted uppercase">Format</p>
                                    <p className="mt-1">{selectedImage.format || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted uppercase">Size</p>
                                    <p className="mt-1">{formatBytes(selectedImage.size)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted uppercase">Dimensions</p>
                                    <p className="mt-1">{selectedImage.width && selectedImage.height ? `${selectedImage.width} × ${selectedImage.height}` : "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted uppercase">Client</p>
                                    <p className="mt-1">{selectedImage.client_name}</p>
                                </div>
                            </div>

                            {/* CDN URL */}
                            <div className="space-y-2">
                                <p className="text-xs text-muted uppercase">CDN URL</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs bg-surface-2 border border-border rounded-lg p-3 font-mono break-all">
                                        {getCdnUrl(selectedImage)}
                                    </code>
                                    <button
                                        onClick={() => copyUrl(getCdnUrl(selectedImage))}
                                        className="p-2 border border-border rounded-lg hover:bg-surface-2 transition-colors"
                                        title="Copy URL"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <a
                                        href={getCdnUrl(selectedImage)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 border border-border rounded-lg hover:bg-surface-2 transition-colors"
                                        title="Open in new tab"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                                {copied && <p className="text-xs text-success">URL copied!</p>}
                            </div>

                            {/* Tags */}
                            {selectedImage.tags && selectedImage.tags.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted uppercase">Tags</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedImage.tags.map((tag: string) => (
                                            <span key={tag} className="px-2 py-1 bg-surface-2 border border-border rounded text-xs">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setSelectedImage(null)} className="flex-1 h-10 border border-border rounded-lg text-sm hover:bg-surface-2 transition-colors">Close</button>
                                <button onClick={() => handleDelete(selectedImage.id)} className="h-10 px-4 border border-danger/30 text-danger rounded-lg text-sm hover:bg-danger/10 transition-colors flex items-center gap-2">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
