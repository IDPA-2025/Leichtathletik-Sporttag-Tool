// /app/api/sportday/get-date/route.js

import { supabase } from "@/app/lib/supabaseClient";

export async function GET() {
    const { data, error } = await supabase
        .from("sportdays")
        .select("date")
        .single();

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ date: data.date }), { status: 200 });
}
