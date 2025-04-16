import { supabase } from "@/app/lib/supabaseClient";
import { requireAnyRole } from "@/app/lib/auth";

// Nur Lehrer dürfen alle Schüler- und Resultatdaten löschen
export async function DELETE(req) {
    const user = requireAnyRole(req, ["teacher"]);

    try {
        // Alle Einträge aus "results" löschen
        const { error: resultError } = await supabase
            .from("results")
            .delete()
            .not("id", "is", null); // vermeidet .delete() ohne Filter (Sicherheitsmassnahme)

        if (resultError) {
            throw new Error("Fehler beim Löschen der Resultate: " + resultError.message);
        }

        // Alle Einträge aus "students" löschen
        const { error: studentError } = await supabase
            .from("students")
            .delete()
            .not("id", "is", null); // löscht alle mit vorhandener ID

        if (studentError) {
            throw new Error("Fehler beim Löschen der Schüler: " + studentError.message);
        }

        // Erfolgsmeldung zurückgeben
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("Fehler beim Zurücksetzen des Sporttags:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
