import { supabase } from "../../lib/supabaseClient";

function getBestResult(scoresRaw, heightsRaw, resultsRaw, config) {
    const scores = Array.isArray(scoresRaw) ? scoresRaw : [];
    const heights = Array.isArray(heightsRaw) ? heightsRaw : [];
    const results = Array.isArray(resultsRaw) ? resultsRaw : [];

    if (config.time_measure === false && config.checkFails === true) {
        const heightResults = heights.map((val, i) =>
            results[i] === true ? parseFloat(val) || 0 : 0
        );
        return Math.max(...heightResults);
    }

    if (config.time_measure === true) {
        const numeric = scores.map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
        return numeric.length > 0 ? Math.min(...numeric) : 0;
    }

    const numeric = scores.map(v => parseFloat(v)).filter(v => !isNaN(v));
    return numeric.length > 0 ? Math.max(...numeric) : 0;
}

async function fetchPointData({ geschlecht, sportCode, bestResult, timeMeasure }) {
    const operator = timeMeasure ? "gte" : "lte";
    const fallbackOperator = timeMeasure ? "gt" : "lt";

    let response = await supabase
        .from("points_table")
        .select("punkte")
        .eq("geschlecht", geschlecht)
        .eq("sport_code", sportCode)
        .order("leistung", { ascending: timeMeasure });

    if (response.error) throw response.error;

    const sorted = response.data.filter(row => {
        return timeMeasure ? row.leistung >= bestResult : row.leistung <= bestResult;
    });

    return sorted.length > 0 ? [sorted[0]] : [];
}

export async function POST(req) {
    const body = await req.json();
    const { students, sport, group, skippedStudents, attemptHeights, results, scores, sportConfig } = body;

    try {
        const { data: studentInfos, error: studentFetchError } = await supabase
            .from("students")
            .select("id, geschlecht, age_category")
            .in("id", students.map(s => s.id));

        if (studentFetchError) throw studentFetchError;

        for (const student of students) {
            const studentInfo = studentInfos.find(s => s.id === student.id);
            if (!studentInfo) continue;

            const isSkipped = !!skippedStudents[student.id];
            const bestResult = getBestResult(scores[student.id], attemptHeights[student.id], results[student.id], sportConfig);
            const geschlecht = studentInfo.geschlecht;
            const sportCode = sport;

            let pointData = bestResult === 0
                ? [{ punkte: null }]
                : await fetchPointData({ geschlecht, sportCode, bestResult, timeMeasure: sportConfig.time_measure });

            const punkte = pointData.length > 0 ? pointData[0].punkte : null;

            let note = null;

            if (!isSkipped && punkte !== null) {
                const { data: gradeData, error: gradeError } = await supabase
                    .from("grades_table")
                    .select("grade")
                    .eq("gender", geschlecht)
                    .eq("age_category", studentInfo.age_category)
                    .lte("average_points_per_category", punkte)
                    .order("average_points_per_category", { ascending: false })
                    .limit(1);

                if (gradeError) throw gradeError;

                if (gradeData.length > 0) {
                    note = gradeData[0].grade;
                }
            }

            const update = {
                student_id: student.id,
                sport,
                group,
                heights: sportConfig.checkFails ? attemptHeights[student.id] : null,
                attempt_results: sportConfig.checkFails ? results[student.id] : null,
                scores: !sportConfig.checkFails ? scores[student.id] : null,
                best_result: isSkipped ? null : bestResult,
                points: isSkipped ? null : punkte,
                skipped: isSkipped,
                grade: isSkipped ? null : note,
            };

            const { data: existingData, error: fetchError } = await supabase
                .from("results")
                .select("id")
                .eq("student_id", student.id)
                .eq("sport", sport)
                .maybeSingle();

            if (fetchError) throw fetchError;

            const { error: upsertError } = existingData
                ? await supabase.from("results").update(update).eq("id", existingData.id)
                : await supabase.from("results").insert(update);

            if (upsertError) throw upsertError;
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Fehler beim Speichern." }), { status: 500 });
    }
}
