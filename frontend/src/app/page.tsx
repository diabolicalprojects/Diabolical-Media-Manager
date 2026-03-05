"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("dmm_token");
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return null;
}
