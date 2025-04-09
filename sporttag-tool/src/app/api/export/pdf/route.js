import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET() {
    try {
        const res = await fetch("http://localhost:3000/api/rankings/with-details");
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
        for (const s of sports) sportUnitMap[s.code] = s.mesure_unit_short;

        const doc = new jsPDF();
        let pos = 10;

        const allKeys = Object.keys(rankings);

        allKeys.forEach((key, idx) => {
            const list = rankings[key];
            if (!list.length) return;

            doc.setFont("helvetica", "bold");
            doc.text(key, 10, pos);
            pos += 6;

            const headers = ["Vorname", "Nachname", "Klasse", "Totale Punkte"];
            const sportHeaders = sports.map(s => s.code);
            headers.push(...sportHeaders);

            const body = list.map(s => {
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

            autoTable(doc, {
                startY: pos,
                head: [headers],
                body,
                theme: "striped",
                styles: { fontSize: 8, cellPadding: 1 }
            });

            pos = doc.lastAutoTable.finalY + 10;
            if (idx < allKeys.length - 1) {
                doc.addPage();
                pos = 10;
            }
        });

        const pdf = doc.output("arraybuffer");
        return new NextResponse(Buffer.from(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=Rangliste.pdf`
            }
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
