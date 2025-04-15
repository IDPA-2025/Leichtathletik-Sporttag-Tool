import {requireAnyRole} from "@/app/lib/auth";

export async function POST(req) {

    try {
        const user = requireAnyRole(req, ["teacher"]);
        const { mode, preset, filters, showDetails, showGrades } = await req.json();

        const cookie = req.headers.get("cookie");
        const { origin } = new URL(req.url);

        const rankingsRes = await fetch(`/api/rankings/with-details`, {
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

            // Filter keys based on preset
            const keyPrefix = preset === "preset1" ? "category__" : "class__";
            const relevantKeys = Object.keys(rankings).filter(key => key.startsWith(keyPrefix));

            for (const key of relevantKeys) {
                // Now split by "__" instead of "-"
                const parts = key.split("__");
                // parts[0] is "category" or "class"
                // parts[1] is the actual category or class value
                // parts[2] is the gender

                const type = parts[0];        // "category" or "class"
                const value = parts[1];       // The category value or class value
                const geschlecht = parts[2];  // The gender

                const list = rankings[key];
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

                if (type === "category") {
                    titles[key] = `Rangliste für ${geschlecht === "maennlich" ? "Männlich" : "Weiblich"} in der Alterskategorie ${formatAgeCategory(value)}`;
                } else if (type === "class") {
                    titles[key] = `Rangliste für ${geschlecht === "maennlich" ? "Männlich" : "Weiblich"} in der Klasse ${value}`;
                }
            }
        } else {
            let allStudents = [];
            for (const list of Object.values(rankings)) {
                allStudents = [...allStudents, ...list];
            }

            const seenIds = new Set();
            allStudents = allStudents.filter(s => {
                if (seenIds.has(s.id)) return false;
                seenIds.add(s.id);
                return true;
            });

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