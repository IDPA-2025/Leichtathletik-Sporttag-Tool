"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ExportPopup({ onClose }) {
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState("");
    const [filters, setFilters] = useState({ geschlecht: "alle", altersgruppe: "alle" });
    const [ranglisten, setRanglisten] = useState({});
    const [exportType, setExportType] = useState("csv");
    const [preset, setPreset] = useState("preset1");
    const [mode, setMode] = useState("preset");

    const handleGenerateRanking = async () => {
        setIsGenerating(true);
        setMessage("");

        try {
            const { data: students, error } = await supabase
                .from("students")
                .select("id, geschlecht, age_category, klasse, total_points, vorname, nachname")
                .not("total_points", "is", null);

            if (error) throw error;

            const listen = {};

            if (mode === "preset") {
                if (preset === "preset1") {
                    const kategorien = ["-15", "16-17", "18+"];
                    const geschlechter = ["maennlich", "weiblich"];
                    for (const kategorie of kategorien) {
                        for (const geschlecht of geschlechter) {
                            const key = `${geschlecht}-${kategorie}`;
                            const filtered = students.filter(s => s.geschlecht === geschlecht && s.age_category === kategorie);
                            listen[key] = filtered.sort((a, b) => b.total_points - a.total_points);
                        }
                    }
                } else if (preset === "preset2") {
                    const geschlechter = ["maennlich", "weiblich"];
                    const klassen = [...new Set(students.map(s => s.klasse))];
                    for (const klasse of klassen) {
                        for (const geschlecht of geschlechter) {
                            const key = `${klasse}-${geschlecht}`;
                            const filtered = students.filter(s => s.klasse === klasse && s.geschlecht === geschlecht);
                            listen[key] = filtered.sort((a, b) => b.total_points - a.total_points);
                        }
                    }
                }
            } else {
                let filtered = students;
                if (filters.geschlecht !== "alle") {
                    filtered = filtered.filter(s => s.geschlecht === filters.geschlecht);
                }
                if (filters.altersgruppe !== "alle") {
                    filtered = filtered.filter(s => s.age_category === filters.altersgruppe);
                }
                listen["Benutzerdefiniert"] = filtered.sort((a, b) => b.total_points - a.total_points);
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

    const generateExportFilename = () => {
        if (mode === "preset") {
            return preset === "preset1"
                ? "Rangliste_Altersgruppe_Geschlecht"
                : "Rangliste_Klasse_Geschlecht";
        } else {
            return `Rangliste_${filters.geschlecht}_${filters.altersgruppe}`;
        }
    };

    const handleExport = () => {
        const filename = generateExportFilename();

        if (exportType === "csv") {
            const rows = [];
            Object.entries(ranglisten).forEach(([kategorie, list]) => {
                rows.push([`Kategorie: ${kategorie}`]);
                rows.push(["Rang", "Vorname", "Nachname", "Punkte"]);
                list.forEach((s, i) => rows.push([i + 1, s.vorname, s.nachname, s.total_points]));
                rows.push([]);
            });
            const csv = rows.map(r => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${filename}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (exportType === "pdf") {
            const doc = new jsPDF();
            let pos = 10;
            Object.entries(ranglisten).forEach(([key, list], idx) => {
                doc.text(`Kategorie: ${key}`, 10, pos);
                pos += 6;
                autoTable(doc, {
                    startY: pos,
                    head: [["Rang", "Vorname", "Nachname", "Punkte"]],
                    body: list.map((s, i) => [i + 1, s.vorname, s.nachname, s.total_points]),
                    theme: "striped",
                    headStyles: { fillColor: [41, 128, 185] },
                    styles: { fontSize: 10 }
                });
                pos = doc.lastAutoTable.finalY + 10;
            });
            doc.save(`${filename}.pdf`);
        } else if (exportType === "excel") {
            const wb = XLSX.utils.book_new();
            Object.entries(ranglisten).forEach(([kategorie, list]) => {
                const ws_data = [["Rang", "Vorname", "Nachname", "Punkte"]];
                list.forEach((s, i) => ws_data.push([i + 1, s.vorname, s.nachname, s.total_points]));
                const ws = XLSX.utils.aoa_to_sheet(ws_data);
                XLSX.utils.book_append_sheet(wb, ws, kategorie.substring(0, 31));
            });
            XLSX.writeFile(wb, `${filename}.xlsx`);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center">
            <div className="bg-white w-full max-w-md rounded-t-2xl p-6 shadow-xl animate-slideInUp">
                {step === 1 && (
                    <>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Rangliste generieren</h2>
                        <p className="text-gray-700 mb-4">Wähle eine Vorlage oder definiere eigene Filter.</p>

                        <div className="mb-4">
                            <label className="block mb-2 font-medium text-sm">Modus wählen:</label>
                            <select value={mode} onChange={e => setMode(e.target.value)} className="w-full p-2 border rounded">
                                <option value="preset">📋 Vorlage verwenden</option>
                                <option value="custom">⚙️ Eigene Filter definieren</option>
                            </select>
                        </div>

                        {mode === "preset" ? (
                            <div className="mb-4">
                                <label className="block mb-2 font-medium text-sm">Vorlage:</label>
                                <select value={preset} onChange={e => setPreset(e.target.value)} className="w-full p-2 border rounded">
                                    <option value="preset1">Nach Alterskategorie & Geschlecht</option>
                                    <option value="preset2">Nach Klasse & Geschlecht</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 mb-4">
                                <label className="text-sm">Geschlecht</label>
                                <select value={filters.geschlecht} onChange={e => setFilters(prev => ({ ...prev, geschlecht: e.target.value }))} className="w-full p-2 border rounded">
                                    <option value="alle">Alle</option>
                                    <option value="maennlich">Männlich</option>
                                    <option value="weiblich">Weiblich</option>
                                </select>
                                <label className="text-sm">Altersgruppe</label>
                                <select value={filters.altersgruppe} onChange={e => setFilters(prev => ({ ...prev, altersgruppe: e.target.value }))} className="w-full p-2 border rounded">
                                    <option value="alle">Alle</option>
                                    <option value="-15">-15</option>
                                    <option value="16-17">16-17</option>
                                    <option value="18+">18+</option>
                                </select>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block mb-2 font-medium text-sm">Exportformat:</label>
                            <select value={exportType} onChange={e => setExportType(e.target.value)} className="w-full p-2 border rounded">
                                <option value="csv">CSV</option>
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel</option>
                            </select>
                        </div>

                        <button
                            onClick={handleGenerateRanking}
                            disabled={isGenerating}
                            className={`w-full py-3 rounded-lg font-semibold ${isGenerating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                        >
                            {isGenerating ? "Generiere..." : "Ranglisten generieren"}
                        </button>
                        {message && <p className="mt-4 text-sm text-center text-gray-800">{message}</p>}
                    </>
                )}

                {step === 2 && (
                    <>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Exportieren</h2>
                        <p className="text-gray-700 mb-4">Exportiere deine generierte Rangliste im gewählten Format.</p>
                        <button
                            onClick={handleExport}
                            className="w-full py-3 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                        >
                            📥 Exportieren als {exportType.toUpperCase()}
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
