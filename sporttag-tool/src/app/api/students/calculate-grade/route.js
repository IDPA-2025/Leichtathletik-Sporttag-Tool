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
            const { id } = student;
            const studentResults = resultMap[id] || [];

            // 🔢 Punkte berechnen (nur gültige, nicht übersprungene Disziplinen)
            const totalPoints = studentResults
                .filter(r => r.points !== null && r.skipped !== true)
                .reduce((sum, r) => sum + r.points, 0);

            // 📘 Neue Logik: Immer Durchschnittsnote verwenden (auch wenn kein Skip)
            const validGrades = studentResults
                .filter(r => r.grade !== null)
                .map(r => r.grade);

            let finalGrade = 1; // Fallback

            if (validGrades.length > 0) {
                const avg = validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length;
                finalGrade = Math.round(avg * 4) / 4;
            }

            updates.push({ id, grade: finalGrade, total_points: totalPoints });
        }

        const updatePromises = updates.map(update =>
            supabase
                .from("students")
                .update({
                    grade: update.grade,
                    total_points: update.total_points
                })
                .eq("id", update.id)
        );

        const updateResults = await Promise.all(updatePromises);

        for (let i = 0; i < updateResults.length; i++) {
            const { error } = updateResults[i];
            if (error) {
                console.error(`❌ Fehler bei Update von ${updates[i].id}:`, error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500 });
            }
        }

        return new Response(JSON.stringify({ success: true, updated: updates.length }), { status: 200 });
    } catch (err) {
        console.error("❌ Interner Fehler:", err);
        return new Response(JSON.stringify({ error: "Interner Serverfehler" }), { status: 500 });
    }
}
