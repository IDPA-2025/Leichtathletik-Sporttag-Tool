// /api/exports/csv/route.js
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const res = await fetch("http://localhost:3000/api/rankings/with-details");
        const json = await res.json();

        if (!res.ok || !json.rankings) throw new Error(json.error || "Fehler beim Laden der Daten");

        const { rankings, results, sports, students: studentDetails } = json;

        const studentMap = {};
        for (const student of studentDetails) studentMap[student.id] = student;

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
        for (const s of sports) sportUnitMap[s.code] = s.mesure_unit_short;

        const sportHeaders = sports.map(s => s.code);
        let csv = "";

        for (const [key, list] of Object.entries(rankings)) {
            csv += `\n"${key}"\n`;

            const headers = [
                "Vorname", "Nachname", "Klasse", "Totale Punkte",
                ...sportHeaders.map(code => code)
            ];
            csv += headers.map(h => `"${h}"`).join(",") + "\n";

            list.forEach(s => {
                const student = studentMap[s.id];
                const row = [
                    student.vorname,
                    student.nachname,
                    student.klasse,
                    s.total_points,
                    ...sportHeaders.map(code => {
                        const d = resultsMap[s.id]?.[code];
                        if (student.helfer) return "-";
                        if (d?.skipped) return "Übersprungen";
                        const val = d?.value ?? "";
                        const unit = sportUnitMap[code] || "";
                        const pts = d?.points != null ? `${d.points} Pkt.` : "";
                        const note = d?.grade != null ? `Note: ${d.grade}` : "";
                        return `${val} ${unit} ${pts} ${note}`.trim().replace(/"/g, '""');
                    })
                ];
                csv += row.map(cell => `"${cell}"`).join(",") + "\n";
            });
        }

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": "attachment; filename=Rangliste.csv"
            }
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
