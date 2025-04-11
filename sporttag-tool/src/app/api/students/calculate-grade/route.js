import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function POST(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    try {
        const [{ data: students, error: studentError }, { data: grades, error: gradesError }, { data: results, error: resultsError }] = await Promise.all([
            supabase.from("students").select("id, total_points, age_category, geschlecht").not("total_points", "is", null),
            supabase.from("grades_table").select("points_min, grade, gender, age_category"),
            supabase.from("results").select("student_id, grade, skipped")
        ]);

        if (studentError || gradesError || resultsError) {
            const message = studentError?.message || gradesError?.message || resultsError?.message;
            return new Response(JSON.stringify({ error: message }), { status: 500 });
        }

        const studentResultsMap = results.reduce((acc, r) => {
            if (!acc[r.student_id]) acc[r.student_id] = [];
            acc[r.student_id].push(r);
            return acc;
        }, {});

        const updates = [];

        for (const student of students) {
            const { id, total_points, age_category, geschlecht } = student;
            const studentResults = studentResultsMap[id] || [];

            // Prüfe, ob mindestens eine Sportart übersprungen wurde.
            const hasSkipped = studentResults.some(r => r.skipped === true);

            let finalGrade;

            if (hasSkipped) {
                const validGrades = studentResults
                    .filter(r => r.skipped !== true && r.grade !== null)
                    .map(r => r.grade);

                if (validGrades.length > 0) {
                    const sumGrades = validGrades.reduce((sum, grade) => sum + grade, 0);
                    finalGrade = parseFloat((sumGrades / validGrades.length).toFixed(2));
                    console.log(`Student ${id}: Durchschnittsnote berechnet =`, finalGrade);
                } else {
                    console.warn(`Student ${id}: Keine gültigen Noten verfügbar.`);
                    finalGrade = null;
                }
            } else {
                const passendeGrades = grades
                    .filter(g => g.gender === geschlecht && g.age_category === age_category)
                    .sort((a, b) => b.points_min - a.points_min);

                if (passendeGrades.length === 0) {
                    console.warn(`Keine Notendefinition für ${geschlecht}, ${age_category}`);
                    continue;
                }

                finalGrade = passendeGrades.find(g => total_points >= g.points_min)?.grade
                    || passendeGrades[passendeGrades.length - 1].grade;

                console.log(`Student ${id}: Note laut Tabelle =`, finalGrade);
            }

            if (finalGrade !== null) {
                updates.push({ id, grade: finalGrade });
            }
        }

        for (const update of updates) {
            const { error } = await supabase
                .from("students")
                .update({ grade: update.grade })
                .eq("id", update.id);

            if (error) {
                console.error(`Fehler beim Aktualisieren von ID ${update.id}:`, error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500 });
            }
        }

        return new Response(JSON.stringify({ success: true, updated: updates.length }), { status: 200 });
    } catch (err) {
        console.error("Unerwarteter Fehler in grade-calculation:", err);
        return new Response(JSON.stringify({ error: "Interner Fehler" }), { status: 500 });
    }
}
