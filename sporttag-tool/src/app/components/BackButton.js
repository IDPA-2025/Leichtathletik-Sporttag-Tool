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
                const res = await fetch("/api/me");
                const data = await res.json();
                if (data.role) setRole(data.role);
            } catch (err) {
                console.warn("Nicht eingeloggt oder Fehler beim Abrufen der Rolle.");
            }
        };

        fetchRole();
    }, []);



    return (
        <>
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-4 rounded-full sm:rounded-xl p-2 sm:p-4 shadow-lg shadow-black/30 backdrop-blur-md border border-gray-300">
                {/* Zurück-Button */}
                <button
                    onClick={() => router.back()}
                    className="
            flex items-center gap-2
            px-4 py-2 sm:px-6 sm:py-3
            bg-white/70 backdrop-blur-md border border-gray-300
            text-gray-700 hover:bg-white hover:text-black
            shadow-md hover:shadow-lg
            rounded-full sm:rounded-xl
            text-sm sm:text-base
            transition-all duration-200
          "
                >
                    <ArrowLeft size={18} className="sm:size-5" />
                    <span className="hidden sm:inline">Zurück</span>
                </button>


                {/* Exportieren-Button */}
                {role === "lehrer" && (
                    <button
                        onClick={() => setShowExport(true)}
                        className="            flex items-center gap-2
            px-4 py-2 sm:px-6 sm:py-3
            bg-white/70 backdrop-blur-md border border-gray-300
            text-gray-700 hover:bg-white hover:text-black
            shadow-md hover:shadow-lg
            rounded-full sm:rounded-xl
            text-sm sm:text-base
            transition-all duration-200">
                        📤 <span className="hidden sm:inline">Exportieren</span>
                    </button>
                )}

        </div>


            {/* Export Popup */}
            {showExport && <ExportPopup onClose={() => setShowExport(false)} />}

        </>
    );
}
