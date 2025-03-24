import { supabase } from "../../lib/supabaseClient";

export async function POST(request) {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
        return Response.json({ error: "studentId fehlt" }, { status: 400 });
    }

    const { data: resultEntry, error: resultError } = await supabase
        .from("results")
        .select("id, student_id, sport, best_result, points, students (geschlecht)")
        .eq("student_id", studentId)
        .not("best_result", "is", null)
        .single();

    if (resultError || !resultEntry) {
        return Response.json({ error: "Kein gültiges Resultat gefunden" }, { status: 404 });
    }

    const geschlecht = resultEntry.students.geschlecht;
    const sport_code = resultEntry.sport;
    const best_result = resultEntry.best_result;

    const { data: pointRows, error: pointError } = await supabase
        .from("points_table")
        .select("punkte")
        .eq("geschlecht", geschlecht)
        .eq("sport_code", sport_code)
        .gte("leistung", best_result)
        .order("punkte", { ascending: true });

    if (pointError || !pointRows || pointRows.length === 0) {
        return Response.json({ error: "Keine passende Punktezeile gefunden" }, { status: 404 });
    }

    const punkte = pointRows[0].punkte;

    const { error: updateError } = await supabase
        .from("results")
        .update({ points: punkte })
        .eq("id", resultEntry.id);

    if (updateError) {
        return Response.json({ error: "Fehler beim Speichern der Punkte" }, { status: 500 });
    }

    return Response.json({ success: true, punkte });
}
