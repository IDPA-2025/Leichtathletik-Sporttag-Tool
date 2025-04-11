// /app/api/sportday/update-date/route.js

import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function POST(req) {
    const user = requireAnyRole(req, ["teacher"]);

    const body = await req.json();
    const { date } = body;

    if (!date) {
        return new Response(JSON.stringify({ error: "Kein Datum übergeben." }), { status: 400 });
    }

    console.log(date);
    const { error } = await supabase
        .from("sportdays")
        .upsert({ id: 1, date }); // Falls du nur 1 Zeile nutzt mit fixer ID

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, date }), { status: 200 });
}
