import { supabase } from "../../lib/supabaseClient";

export async function GET() {
    const veranstaltungsDatum = new Date("2025-06-12");

    // Alle Schüler holen
    const { data: students, error: studentError } = await supabase
        .from("students")
        .select("id, vorname, nachname, geburtsdatum, geschlecht, klasse");

    if (studentError) {
        return Response.json({ error: "Fehler beim Laden der Schüler" }, { status: 500 });
    }

    // Alle Resultate holen mit Punkten
    const { data: results, error: resultError } = await supabase
        .from("results")
        .select("student_id, points");

    if (resultError) {
        return Response.json({ error: "Fehler beim Laden der Resultate" }, { status: 500 });
    }

    // Punkte pro Schüler summieren
    const punkteMap = new Map();
    for (const r of results) {
        if (!r.student_id || r.points == null) continue;
        punkteMap.set(r.student_id, (punkteMap.get(r.student_id) || 0) + r.points);
    }

    // Alter berechnen
    const berechneAlter = (geburtsdatum) => {
        const geb = new Date(geburtsdatum);
        let alter = veranstaltungsDatum.getFullYear() - geb.getFullYear();
        const m = veranstaltungsDatum.getMonth() - geb.getMonth();
        if (m < 0 || (m === 0 && veranstaltungsDatum.getDate() < geb.getDate())) {
            alter--;
        }
        return alter;
    };

    // Altersgruppe bestimmen
    const getKategorie = (alter) => {
        if (alter < 16) return "unter16";
        if (alter <= 17) return "16bis17";
        return "ueber18";
    };

    // Schülerdaten + Punkte + Alterskategorie kombinieren
    const daten = students.map((s) => {
        const alter = berechneAlter(s.geburtsdatum);
        return {
            id: s.id,
            name: `${s.vorname} ${s.nachname}`,
            klasse: s.klasse,
            geschlecht: s.geschlecht,
            alter,
            kategorie: getKategorie(alter),
            punkte: punkteMap.get(s.id) || 0,
        };
    });

    // Rankings pro Kategorie + Geschlecht erzeugen
    const gruppierteRanglisten = {};

    for (const eintrag of daten) {
        const key = `${eintrag.kategorie}-${eintrag.geschlecht}`;
        if (!gruppierteRanglisten[key]) {
            gruppierteRanglisten[key] = [];
        }
        gruppierteRanglisten[key].push(eintrag);
    }

    // Sortierung nach Punkten (absteigend)
    for (const key in gruppierteRanglisten) {
        gruppierteRanglisten[key].sort((a, b) => b.punkte - a.punkte);
    }

    return Response.json(gruppierteRanglisten);
}
