"use client";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import api from "@/lib/api";
import { 
    Sparkles, 
    Upload, 
    Download, 
    ArrowRight, 
    FileImage, 
    X, 
    AlertCircle, 
    CheckCircle, 
    TrendingDown, 
    RefreshCw,
    Maximize2
} from "lucide-react";

interface ImageStats {
    name: string;
    originalSize: number;
    optimizedSize: number;
    saving: string;
    format: string;
}

export default function ImageOptimizerPage() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [optimizedUrl, setOptimizedUrl] = useState<string>("");
    const [quality, setQuality] = useState<number>(80);
    const [width, setWidth] = useState<string>("");
    
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<boolean>(false);
    const [stats, setStats] = useState<ImageStats | null>(null);

    // Clean up previews on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            if (optimizedUrl) URL.revokeObjectURL(optimizedUrl);
        };
    }, [previewUrl, optimizedUrl]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        
        setError("");
        setSuccess(false);
        setStats(null);
        if (optimizedUrl) {
            URL.revokeObjectURL(optimizedUrl);
            setOptimizedUrl("");
        }

        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(selectedFile));
    }, [previewUrl, optimizedUrl]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/webp": [".webp"],
            "image/gif": [".gif"],
            "image/tiff": [".tiff"],
            "image/avif": [".avif"],
        },
        maxFiles: 1,
    });

    const getExtension = (filename: string) => {
        return filename.split(".").pop()?.toUpperCase() || "UNKNOWN";
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const handleOptimize = async () => {
        if (!file) return;

        setLoading(true);
        setError("");
        setSuccess(false);
        
        const formData = new FormData();
        formData.append("image", file);
        formData.append("quality", quality.toString());
        if (width) {
            formData.append("width", width);
        }

        try {
            const response = await api.post("/v1/optimize", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                responseType: "blob", // Critical for receiving binary stream
            });

            // Extract savings from custom header
            const savingHeader = response.headers["x-optimizer-saving"] || "0%";
            const optimizedBlob = response.data;
            const optimizedSize = optimizedBlob.size;

            if (optimizedUrl) URL.revokeObjectURL(optimizedUrl);
            const newOptimizedUrl = URL.createObjectURL(optimizedBlob);
            setOptimizedUrl(newOptimizedUrl);

            setStats({
                name: file.name,
                originalSize: file.size,
                optimizedSize: optimizedSize,
                saving: savingHeader,
                format: "WEBP",
            });

            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            // Handle parsing JSON error from Blob response
            if (err.response?.data instanceof Blob) {
                try {
                    const errorText = await err.response.data.text();
                    const errorJson = JSON.parse(errorText);
                    setError(errorJson.error || "Failed to process image.");
                } catch {
                    setError("Failed to process image. Make sure the file is not corrupted.");
                }
            } else {
                setError(err.response?.data?.error || "Error connecting to image optimizer server.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!optimizedUrl || !file) return;
        const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const link = document.createElement("a");
        link.href = optimizedUrl;
        link.download = `${baseName}_optimized.webp`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetOptimizer = () => {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (optimizedUrl) URL.revokeObjectURL(optimizedUrl);
        setPreviewUrl("");
        setOptimizedUrl("");
        setStats(null);
        setError("");
        setSuccess(false);
        setWidth("");
        setQuality(80);
    };

    return (
        <div className="space-y-8 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        Image Optimizer
                    </h1>
                    <p className="text-muted text-sm mt-1">
                        Convert image formats, resize, and optimize file sizes to WebP on-the-fly.
                    </p>
                </div>
                {file && (
                    <button
                        onClick={resetOptimizer}
                        className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-2 transition-colors flex items-center gap-2 self-start"
                    >
                        <RefreshCw size={14} /> Reset Optimizer
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm animate-fade-in">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Configuration and Upload Column */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* Settings Panel */}
                    <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">
                            Optimization Settings
                        </h2>
                        
                        {/* Quality Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-foreground">WebP Quality</label>
                                <span className="text-xs bg-white/10 text-white font-mono px-2 py-0.5 rounded">
                                    {quality}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={quality}
                                onChange={(e) => setQuality(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                            <p className="text-[11px] text-muted">
                                80 is the recommended sweet spot for visual fidelity and weight.
                            </p>
                        </div>

                        {/* Width Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground block">
                                Target Width (pixels) <span className="text-muted text-xs font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="e.g. 1200"
                                    value={width}
                                    onChange={(e) => setWidth(e.target.value)}
                                    min="10"
                                    className="w-full h-10 px-4 bg-surface-2 border border-border rounded-lg text-foreground focus:outline-none focus:border-white/30 text-sm font-mono"
                                />
                                {width && (
                                    <button 
                                        onClick={() => setWidth("")}
                                        className="absolute right-3 top-3 text-muted hover:text-white"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-muted">
                                Maintans aspect ratio automatically. Will not enlarge if source is smaller.
                            </p>
                        </div>
                    </div>

                    {/* Upload Panel */}
                    {!file ? (
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 aspect-[4/3] flex flex-col justify-center ${
                                isDragActive
                                    ? "border-white bg-white/5"
                                    : "border-border hover:border-border-hover hover:bg-surface"
                            }`}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center">
                                    <Upload size={22} className="text-muted" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm">
                                        <span className="text-white font-medium">Click to select image</span>
                                        <span className="text-muted"> or drag & drop</span>
                                    </p>
                                    <p className="text-xs text-muted">Supports JPG, JPEG, PNG, TIFF, AVIF, GIF</p>
                                    <p className="text-[10px] text-muted/60">Maximum file size: 15MB</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-surface-3 border border-border rounded-lg flex items-center justify-center font-bold text-xs text-muted">
                                        {getExtension(file.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate max-w-[200px]" title={file.name}>
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-muted">{formatBytes(file.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetOptimizer}
                                    className="p-1.5 hover:bg-surface-3 rounded-lg text-muted hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <button
                                onClick={handleOptimize}
                                disabled={loading}
                                className="w-full h-12 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        Optimizing Image...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Optimize & Convert to WebP
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Previews and Results Column */}
                <div className="lg:col-span-7 space-y-6">
                    {file ? (
                        <div className="space-y-6">
                            
                            {/* Stats Banner on Success */}
                            {success && stats && (
                                <div className="grid grid-cols-3 gap-4 p-5 bg-surface border border-border rounded-2xl animate-fade-in relative overflow-hidden">
                                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-success/5 rounded-full blur-xl pointer-events-none" />
                                    
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted uppercase tracking-wider block">Original</span>
                                        <p className="text-sm font-medium text-muted line-through">
                                            {formatBytes(stats.originalSize)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted uppercase tracking-wider block">Optimized</span>
                                        <p className="text-base font-bold text-success">
                                            {formatBytes(stats.optimizedSize)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted uppercase tracking-wider block">Savings</span>
                                        <span className="inline-flex items-center gap-1 text-sm font-bold bg-success/10 text-success px-2 py-0.5 rounded-lg border border-success/20">
                                            <TrendingDown size={12} />
                                            {stats.saving}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Side-by-side Views */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Original Preview */}
                                <div className="space-y-2">
                                    <span className="text-xs font-semibold text-muted uppercase tracking-widest flex items-center gap-1.5">
                                        <FileImage size={12} /> Original Image
                                    </span>
                                    <div className="aspect-[4/3] rounded-2xl bg-surface border border-border overflow-hidden relative group">
                                        {previewUrl && (
                                            <img
                                                src={previewUrl}
                                                alt="Original preview"
                                                className="w-full h-full object-contain bg-surface-2"
                                            />
                                        )}
                                        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur border border-border rounded-md px-2 py-0.5 text-[10px] font-mono text-muted">
                                            {getExtension(file.name)}
                                        </div>
                                    </div>
                                </div>

                                {/* Optimized Preview */}
                                <div className="space-y-2">
                                    <span className="text-xs font-semibold text-muted uppercase tracking-widest flex items-center gap-1.5">
                                        <Sparkles size={12} /> Optimized WebP
                                    </span>
                                    <div className="aspect-[4/3] rounded-2xl bg-surface border border-border overflow-hidden relative group flex items-center justify-center">
                                        {loading ? (
                                            <div className="text-center space-y-3">
                                                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                                                <p className="text-xs text-muted">Processing...</p>
                                            </div>
                                        ) : optimizedUrl ? (
                                            <>
                                                <img
                                                    src={optimizedUrl}
                                                    alt="Optimized preview"
                                                    className="w-full h-full object-contain bg-surface-2 animate-fade-in"
                                                />
                                                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur border border-border rounded-md px-2 py-0.5 text-[10px] font-mono text-success">
                                                    WEBP
                                                </div>
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={handleDownload}
                                                        className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/95 transition-all text-xs flex items-center gap-2 shadow-lg"
                                                    >
                                                        <Download size={14} /> Download WebP
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-6 space-y-2">
                                                <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto text-muted/40">
                                                    <Sparkles size={20} />
                                                </div>
                                                <p className="text-xs text-muted">
                                                    Click "Optimize" to generate the optimized WebP version.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>

                            {/* Download Action Bar on Success */}
                            {success && optimizedUrl && (
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleDownload}
                                        className="h-11 px-6 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2 text-sm shadow-xl"
                                    >
                                        <Download size={16} /> Download Optimized Image
                                    </button>
                                </div>
                            )}

                        </div>
                    ) : (
                        /* Empty State */
                        <div className="h-full min-h-[350px] border border-border rounded-2xl bg-surface flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted/30">
                                <FileImage size={24} />
                            </div>
                            <h3 className="text-sm font-semibold text-white mb-1">No Image Selected</h3>
                            <p className="text-xs text-muted max-w-[280px] leading-relaxed">
                                Upload an image on the left panel to configure conversion quality, resizing parameters, and download the optimized WebP.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
