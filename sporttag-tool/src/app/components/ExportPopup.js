"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ExportPopup({ onClose }) {
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState("");
    const [filters, setFilters] = useState({
        geschlecht: "alle",
        altersgruppe: "alle",
    });
    const [ranglisten, setRanglisten] = useState({});

    const handleGenerateRanking = async () => {
        setIsGenerating(true);
        setMessage("");

        try {
            const { data: students, error } = await supabase
                .from("students")
                .select("id, geschlecht, age_category, total_points, vorname, nachname")
                .not("total_points", "is", null);

            if (error) throw error;

            // Ranglisten vorbereiten
            const kategorien = ["-15", "16-17", "18+"];
            const geschlechter = ["maennlich", "weiblich"];
            const listen = {};

            for (const kategorie of kategorien) {
                for (const geschlecht of geschlechter) {
                    const key = `${geschlecht}-${kategorie}`;
                    const filtered = students
                        .filter(s => s.geschlecht === geschlecht && s.age_category === kategorie)
                        .sort((a, b) => b.total_points - a.total_points);
                    listen[key] = filtered;
                }
            }

            setRanglisten(listen);
            setStep(2);
        } catch (err) {
            console.error("Fehler beim Generieren:", err);
            setMessage("❌ Fehler: " + (err.message || JSON.stringify(err)));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExport = () => {
        const rows = [];
        Object.entries(ranglisten).forEach(([kategorie, list]) => {
            rows.push([`Kategorie: ${kategorie}`]);
            rows.push(["Rang", "Vorname", "Nachname", "Punkte"]);
            list.forEach((s, i) => {
                rows.push([i + 1, s.vorname, s.nachname, s.total_points]);
            });
            rows.push([]);
        });

        const csv = rows.map(row => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ranglisten_export.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center">
            <div className="bg-white w-full max-w-md rounded-t-2xl p-6 shadow-xl animate-slideInUp">
                {step === 1 && (
                    <>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Rangliste generieren</h2>
                        <p className="text-gray-700 mb-4">
                            Berechnet die Gesamtpunktzahl für alle Schüler und erstellt Ranglisten nach Geschlecht und Altersgruppe.
                        </p>
                        <button
                            onClick={handleGenerateRanking}
                            disabled={isGenerating}
                            className={`w-full py-3 rounded-lg font-semibold ${
                                isGenerating
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                        >
                            {isGenerating ? "Generiere..." : "Ranglisten generieren"}
                        </button>
                        {message && <p className="mt-4 text-sm text-center text-gray-800">{message}</p>}
                    </>
                )}

                {step === 2 && (
                    <>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ranglisten exportieren</h2>
                        <p className="text-gray-700 mb-4">
                            Exportiere alle 6 Ranglisten (je Geschlecht und Altersgruppe).
                        </p>
                        <button
                            onClick={handleExport}
                            className="w-full py-3 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                        >
                            📥 CSV herunterladen
                        </button>
                    </>
                )}

                <div className="mt-6 text-center">
                    <button onClick={onClose} className="text-sm text-gray-500 hover:underline">
                        Fenster schliessen
                    </button>
                </div>
            </div>

            <style jsx>{`
                .animate-slideInUp {
                    animation: slideInUp 0.3s ease-out;
                }

                @keyframes slideInUp {
                    0% {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    100% {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}
