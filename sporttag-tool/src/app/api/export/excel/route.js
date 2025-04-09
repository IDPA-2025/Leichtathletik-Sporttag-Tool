import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";
import * as XLSX from "xlsx";

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

        const wb = XLSX.utils.book_new();

        for (const [key, list] of Object.entries(rankings)) {
            const sportHeaders = sports.map(s => s.code);
            const headers = ["Vorname", "Nachname", "Klasse", "Totale Punkte", ...sportHeaders];

            const rows = list.map(s => {
                const student = studentMap[s.id];
                return [
                    student.vorname,
                    student.nachname,
                    student.klasse,
                    s.total_points,
                    ...sportHeaders.map(code => {
                        const d = resultsMap[s.id]?.[code];
                        if (student.helfer) return "-";
                        if (d?.skipped) return "Übersprungen";
                        const val = d?.value;
                        const unit = sportUnitMap[code] || "";
                        const pts = d?.points != null ? `${d.points} Pkt.` : "";
                        const note = d?.grade != null ? `Note: ${d.grade}` : "";
                        return `${val ?? ""} ${unit} ${pts} ${note}`.trim();
                    })
                ];
            });

            const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            XLSX.utils.book_append_sheet(wb, sheet, key.substring(0, 31));
        }

        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename=Rangliste.xlsx`
            }
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
