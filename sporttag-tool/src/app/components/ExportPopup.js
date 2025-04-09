"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ExportPopup({ onClose }) {
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState("");
    const [filters, setFilters] = useState({ geschlecht: "alle", altersgruppe: "alle", klasse: "alle" });
    const [ranglisten, setRanglisten] = useState({});
    const [exportType, setExportType] = useState("csv");
    const [preset, setPreset] = useState("preset1");
    const [mode, setMode] = useState("preset");
    const [showDetails, setShowDetails] = useState(false);
    const [showGrades, setShowGrades] = useState(false);
    const [klassen, setKlassen] = useState([]);


    useEffect(() => {
        const fetchKlassen = async () => {
            try {
                const response = await fetch("/api/students/classes");
                if (!response.ok) throw new Error("Fehler beim Laden der Klassen");
                const data = await response.json();
                setKlassen(data.classes || []);
            } catch (error) {
                console.error("Fehler beim Abrufen der Klassen:", error);
            }
        };

        fetchKlassen();
    }, []);

    const formatDisziplinZelle = (s, sport, sportUnitMap) => {
        if (s.helfer) return "-";
        const detail = s.resultDetails?.[sport];
        if (detail?.skipped) return "Übersprungen";

        const value = detail?.value;
        const unit = sportUnitMap[sport] || "";
        const points = detail?.points;
        const grade = detail?.grade;

        const parts = [];
        if (value !== undefined && value !== null) parts.push(`${value} ${unit}`.trim());
        if (points != null) parts.push(`${points} Pkt.`);
        if (grade != null) parts.push(`Note: ${grade}`);

        return parts.join(" | ");
    };

    const generateDisziplinZellen = (s, sportHeaders, sportUnitMap) => {
        return sportHeaders.map(sport => formatDisziplinZelle(s, sport, sportUnitMap));
    };

    const generateExportRow = (s, i, sportHeaders, sportUnitMap) => {
        const rankDisplay = s.rang || (s.helfer ? "Helfer" : (i + 1));
        return [
            rankDisplay,
            s.vorname,
            s.nachname,
            s.klasse,
            s.total_points,
            ...(showGrades ? [s.grade ?? "-"] : []),
            ...generateDisziplinZellen(s, sportHeaders, sportUnitMap)
        ];
    };


    const handleExport = () => {
        const filename = generateExportFilename();
        const titles = window.exportTitles || {};
        const sportHeaders = showDetails ? window.sportHeaders || [] : [];
        const sportUnitMap = window.sportUnitMap || {};

        // Get filtered keys or all keys depending on mode
        const allKeys = Object.keys(ranglisten);

        if (exportType === "pdf") {
            const doc = new jsPDF();
            let pos = 10;

            allKeys.forEach((key, idx) => {
                const list = ranglisten[key];
                if (list.length === 0) return;

                doc.setFont("helvetica", "bold");
                doc.text(titles[key] || key, 10, pos);
                doc.setFont("helvetica", "normal");
                pos += 6;

                const headers = [
                    "Rang", "Vorname", "Nachname", "Klasse", "Totale Punkte",
                    ...(showGrades ? ["Note"] : []),
                    ...sportHeaders.map(code => window.sportNameMap?.[code] || code)
                ];

                const body = list.map((s, i) => generateExportRow(s, i, sportHeaders, sportUnitMap));


                autoTable(doc, {
                    startY: pos,
                    head: [headers],
                    body,
                    theme: "striped",
                    headStyles: { fillColor: [41, 128, 185], fontSize: 7 },
                    styles: { fontSize: 7, cellPadding: 1 },
                    didParseCell: function (data) {
                        const student = list[data.row.index];

                        if (data.section === 'body' && student) {
                            data.cell.styles.textColor = [0, 0, 0];
                            data.cell.styles.fillColor = null;
                            data.cell.styles.fontStyle = 'normal';

                            if (student.helfer !== true) {
                                if (data.row.index === 0) data.cell.styles.fillColor = [255, 223, 100];
                                else if (data.row.index === 1) data.cell.styles.fillColor = [220, 220, 220];
                                else if (data.row.index === 2) data.cell.styles.fillColor = [205, 127, 50];
                                else if (student.total_points === 0) data.cell.styles.fillColor = [255, 102, 102];

                            } else if (data.column.index === 0) {
                                data.cell.styles.fontStyle = 'bold';
                            }
                            if (student.rang === "Abwesend") {
                                data.cell.styles.fillColor = [240, 240, 240];
                                data.cell.styles.fontStyle = 'bold';
                            }


                            if (showDetails) {
                                const fixedColumnCount = 5 + (showGrades ? 1 : 0);
                                if (data.column.index >= fixedColumnCount) {
                                    const sportIndex = data.column.index - fixedColumnCount;
                                    if (sportIndex >= 0 && sportIndex < sportHeaders.length) {
                                        const sportCode = sportHeaders[sportIndex];
                                        const detail = student.resultDetails?.[sportCode];
                                        if (detail && detail.skipped === true) {
                                            data.cell.styles.fillColor = [255, 204, 203];
                                            data.cell.styles.textColor = [150, 150, 150];
                                            data.cell.styles.fontStyle = 'normal';
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                pos = doc.lastAutoTable.finalY + 10;
                // Seitenumbruch-Logik
                if (idx < allKeys.length - 1) {
                    doc.addPage();
                    pos = 10;
                }
            });
            doc.save(`${filename}.pdf`);

        } else if (exportType === "csv") {
            let csv = "";
            allKeys.forEach((key) => {
                const list = ranglisten[key];

                if (list.length === 0) return;

                csv += `\n"${titles[key] || key}"\n`;
                const headers = [
                    "Rang", "Vorname", "Nachname", "Klasse", "Totale Punkte",
                    ...(showGrades ? ["Note"] : []),
                    ...sportHeaders.map(code => window.sportNameMap?.[code] || code)
                ];
                csv += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

                list.forEach((s, i) => {
                    const formattedRow = generateExportRow(s, i, sportHeaders, sportUnitMap).map(val =>
                        `"${String(val).replace(/"/g, '""')}"`
                    );
                    csv += formattedRow.join(",") + "\n";
                });

            });

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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

                if (list.length === 0) return;

                const headers = [
                    "Rang", "Vorname", "Nachname", "Klasse", "Totale Punkte",
                    ...(showGrades ? ["Note"] : []),
                    ...sportHeaders.map(code => window.sportNameMap?.[code] || code)
                ];

                const rows = list.map((s, i) => generateExportRow(s, i, sportHeaders, sportUnitMap));


                const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                XLSX.utils.book_append_sheet(wb, sheet, key.substring(0, 31));
            });

            XLSX.writeFile(wb, `${filename}.xlsx`);
        }
    };

    const generateExportFilename = () => {
        if (mode === "preset") {
            return preset === "preset1"
                ? "Rangliste_Altersgruppe_Geschlecht"
                : "Rangliste_Klasse_Geschlecht";
        } else {
            const geschlecht = filters.geschlecht === "alle" ? "Alle" : filters.geschlecht;
            const altersgruppe = filters.altersgruppe === "alle" ? "Alle" : filters.altersgruppe;
            const klasse = filters.klasse === "alle" ? "Alle" : filters.klasse;
            return `Rangliste_${geschlecht}_${altersgruppe}_${klasse}`;
        }
    };

    const handleGenerateRanking = async () => {
        setIsGenerating(true);
        setMessage("");

        try {
            const res = await fetch("/api/rankings/with-details");
            const json = await res.json();

            if (!res.ok || !json.rankings) throw new Error(json.error || "Fehler beim Laden der Daten");

            const { rankings, results, sports, students: studentDetails } = json;

            const studentMap = {};
            for (const student of studentDetails) {
                studentMap[student.id] = student;
            }

            const resultsMap = {};
            for (const r of results) {
                if (!resultsMap[r.student_id]) resultsMap[r.student_id] = {};
                resultsMap[r.student_id][r.sport] = {
                    value: r.best_result?.value ?? r.best_result,
                    skipped: r.skipped,
                    grade: r.grade ?? null,
                    points: r.points ?? null
                };

            }

            const sportUnitMap = {};
            for (const s of sports) {
                sportUnitMap[s.code] = s.mesure_unit_short;
            }

            const sportNameMap = {};
            for (const s of sports) {
                sportNameMap[s.code] = s.name;
            }

            const titles = {};
            let listen = {};

            if (mode === "preset") {
                for (const [key, list] of Object.entries(rankings)) {
                    let rankCounter = 1;
                    listen[key] = list
                        .map((s) => ({
                            ...s,
                            vorname: s.vorname,
                            nachname: s.nachname,
                            total_points: s.total_points || 0,
                            grade: studentMap[s.id]?.grade,
                            resultDetails: resultsMap[s.id] || {},
                            helfer: studentMap[s.id]?.helfer,
                            anwesend: studentMap[s.id]?.anwesend
                        }))
                        .sort((a, b) => {
                            if (!a.anwesend && b.anwesend) return 1;
                            if (a.anwesend && !b.anwesend) return -1;
                            if (a.helfer && !b.helfer && a.anwesend && b.anwesend) return 1;
                            if (!a.helfer && b.helfer && a.anwesend && b.anwesend) return -1;
                            return b.total_points - a.total_points;
                        })
                        .map(student => {
                            if (student.anwesend === true && student.helfer === false) {
                                student.rang = rankCounter++;
                            } else if (student.anwesend === false) {
                                student.rang = "Abwesend";
                            } else {
                                student.rang = "Helfer";
                            }
                            return student;
                        });

                    if (preset === "preset1") {
                        const [kategorie, geschlecht] = key.split("-");
                        titles[key] = `Rangliste für ${geschlecht === "maennlich" ? "Männlich" : "Weiblich"} in der Alterskategorie ${kategorie.replace("unter16", "bis 15").replace("16bis17", "16 bis 17").replace("ueber18", "18+")}`;
                    } else if (preset === "preset2") {
                        const [klasse, geschlecht] = key.split("-");
                        titles[key] = `Rangliste für ${geschlecht === "maennlich" ? "Männlich" : "Weiblich"} in der Klasse ${klasse}`;
                    }
                }
            } else {
                let allStudents = [];
                for (const list of Object.values(rankings)) {
                    allStudents = [...allStudents, ...list];
                }

                allStudents = allStudents.map(s => ({
                    ...s,
                    vorname: s.vorname,
                    nachname: s.nachname,
                    total_points: s.total_points || 0,
                    grade: studentMap[s.id]?.grade,
                    resultDetails: resultsMap[s.id] || {},
                    helfer: studentMap[s.id]?.helfer,
                    anwesend: studentMap[s.id]?.anwesend
                }));

                let filteredStudents = allStudents;
                if (filters.geschlecht !== "alle") {
                    filteredStudents = filteredStudents.filter(s => s.geschlecht === filters.geschlecht);
                }

                if (filters.altersgruppe !== "alle") {
                    filteredStudents = filteredStudents.filter(s => {
                        if (filters.altersgruppe === "-15") return s.alter < 16;
                        if (filters.altersgruppe === "16-17") return s.alter >= 16 && s.alter <= 17;
                        return s.alter > 17;
                    });
                }

                if (filters.klasse !== "alle") {
                    filteredStudents = filteredStudents.filter(s => s.klasse === filters.klasse);
                }

                let rankCounter = 1;
                filteredStudents = filteredStudents.sort((a, b) => {
                    // Abwesende und Helfer immer ans Ende sortieren
                    if (!a.anwesend && b.anwesend) return 1;
                    if (a.anwesend && !b.anwesend) return -1;
                    if (a.helfer && !b.helfer && a.anwesend && b.anwesend) return 1;
                    if (!a.helfer && b.helfer && a.anwesend && b.anwesend) return -1;
                    // Ansonsten nach Punkten absteigend sortieren
                    return b.total_points - a.total_points;
                }).map(student => {
                    // Weise den Rang zu, aber nur, wenn 'anwesend' true und 'helfer' false ist
                    if (student.anwesend === true && student.helfer === false) {
                        student.rang = rankCounter++; // Inkrementiere den Zähler und weise den Rang zu
                    } else if (student.anwesend === false) {
                        student.rang = "Abwesend";
                    } else {
                        student.rang = "Helfer";
                    }
                    return student;
                });

                listen = {
                    "Benutzerdefiniert": filteredStudents
                };

                const geschlechtText = filters.geschlecht === "alle" ? "Alle" :
                    (filters.geschlecht === "maennlich" ? "Männlich" : "Weiblich");

                const altersText = filters.altersgruppe === "alle" ? "alle Altersgruppen" :
                    (filters.altersgruppe === "-15" ? "bis 15 Jahre" :
                        (filters.altersgruppe === "16-17" ? "16 bis 17 Jahre" : "18+ Jahre"));

                const klasseText = filters.klasse === "alle" ? "alle Klassen" : `Klasse ${filters.klasse}`;

                titles["Benutzerdefiniert"] = `Rangliste für ${geschlechtText} in ${altersText}, ${klasseText}`;
            }

            window.exportTitles = titles;

            const allSports = new Set();
            for (const studentId in resultsMap) {
                for (const sport in resultsMap[studentId]) {
                    allSports.add(sport);
                }
            }

            window.sportHeaders = Array.from(allSports);
            window.sportUnitMap = sportUnitMap;
            window.sportNameMap = sportNameMap;

            setRanglisten(listen);
            setStep(2);
        } catch (err) {
            console.error("Fehler beim Generieren:", err);
            setMessage("❌ Fehler: " + (err.message || JSON.stringify(err)));
        } finally {
            setIsGenerating(false);
        }
    };    // Function to handle grade calculation
    const calculateGrades = async () => {
        try {
            setIsGenerating(true);
            setMessage("Berechne Noten...");

            const response = await fetch("/api/students/calculate-grade", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Fehler bei der Notenberechnung");
            }

            setMessage(`✅ Noten für ${result.updated} Schüler aktualisiert`);

            // Re-fetch data after grade calculation
            await handleGenerateRanking();
        } catch (error) {
            console.error("Fehler bei der Notenberechnung:", error);
            setMessage("❌ Fehler: " + (error.message || "Unbekannter Fehler bei der Notenberechnung"));
        } finally {
            setIsGenerating(false);
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
                            <select value={mode} onChange={e => setMode(e.target.value)} className="w-full p-2 border rounded">
                                <option value="preset">📋 Vorlage verwenden</option>
                                <option value="custom">⚙️ Eigene Filter definieren</option>
                            </select>
                        </div>

                        {mode === "preset" ? (
                            <div className="mb-4 text-gray-900">
                                <label className="block mb-2 font-medium text-sm">Vorlage:</label>
                                <select value={preset} onChange={e => setPreset(e.target.value)} className="w-full p-2 border rounded">
                                    <option value="preset1">Nach Alterskategorie & Geschlecht</option>
                                    <option value="preset2">Nach Klasse & Geschlecht</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 mb-4 text-gray-900">
                                <label className="text-sm">Geschlecht</label>
                                <select
                                    value={filters.geschlecht}
                                    onChange={e => setFilters(prev => ({ ...prev, geschlecht: e.target.value }))}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="alle">Alle</option>
                                    <option value="maennlich">Männlich</option>
                                    <option value="weiblich">Weiblich</option>
                                </select>

                                <label className="text-sm">Altersgruppe</label>
                                <select
                                    value={filters.altersgruppe}
                                    onChange={e => setFilters(prev => ({ ...prev, altersgruppe: e.target.value }))}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="alle">Alle</option>
                                    <option value="-15">-15</option>
                                    <option value="16-17">16-17</option>
                                    <option value="18+">18+</option>
                                </select>

                                <label className="text-sm">Klasse</label>
                                <select
                                    value={filters.klasse}
                                    onChange={e => setFilters(prev => ({ ...prev, klasse: e.target.value }))}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="alle">Alle Klassen</option>
                                    {klassen.map(k => (
                                        <option key={k} value={k}>{k}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="mb-4">
                            <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <h3 className="font-medium text-blue-800 mb-1">Anzeigeoptionen</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="showDetails"
                                            checked={showDetails}
                                            onChange={() => setShowDetails(prev => !prev)}
                                        />
                                        <label htmlFor="showDetails" className="text-sm text-gray-800">Disziplin-Resultate anzeigen</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="showGrades"
                                            checked={showGrades}
                                            onChange={() => setShowGrades(prev => !prev)}
                                        />
                                        <label htmlFor="showGrades" className="text-sm text-gray-800">Noten anzeigen</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-gray-900 mb-4">
                            <label className="block mb-2 font-medium text-sm">Exportformat:</label>
                            <select value={exportType} onChange={e => setExportType(e.target.value)} className="w-full p-2 border rounded">
                                <option value="csv">CSV</option>
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                onClick={async () => {
                                    await calculateGrades(); // erst Noten berechnen
                                    await handleGenerateRanking(); // dann Rangliste generieren
                                }}

                                disabled={isGenerating}
                                className={`py-3 rounded-lg font-semibold ${isGenerating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                            >
                                {isGenerating ? "Generiere..." : "Ranglisten generieren"}
                            </button>
                        </div>

                        {message && <p className="mt-2 text-sm text-center text-gray-800">{message}</p>}
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
                        Fenster schließen
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