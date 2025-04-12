import { supabase } from "@/app/lib/supabaseClient";
import { requireAnyRole } from "@/app/lib/auth";

export async function DELETE(req) {
    const user = requireAnyRole(req, ["teacher"]);

    try {
        // 1. Alle Resultate löschen (mit gültiger WHERE-Klausel)
        const { error: resultError } = await supabase
            .from("results")
            .delete()
            .not("id", "is", null);

        if (resultError) {
            throw new Error("Fehler beim Löschen der Resultate: " + resultError.message);
        }

        // 2. Alle Schüler löschen
        const { error: studentError } = await supabase
            .from("students")
            .delete()
            .not("id", "is", null);

        if (studentError) {
            throw new Error("Fehler beim Löschen der Schüler: " + studentError.message);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("Fehler beim Zurücksetzen des Sporttags:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
