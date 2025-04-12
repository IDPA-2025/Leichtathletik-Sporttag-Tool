import { supabase } from "../../../lib/supabaseClient";
import { requireAnyRole } from "@/app/lib/auth";

export async function POST(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    try {
        // Alle relevanten Daten laden
        const [{ data: students, error: studentError }, { data: grades, error: gradesError }, { data: results, error: resultsError }] = await Promise.all([
            supabase.from("students").select("id, age_category, geschlecht"),
            supabase.from("grades_table").select("points_min, grade, gender, age_category"),
            supabase.from("results").select("student_id, points, grade, skipped")
        ]);

        if (studentError || gradesError || resultsError) {
            const message = studentError?.message || gradesError?.message || resultsError?.message;
            return new Response(JSON.stringify({ error: message }), { status: 500 });
        }

        // Gruppieren der Resultate pro Schüler
        const resultMap = results.reduce((acc, r) => {
            if (!acc[r.student_id]) acc[r.student_id] = [];
            acc[r.student_id].push(r);
            return acc;
        }, {});

        const updates = [];

        for (const student of students) {
            const { id, age_category, geschlecht } = student;
            const studentResults = resultMap[id] || [];

            // 🔢 Punkte berechnen (nur gültige, nicht übersprungene Disziplinen)
            const totalPoints = studentResults
                .filter(r => r.points !== null && r.skipped !== true)
                .reduce((sum, r) => sum + r.points, 0);

            let finalGrade = null;

            const hasSkipped = studentResults.some(r => r.skipped === true);

            if (hasSkipped) {
                const validGrades = studentResults
                    .filter(r => r.skipped !== true && r.grade !== null)
                    .map(r => r.grade);

                if (validGrades.length > 0) {
                    const avg = validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length;
                    finalGrade = parseFloat(avg.toFixed(2));
                } else {
                    finalGrade = 1;
                }
            } else {
                const passendeNote = grades
                    .filter(g => g.gender === geschlecht && g.age_category === age_category)
                    .sort((a, b) => b.points_min - a.points_min)
                    .find(g => totalPoints >= g.points_min);

                finalGrade = passendeNote?.grade ?? 1;
            }

            updates.push({ id, grade: finalGrade, total_points: totalPoints });
        }

        // In Datenbank schreiben
        for (const update of updates) {
            const { error } = await supabase
                .from("students")
                .update({
                    grade: update.grade,
                    total_points: update.total_points
                })
                .eq("id", update.id);

            if (error) {
                console.error(`❌ Fehler bei Update von ${update.id}:`, error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500 });
            }
        }

        return new Response(JSON.stringify({ success: true, updated: updates.length }), { status: 200 });
    } catch (err) {
        console.error("❌ Interner Fehler:", err);
        return new Response(JSON.stringify({ error: "Interner Serverfehler" }), { status: 500 });
    }
}
