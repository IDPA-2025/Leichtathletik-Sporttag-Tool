// /app/api/sportday/get-date/route.js
import { supabase } from "@/app/lib/supabaseClient";
import { requireAnyRole } from "@/app/lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
    const user = requireAnyRole(req, ["teacher"]);
    try {


        const { data, error } = await supabase
            .from("sportdays")
            .select("date")
            .single();

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ date: data.date }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
}
