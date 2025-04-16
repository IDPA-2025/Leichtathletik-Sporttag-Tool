
import { supabase } from "@/app/lib/supabaseClient";

// Sporttag-Datum abrufen
export async function GET() {
    const { data, error } = await supabase
        .from("sportdays")
        .select("date")
        .single(); // erwartet genau einen Eintrag

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ date: data.date }), { status: 200 });
}
