import {requireAnyRole} from "@/app/lib/auth";

export async function POST(req) {

    try {
        const user = requireAnyRole(req, ["teacher"]);
        const { mode, preset, filters, showDetails, showGrades } = await req.json();

        const cookie = req.headers.get("cookie");

        const rankingsRes = await fetch(`${process.env.INTERNAL_API_URL}/api/rankings/with-details`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Cookie": cookie
            }
        });

        if (!rankingsRes.ok) throw new Error("Fehler beim Laden der Rankings");

        const json = await rankingsRes.json();
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
        const sportNameMap = {};
        for (const s of sports) {
            sportUnitMap[s.code] = s.mesure_unit_short;
            sportNameMap[s.code] = s.name;
        }

        const titles = {};
        let listen = {};

        if (mode === "preset") {
            console.log("🔑 Rankings-Keys:", Object.keys(rankings));

            for (const [key, list] of Object.entries(rankings)) {
                let rankCounter = 1;
                listen[key] = list
                    .map((s) => ({
                        ...s,
                        vorname: s.vorname,
                        nachname: s.nachname,
                        total_points: studentMap[s.id]?.total_points || 0,
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

                const formatAgeCategory = (kat) => {
                    switch (kat) {
                        case "-15":
                            return "bis 15";
                        case "16-17":
                            return "16 bis 17";
                        case "18+":
                            return "18+";
                        default:
                            return "Unbekannt";
                    }
                };

                if (preset === "preset1") {
                    const parts = key.split("-");
                    const geschlecht = parts.at(-1);
                    const kategorie = parts.slice(0, -1).join("-");

                    titles[key] = `Rangliste für ${geschlecht === "maennlich" ? "Männlich" : "Weiblich"} in der Alterskategorie ${formatAgeCategory(kategorie)}`;
                } else if (preset === "preset2") {
                    const parts = key.split("-");
                    const geschlecht = parts.at(-1);
                    const klasse = parts.slice(0, -1).join("-");

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
                total_points: studentMap[s.id]?.total_points || 0,
                grade: studentMap[s.id]?.grade,
                resultDetails: resultsMap[s.id] || {},
                helfer: studentMap[s.id]?.helfer,
                anwesend: studentMap[s.id]?.anwesend
            }));

            let filteredStudents = allStudents;
            console.log("All students count:", allStudents.length);
            console.log("Sample student data:", allStudents.length > 0 ? allStudents[0] : "No students");

            if (filters.geschlecht !== "alle") {
                console.log("Filtering by gender:", filters.geschlecht);
                filteredStudents = filteredStudents.filter(s => s.geschlecht === filters.geschlecht);
                console.log("After gender filter count:", filteredStudents.length);
            }

// Similar logs for other filters

            if (filters.altersgruppe !== "alle") {
                console.log("Filtering by age category:", filters.altersgruppe);
                filteredStudents = filteredStudents.filter(s => s.kategorie === filters.altersgruppe);
                console.log("After age filter count:", filteredStudents.length);
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

        const allSports = new Set();
        for (const studentId in resultsMap) {
            for (const sport in resultsMap[studentId]) {
                allSports.add(sport);
            }
        }

        const sportHeaders = Array.from(allSports);

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