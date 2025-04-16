import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

// Alle eindeutigen Klassen abrufen
export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    const { data, error } = await supabase
        .from("students")
        .select("class_group")
        .not("class_group", "is", null)
        .order("class_group", { ascending: true });

    if (error) {
        return new Response(JSON.stringify({
            error: error.message
        }), { status: 500 });
    }

    // Duplikate entfernen
    const uniqueClasses = [...new Set(data
        .map((student) => student.class_group)
    )];
    // Klassenliste zurückgeben
    return new Response(JSON.stringify({
        classes: uniqueClasses
    }), { status: 200 });
}
