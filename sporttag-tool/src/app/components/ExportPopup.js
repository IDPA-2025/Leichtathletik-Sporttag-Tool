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
    const [showDetails, setShowDetails] = useState(false);


    const handleGenerateRanking = async () => {
        setIsGenerating(true);
        setMessage("");

        try {
            const res = await fetch("/api/rankings");
            const json = await res.json();

            if (!res.ok || !json.rankings) throw new Error(json.error || "Fehler beim Laden der Rankings");

            const { data: results, error: resultsError } = await supabase
                .from("results")
                .select("student_id, sport, scores");

            if (resultsError) throw resultsError;

            const resultsMap = {};
            for (const r of results) {
                if (!resultsMap[r.student_id]) resultsMap[r.student_id] = {};
                resultsMap[r.student_id][r.sport] = r.scores?.value ?? r.scores;
            }

            const rankings = json.rankings;
            const titles = {};
            const listen = {};

            for (const [key, list] of Object.entries(rankings)) {
                listen[key] = list
                    .map((s) => ({
                        ...s,
                        vorname: s.vorname,
                        nachname: s.nachname,
                        total_points: s.total_points || 0,
                        resultDetails: resultsMap[s.id] || {},
                    }))
                    .sort((a, b) => b.total_points - a.total_points);
            }

            // console log all sports from reultsMap r.sport
            const allSports = new Set();
            for (const studentId in resultsMap) {
                for (const sport in resultsMap[studentId]) {
                    allSports.add(sport);
                }
            }

            if (mode === "preset") {
                if (preset === "preset1") {
                    for (const key of Object.keys(listen)) {
                        const [kategorie, geschlecht] = key.split("-");
                        titles[key] = `Rangliste für ${geschlecht === "maennlich" ? "Männlich" : "Weiblich"} in der Alterskategorie ${kategorie.replace("unter16", "bis 15").replace("16bis17", "16 bis 17").replace("ueber18", "18+")}`;
                    }
                } else if (preset === "preset2") {
                    for (const key of Object.keys(listen)) {
                        const [klasse, geschlecht] = key.split("-");
                        titles[key] = `Rangliste für ${geschlecht === "maennlich" ? "Männlich" : "Weiblich"} in der Klasse ${klasse}`;
                    }
                }
            } else {
                let merged = Object.values(listen).flat();
                if (filters.geschlecht !== "alle") {
                    merged = merged.filter(s => s.geschlecht === filters.geschlecht);
                }
                if (filters.altersgruppe !== "alle") {
                    merged = merged.filter(s => {
                        if (filters.altersgruppe === "-15") return s.alter < 16;
                        if (filters.altersgruppe === "16-17") return s.alter >= 16 && s.alter <= 17;
                        return s.alter > 17;
                    });
                }
                listen["Benutzerdefiniert"] = merged.sort((a, b) => b.total_points - a.total_points);
                titles["Benutzerdefiniert"] = `Rangliste für ${filters.geschlecht} in der Altersgruppe ${filters.altersgruppe}`;
            }

            setRanglisten(listen);
            window.exportTitles = titles;
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
        const titles = window.exportTitles || {};
        const sportHeaders = showDetails ? window.sportHeaders || [] : [];

        const allKeys = Object.keys(ranglisten);

        if (exportType === "pdf") {
            const doc = new jsPDF();
            let pos = 10;

            allKeys.forEach((key, idx) => {
                const list = ranglisten[key];
                doc.setFont("helvetica", "bold");
                doc.text(titles[key] || key, 10, pos);
                doc.setFont("helvetica", "normal");
                pos += 6;

                const headers = ["Rang", "Vorname", "Nachname", "Klasse", "Totale Punkte", ...sportHeaders];

                const body = list.map((s, i) => [
                    i + 1,
                    s.vorname,
                    s.nachname,
                    s.klasse,
                    s.total_points,
                    ...sportHeaders.map(sport => s.resultDetails?.[sport] ?? "")
                ]);

                autoTable(doc, {
                    startY: pos,
                    head: [headers],
                    body,
                    theme: "striped",
                    headStyles: { fillColor: [41, 128, 185], fontSize: 7 },
                    styles: { fontSize: 7, cellPadding: 1 }
                });

                pos = doc.lastAutoTable.finalY + 10;
                if (idx !== allKeys.length - 1) {
                    doc.addPage();
                    pos = 10;
                }
            });

            doc.save(`${filename}.pdf`);
        } else if (exportType === "csv") {
            let csv = "";
            allKeys.forEach((key) => {
                const list = ranglisten[key];
                csv += `\n"${titles[key] || key}"\n`;
                const headers = ["Rang", "Vorname", "Nachname", "Totale Punkte", ...sportHeaders];
                csv += headers.join(",") + "\n";
                list.forEach((s, i) => {
                    const row = [
                        i + 1,
                        s.vorname,
                        s.nachname,
                        s.total_points,
                        ...sportHeaders.map(sport => s.resultDetails?.[sport] ?? "")
                    ];
                    csv += row.join(",") + "\n";
                });
            });

            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${filename}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (exportType === "excel") {
            const wb = XLSX.utils.book_new();

            allKeys.forEach((key) => {
                const list = ranglisten[key];
                const headers = ["Rang", "Vorname", "Nachname", "Totale Punkte", ...sportHeaders];
                const rows = list.map((s, i) => [
                    i + 1,
                    s.vorname,
                    s.nachname,
                    s.total_points,
                    ...sportHeaders.map(sport => s.resultDetails?.[sport] ?? "")
                ]);

                const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                XLSX.utils.book_append_sheet(wb, sheet, key.substring(0, 31));
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

                        <div className="mb-4 text-gray-900">
                            <label className="block mb-2 font-medium text-sm">Modus wählen:</label>
                            <select value={mode} onChange={e => setMode(e.target.value)}
                                    className="w-full p-2 border rounded">
                                <option value="preset">📋 Vorlage verwenden</option>
                                <option value="custom">⚙️ Eigene Filter definieren</option>
                            </select>
                        </div>

                        {mode === "preset" ? (
                            <div className="mb-4 text-gray-900">
                                <label className="block mb-2 font-medium text-sm">Vorlage:</label>
                                <select value={preset} onChange={e => setPreset(e.target.value)}
                                        className="w-full p-2 border rounded">
                                    <option value="preset1">Nach Alterskategorie & Geschlecht</option>
                                    <option value="preset2">Nach Klasse & Geschlecht</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 mb-4 text-gray-900">
                                <label className="text-sm ">Geschlecht</label>
                                <select value={filters.geschlecht}
                                        onChange={e => setFilters(prev => ({...prev, geschlecht: e.target.value}))}
                                        className="w-full p-2 border rounded">
                                    <option value="alle">Alle</option>
                                    <option value="maennlich">Männlich</option>
                                    <option value="weiblich">Weiblich</option>
                                </select>
                                <label className="text-sm">Altersgruppe</label>
                                <select value={filters.altersgruppe}
                                        onChange={e => setFilters(prev => ({...prev, altersgruppe: e.target.value}))}
                                        className="w-full p-2 border rounded">
                                    <option value="alle">Alle</option>
                                    <option value="-15">-15</option>
                                    <option value="16-17">16-17</option>
                                    <option value="18+">18+</option>
                                </select>
                            </div>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="showDetails"
                                checked={showDetails}
                                onChange={() => setShowDetails(prev => !prev)}
                            />
                            <label htmlFor="showDetails" className="text-sm text-gray-800">Disziplin-Resultate
                                anzeigen</label>
                        </div>

                        <div className="text-gray-900 mb-4">
                            <label className="block mb-2 font-medium text-sm">Exportformat:</label>
                            <select value={exportType} onChange={e => setExportType(e.target.value)}
                                    className="w-full p-2 border rounded">
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
