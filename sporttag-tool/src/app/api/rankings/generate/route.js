// /api/rankings/generate/route.js

import {requireAnyRole} from "@/app/lib/auth";

export async function POST(req) {
    const user = requireAnyRole(req, ["teacher"]);

    try {
        const { mode, preset, filters, showDetails, showGrades } = await req.json();

        // Daten laden
        const rankingsRes = await fetch(`${process.env.INTERNAL_API_URL}/api/rankings/with-details`);
        if (!rankingsRes.ok) throw new Error("Fehler beim Laden der Rankings");

        const json = await rankingsRes.json();
        const { rankings, results, sports, students: studentDetails } = json;

        // Ergebnisse verarbeiten (aus dem Frontend-Code hierher verschoben)
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
        const sportNameMap = {};
        for (const s of sports) {
            sportUnitMap[s.code] = s.mesure_unit_short;
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
            // Benutzerdefinierte Filter
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
                if (!a.anwesend && b.anwesend) return 1;
                if (a.anwesend && !b.anwesend) return -1;
                if (a.helfer && !b.helfer && a.anwesend && b.anwesend) return 1;
                if (!a.helfer && b.helfer && a.anwesend && b.anwesend) return -1;
                return b.total_points - a.total_points;
            }).map(student => {
                if (student.anwesend === true && student.helfer === false) {
                    student.rang = rankCounter++;
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

        // Sammle alle verwendeten Sport-Codes
        const allSports = new Set();
        for (const studentId in resultsMap) {
            for (const sport in resultsMap[studentId]) {
                allSports.add(sport);
            }
        }

        const sportHeaders = Array.from(allSports);

        // Gib alle Daten zurück, die für Export benötigt werden
        return Response.json({
            ranglisten: listen,
            titles,
            sportHeaders,
            sportUnitMap,
            sportNameMap
        });
    } catch (error) {
        console.error("API Error:", error);
        return Response.json({ error: error.message || "Interner Serverfehler" }, { status: 500 });
    }
}