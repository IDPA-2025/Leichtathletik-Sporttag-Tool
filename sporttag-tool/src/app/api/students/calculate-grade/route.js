import { supabase } from "../../../lib/supabaseClient";

export async function POST() {
    try {
        // Lade alle Schüler mit total_points, age_category, geschlecht
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select("id, total_points, age_category, geschlecht")
            .not("total_points", "is", null);

        if (studentError) {
            console.error("Fehler beim Laden der Schüler:", studentError);
            return new Response(JSON.stringify({ error: studentError.message }), { status: 500 });
        }

        // Lade alle Notenbereiche
        const { data: grades, error: gradesError } = await supabase
            .from("grades_table")
            .select("points_min, grade, gender, age_category");

        if (gradesError) {
            console.error("Fehler beim Laden der Notenbereiche:", gradesError);
            return new Response(JSON.stringify({ error: gradesError.message }), { status: 500 });
        }

        const updates = [];

        for (const student of students) {
            const { id, total_points, age_category, geschlecht } = student;

            const passendeGrades = grades
                .filter(g =>
                    g.gender === geschlecht &&
                    g.age_category === age_category
                )
                .sort((a, b) => b.points_min - a.points_min); // höchste zuerst

            if (passendeGrades.length === 0) {
                console.warn(`Keine Notendefinition für ${geschlecht}, ${age_category}`);
                continue;
            }

            // Suche die höchste passende Note (points_min <= total_points)
            let note = passendeGrades.find(g => total_points >= g.points_min)?.grade;

            // Falls keine passt, nimm die kleinste verfügbare Note (letzter Eintrag nach sort())
            if (!note) {
                note = passendeGrades[passendeGrades.length - 1].grade;
            }

            updates.push({ id, grade: note });
        }

        // Update alle Schüler in der Datenbank
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
