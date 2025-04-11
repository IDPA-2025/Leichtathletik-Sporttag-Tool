// /app/api/rankings/with-details/route.js
import { supabase } from "../../../lib/supabaseClient";
import {requireAnyRole} from "@/app/lib/auth";

export async function GET(req) {
    const user = requireAnyRole(req, ["teacher"]);


    try {
        const { data: students, error: studentError } = await supabase
            .from("students")
            .select("id, vorname, nachname, klasse, geburtsdatum, geschlecht, age_category, grade, anwesend, total_points, helfer")

        if (studentError) {
            throw new Error("Fehler beim Laden der Schüler: " + studentError.message);
        }

        // Alle Resultate laden
        const { data: results, error: resultsError } = await supabase
            .from("results")
            .select("student_id, sport, best_result, skipped, points, grade");

        if (resultsError) {
            throw new Error("Fehler beim Laden der Resultate: " + resultsError.message);
        }

        // Alle Sportarten laden
        const { data: sports, error: sportsError } = await supabase
            .from("sports")
            .select("code, name, mesure_unit_short");

        if (sportsError) {
            throw new Error("Fehler beim Laden der Sportarten: " + sportsError.message);
        }

        // Punkte pro Schüler berechnen und speichern (optional, falls noch nicht geschehen)
        const punkteMap = new Map();
        for (const r of results) {
            if (!r.student_id || r.points == null || r.skipped === true) continue;
            punkteMap.set(r.student_id, (punkteMap.get(r.student_id) || 0) + r.points);
        }

        // Punkte in students-Tabelle speichern
        for (const [studentId, punkte] of punkteMap.entries()) {
            await supabase
                .from("students")
                .update({ total_points: punkte })
                .eq("id", studentId);
        }

        // Rankings vorbereiten
        const daten = students.map((s) => ({
            id: s.id,
            vorname: s.vorname,
            nachname: s.nachname,
            klasse: s.klasse,
            geschlecht: s.geschlecht,
            alter: s.alter,
            kategorie: s.age_category,
            total_points: punkteMap.get(s.id) || 0,
            grade: s.grade,
            helfer: s.helfer,
            anwesend: s.anwesend
        }));

        const gruppierteRanglisten = {};

        for (const eintrag of daten) {
            const key = `${eintrag.kategorie}-${eintrag.geschlecht}`;
            if (!gruppierteRanglisten[key]) {
                gruppierteRanglisten[key] = [];
            }
            gruppierteRanglisten[key].push(eintrag);
        }

        for (const key in gruppierteRanglisten) {
            gruppierteRanglisten[key].sort((a, b) => b.total_points - a.total_points);
        }

        return new Response(JSON.stringify({
            rankings: gruppierteRanglisten,
            results,
            sports,
            students: daten
        }), { status: 200 });

    } catch (error) {
        console.error("Fehler in /api/rankings/with-details:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
