"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {useEffect, useState} from "react";
import ExportPopup from "@/app/components/ExportPopup";

export default function BackButton() {
    const router = useRouter();
    const [showExport, setShowExport] = useState(false);
    const [role, setRole] = useState(null);


    useEffect(() => {
        const fetchRole = async () => {
            try {
                const res = await fetch("/api/me", { cache: "no-store" }); // WICHTIG!
                if (!res.ok) {
                    if (res.status === 403) {
                        router.push("/login");
                        return; // Wichtig, um die weitere Verarbeitung zu stoppen
                    }
                    // Andere Fehlerbehandlung, falls nötig
                    setRole(null);
                } else {
                    const data = await res.json();
                    setRole(data.role ?? null);
                }
            } catch {
                setRole(null);
            }
        };
        fetchRole();
    }, []);


    return (
        <>
            <div className="fixed absolute  bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-4 rounded-full sm:rounded-xl p-2 sm:p-4 shadow-lg shadow-black/30 backdrop-blur-md border border-gray-300 hover:scale-105  transition-all duration-200">
                {/* Zurück-Button */}
                <button
                    onClick={() => router.back()}
                    className="button"
                >
                    <ArrowLeft size={18} className="sm:size-5" />
                    <span className="hidden sm:inline">Zurück</span>
                </button>


                {/* Exportieren-Button */}
                {role === "lehrer" && (
                    <button
                        onClick={() => setShowExport(true)}
                        className="button">
                        📤 <span className="hidden sm:inline">Exportieren</span>
                    </button>
                )}

        </div>


            {/* Export Popup */}
            {showExport && <ExportPopup onClose={() => setShowExport(false)} />}

        </>
    );
}
