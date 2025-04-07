// File: /app/api/students/recalculate-age/route.js

import { supabase } from "@/app/lib/supabaseClient";

/**
 * Berechnet Alterskategorie basierend auf Geburtsdatum und Event-Datum
 */
function calculateAgeCategory(geburtsdatum, veranstaltungsDatumStr) {
    const veranstaltungsDatum = new Date(veranstaltungsDatumStr);
    const geburtsdatumDate = new Date(geburtsdatum);
    const diffInJahren = veranstaltungsDatum.getFullYear() - geburtsdatumDate.getFullYear();
    const adjust = veranstaltungsDatum < new Date(geburtsdatumDate.setFullYear(veranstaltungsDatum.getFullYear()));
    const alter = adjust ? diffInJahren - 1 : diffInJahren;

    if (alter < 16) return "-15";
    if (alter >= 16 && alter <= 17) return "16-17";
    return "18+";
}

export async function POST() {
    // Hole das aktuelle Veranstaltungsdatum aus der Tabelle "sportday"
    const { data: sportdayData, error: dateError } = await supabase
        .from("sportdays")
        .select("date")
        .single();

    if (dateError || !sportdayData?.date) {
        return new Response(JSON.stringify({ error: "Veranstaltungsdatum konnte nicht geladen werden." }), { status: 500 });
    }

    const veranstaltungsDatum = sportdayData.date;

    const { data: students, error } = await supabase.from("students").select("id, geburtsdatum");

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const updates = students.map((student) => ({
        id: student.id,
        age_category: calculateAgeCategory(student.geburtsdatum, veranstaltungsDatum),
    }));

    const { error: updateError } = await supabase.from("students").upsert(updates, { onConflict: ["id"] });

    if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, updated: updates.length }), { status: 200 });
}