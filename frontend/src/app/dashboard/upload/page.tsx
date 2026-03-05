"use client";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { getClients, getDomains, uploadImages } from "@/lib/api";
import { Upload, CheckCircle, AlertCircle, FileImage, X } from "lucide-react";

interface Client {
    id: string;
    name: string;
    slug: string;
}

interface Domain {
    id: string;
    domain: string;
    project_name: string;
}

interface FilePreview {
    file: File;
    preview: string;
}

export default function UploadPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [domains, setDomains] = useState<Domain[]>([]);
    const [clientId, setClientId] = useState("");
    const [domainId, setDomainId] = useState("");
    const [files, setFiles] = useState<FilePreview[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ uploaded: number; duplicates: number } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [c, d] = await Promise.all([getClients(), getDomains()]);
                setClients(c.data.clients || []);
                setDomains(d.data.domains || []);
            } catch { /* handle */ }
        };
        fetchData();
    }, []);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = acceptedFiles.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
        }));
        setFiles((prev) => [...prev, ...newFiles]);
        setResult(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/gif": [".gif"],
            "image/webp": [".webp"],
            "image/avif": [".avif"],
            "image/svg+xml": [".svg"],
        },
        maxSize: 52428800,
    });

    const removeFile = (index: number) => {
        setFiles((prev) => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].preview);
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const handleUpload = async () => {
        if (!clientId || files.length === 0) return;

        setUploading(true);
        setProgress(0);
        setResult(null);

        const formData = new FormData();
        formData.append("client_id", clientId);
        if (domainId) formData.append("domain_id", domainId);
        files.forEach((f) => formData.append("images", f.file));

        try {
            const res = await uploadImages(formData);
            setResult({
                uploaded: res.data.summary?.uploaded || 0,
                duplicates: res.data.summary?.duplicates || 0,
            });
            setProgress(100);
            // Clear files on success
            files.forEach((f) => URL.revokeObjectURL(f.preview));
            setFiles([]);
        } catch {
            setResult({ uploaded: 0, duplicates: 0 });
        } finally {
            setUploading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                    <Upload size={24} /> Upload Images
                </h1>
                <p className="text-muted text-sm mt-1">Upload and optimize images automatically</p>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted">Client *</label>
                    <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        required
                        className="w-full h-10 px-4 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:border-white/30 text-sm"
                    >
                        <option value="">Select client...</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted">Domain (optional)</label>
                    <select
                        value={domainId}
                        onChange={(e) => setDomainId(e.target.value)}
                        className="w-full h-10 px-4 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:border-white/30 text-sm"
                    >
                        <option value="">General</option>
                        {domains.map((d) => <option key={d.id} value={d.id}>{d.domain}</option>)}
                    </select>
                </div>
            </div>

            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${isDragActive
                        ? "border-white bg-white/5"
                        : "border-border hover:border-border-hover hover:bg-surface"
                    }`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center">
                        <FileImage size={28} className="text-muted" />
                    </div>
                    {isDragActive ? (
                        <p className="text-white font-medium">Drop images here...</p>
                    ) : (
                        <>
                            <p className="text-sm">
                                <span className="text-white font-medium">Click to upload</span>
                                <span className="text-muted"> or drag and drop</span>
                            </p>
                            <p className="text-xs text-muted">JPG, PNG, GIF, WebP, AVIF, SVG — Max 50MB each</p>
                        </>
                    )}
                </div>
            </div>

            {/* File Previews */}
            {files.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-medium">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {files.map((f, i) => (
                            <div key={i} className="relative group aspect-square bg-surface-2 border border-border rounded-lg overflow-hidden">
                                <img
                                    src={f.preview}
                                    alt={f.file.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                        className="p-2 bg-danger rounded-full text-white"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1.5">
                                    <p className="text-[9px] text-white truncate">{f.file.name}</p>
                                    <p className="text-[8px] text-white/50">{formatBytes(f.file.size)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Progress */}
            {uploading && (
                <div className="space-y-2">
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted">Uploading and optimizing...</p>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl animate-fade-in">
                    {result.uploaded > 0 ? (
                        <CheckCircle size={20} className="text-success" />
                    ) : (
                        <AlertCircle size={20} className="text-danger" />
                    )}
                    <div>
                        <p className="text-sm font-medium">
                            {result.uploaded} image{result.uploaded !== 1 ? "s" : ""} uploaded successfully
                        </p>
                        {result.duplicates > 0 && (
                            <p className="text-xs text-muted mt-1">
                                {result.duplicates} duplicate{result.duplicates !== 1 ? "s" : ""} detected
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Upload Button */}
            <button
                onClick={handleUpload}
                disabled={!clientId || files.length === 0 || uploading}
                className="w-full h-12 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {uploading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                    <>
                        <Upload size={18} />
                        Upload {files.length > 0 ? `${files.length} Image${files.length > 1 ? "s" : ""}` : "Images"}
                    </>
                )}
            </button>
        </div>
    );
}
