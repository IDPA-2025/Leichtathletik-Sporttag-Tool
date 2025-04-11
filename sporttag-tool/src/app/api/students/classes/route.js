// File: /app/api/students/classes/route.js
import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function GET(req) {
    const user = requireAnyRole(req, ["teacher", "assistant"]);

    const { data, error } = await supabase
        .from("students")
        .select("klasse")
        .not("klasse", "is", null)
        .order("klasse", { ascending: true });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const uniqueClasses = [...new Set(data.map((student) => student.klasse))];
    return new Response(JSON.stringify({ classes: uniqueClasses }), { status: 200 });
}
