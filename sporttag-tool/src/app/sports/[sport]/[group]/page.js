"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function GroupResults() {
    const { sport, group } = useParams();
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [attemptHeights, setAttemptHeights] = useState({});
    const [results, setResults] = useState({});
    const [scores, setScores] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [showScale, setShowScale] = useState(false);
    const [pointsData, setPointsData] = useState([]);
    const [sportName, setSportName] = useState("");
    const [showExport, setShowExport] = useState(false);



    const getSportConfig = () => {
        const sportConfigs = {
            "80m": { unit: "sek", attempts: 1 },
            "huerdenlauf": { unit: "sek", attempts: 1 },
            "kugel": { unit: "meter", attempts: 3 },
            "hoch": { unit: "meter", attempts: 6 },
            "speer": { unit: "meter", attempts: 3 },
        };
        return sportConfigs[sport.toLowerCase()] || { unit: "", attempts: 3 };
    };

    useEffect(() => {
        const fetchScale = async () => {
            const geschlecht = group.split("-")[1];

            const { data, error } = await supabase
                .from("points_table")
                .select("leistung, punkte")
                .eq("sport_code", sport)
                .eq("geschlecht", geschlecht)
                .order("leistung", { ascending: false });

            if (!error) setPointsData(data);
        };

        if (showScale) fetchScale();
    }, [showScale, sport, group]);

    useEffect(() => {
        const fetchStudents = async () => {
            const [className, geschlecht] = group.split("-");

            const { data, error } = await supabase
                .from("students")
                .select("id, vorname, nachname")
                .eq("klasse", className)
                .eq("geschlecht", geschlecht);

            if (error) {
                console.error("Fehler beim Laden der Schüler:", error);
                return;
            }

            const numAttempts = getSportConfig().attempts;

            setStudents(data);
            setFilteredStudents(data);

            const initialAttemptHeights = {};
            const initialResults = {};
            const initialScores = {};
            data.forEach(student => {
                initialAttemptHeights[student.id] = Array(numAttempts).fill("");
                initialResults[student.id] = Array(numAttempts).fill(null);
                initialScores[student.id] = Array(numAttempts).fill("");
            });

            setAttemptHeights(initialAttemptHeights);
            setResults(initialResults);
            setScores(initialScores);

            fetchExistingResults(data.map(s => s.id));
        };

        fetchStudents();
    }, [group, sport]);

    useEffect(() => {
        const fetchSportName = async () => {
            const { data, error } = await supabase
                .from("sports")
                .select("name")
                .eq("code", sport)
                .single();

            if (error) {
                console.error("Fehler beim Laden des Sportnamens:", error);
                return;
            }

            setSportName(data.name);
        };

        if (sport) {
            fetchSportName();
        }
    }, [sport]);


    const fetchExistingResults = async (studentIds) => {
        const { data, error } = await supabase
            .from("results")
            .select("*")
            .eq("sport", sport)
            .in("student_id", studentIds);

        if (error) {
            console.error("Fehler beim Laden der Ergebnisse:", error);
            return;
        }

        if (data && data.length > 0) {
            const numAttempts = getSportConfig().attempts;
            const loadedAttemptHeights = {...attemptHeights};
            const loadedResults = {...results};
            const loadedScores = {...scores};

            data.forEach(result => {
                const processArray = (originalArray) => {
                    if (!originalArray) return Array(numAttempts).fill("");
                    return originalArray.length < numAttempts
                        ? [...originalArray, ...Array(numAttempts - originalArray.length).fill("")]
                        : originalArray.slice(0, numAttempts);
                };

                if (result.heights) loadedAttemptHeights[result.student_id] = processArray(result.heights);
                if (result.attempt_results) loadedResults[result.student_id] = processArray(result.attempt_results);
                if (result.scores) loadedScores[result.student_id] = processArray(result.scores);
            });

            setAttemptHeights(loadedAttemptHeights);
            setResults(loadedResults);
            setScores(loadedScores);
        }
    };

    useEffect(() => {
        if (!searchQuery) {
            setFilteredStudents(students);
        } else {
            setFilteredStudents(
                students.filter(student =>
                    `${student.vorname} ${student.nachname}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                )
            );
        }
    }, [searchQuery, students]);

    const handleInputChange = (studentId, index, value, type) => {
        if (type === "height") {
            setAttemptHeights(prev => ({
                ...prev,
                [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
            }));
        } else if (type === "score") {
            setScores(prev => ({
                ...prev,
                [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
            }));
        }
    };

    const handleResultChange = (studentId, index, value) => {
        setResults(prev => ({
            ...prev,
            [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
        }));
    };

    const getBestResult = (studentId) => {
        if (sport.toLowerCase() === "hoch") {
            const heightResults = attemptHeights[studentId].map((height, index) =>
                results[studentId][index] === true ? parseFloat(height) || 0 : 0
            );
            return Math.max(...heightResults);
        } else if (sport.toLowerCase() === "80m" || sport.toLowerCase() === "huerdenlauf") {
            const numericScores = scores[studentId].map(score => parseFloat(score) || 0);
            return Math.min(...numericScores.filter(score => score > 0)) || 0;
        } else {
            const numericScores = scores[studentId].map(score => parseFloat(score) || 0);
            return Math.max(...numericScores) || 0;
        }
    };

    const saveResults = async () => {
        setIsSaving(true);
        setSaveMessage("");

        try {
            const zeitDisziplinen = ["80m", "huerdenlauf"];

            for (const student of students) {
                const bestResult = getBestResult(student.id);
                const geschlecht = group.split("-")[1];
                const sportCode = sport;

                const istZeitDisziplin = zeitDisziplinen.includes(sportCode.toLowerCase());

                let pointData;

                // Zeitdisziplin: kleinere Zeit besser (z.B. 12.34s)
                if (istZeitDisziplin) {
                    const response = await supabase
                        .from("points_table")
                        .select("punkte")
                        .eq("geschlecht", geschlecht)
                        .eq("sport_code", sportCode)
                        .gte("leistung", bestResult) // 👈 langsamer oder gleich
                        .order("leistung", { ascending: true }) // nächstgrößerer Zeitwert zuerst
                        .limit(1);
                    pointData = response.data;
                } else {
                    // Wurf/Sprung: größere Leistung besser (z.B. 6.20m)
                    const response = await supabase
                        .from("points_table")
                        .select("punkte")
                        .eq("geschlecht", geschlecht)
                        .eq("sport_code", sportCode)
                        .gte("leistung", bestResult)
                        .order("leistung", { ascending: true }) // niedrigste Leistung ≥ best_result
                        .limit(1);
                    pointData = response.data;
                }

                const punkte = pointData && pointData.length > 0 ? pointData[0].punkte : null;

                const update = {
                    student_id: student.id,
                    sport: sport,
                    group: group,
                    heights: sport.toLowerCase() === "hoch" ? attemptHeights[student.id] : null,
                    attempt_results: sport.toLowerCase() === "hoch" ? results[student.id] : null,
                    scores: sport.toLowerCase() !== "hoch" ? scores[student.id] : null,
                    best_result: bestResult,
                    points: punkte,
                };

                // Insert oder Update
                const { data: existingData } = await supabase
                    .from("results")
                    .select("*")
                    .eq("student_id", update.student_id)
                    .eq("sport", sport)
                    .maybeSingle();

                if (existingData) {
                    const { error } = await supabase
                        .from("results")
                        .update(update)
                        .eq("id", existingData.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from("results").insert(update);
                    if (error) throw error;
                }
            }

            setSaveMessage("Ergebnisse erfolgreich gespeichert!");
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            setSaveMessage("Fehler beim Speichern der Ergebnisse.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(""), 3000);
        }
    };

    return (
        <div className="wrapper-container p-4">
            <div className="transparent-container">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4">
                    Ergebnisse für {sportName || sport}
                </h1>

                <button
                    className="absolute top-0 left-0 mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-800"
                    onClick={() => setShowScale(true)}
                >
                    📋 Punkteskala anzeigen
                </button>

                <input
                    type="text"
                    placeholder="🔍 Schüler suchen..."
                    className="mb-4 w-full p-3 border border-gray-300 rounded-lg text-gray-900 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="flex-grow overflow-y-auto flex flex-col gap-4">
                    {filteredStudents.map(student => (
                        <div key={student.id}
                             className="bg-white shadow-md p-4 rounded-lg border border-gray-300 flex justify-between flex-col sm:flex-row">
                            <p className="text-lg font-medium text-gray-900 mb-2">{student.vorname} {student.nachname}</p>
                            <div className="flex flex-wrap gap-4 justify-center text-gray-900">
                                {sport.toLowerCase() === "hoch" ? (
                                    attemptHeights[student.id]?.map((height, i) => (
                                        <div key={i} className="flex items-center gap-2 rounded-lg overflow-hidden p-2">
                                            <span className="font-semibold">{i + 1}.</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-20 p-2 text-center border border-gray-300 rounded-lg"
                                                value={height || ""}
                                                onChange={(e) => handleInputChange(student.id, i, e.target.value, "height")}
                                                placeholder="Höhe"
                                            />
                                            <button
                                                className={`p-2 rounded-lg ${results[student.id][i] === true ? 'bg-green-400' : 'bg-gray-200'}`}
                                                onClick={() => handleResultChange(student.id, i, true)}
                                            >✔
                                            </button>
                                            <button
                                                className={`p-2 rounded-lg ${results[student.id][i] === false ? 'bg-red-400' : 'bg-gray-200'}`}
                                                onClick={() => handleResultChange(student.id, i, false)}
                                            >✘
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    scores[student.id]?.map((score, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="font-semibold">{i + 1}.</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-20 p-2 text-center border border-gray-300 rounded-lg"
                                                value={score || ""}
                                                onChange={(e) => handleInputChange(student.id, i, e.target.value, "score")}
                                                placeholder="Wert"
                                            />
                                            <span className="text-sm text-gray-500">{getSportConfig().unit}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {students.length > 0 && (
                    <div className="mt-6 flex flex-col items-center">
                        <button
                            className={`py-3 px-6 rounded-lg font-semibold ${isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                            onClick={saveResults}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Speichern...' : 'Ergebnisse speichern'}
                        </button>
                        {saveMessage && (
                            <p className={`mt-2 ${saveMessage.includes('Fehler') ? 'text-red-600' : 'text-green-600'}`}>
                                {saveMessage}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {showScale && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/10 z-50">
                    <div className="bg-white w-full max-w-md mx-4 p-6 rounded-2xl shadow-xl border border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Punkteskala – {sport}
                        </h2>

                        <div className="max-h-64 overflow-y-auto rounded border border-gray-200">
                            <table className="w-full text-sm text-left text-gray-700">
                                <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 font-semibold">Leistung</th>
                                    <th className="px-4 py-2 font-semibold">Punkte</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pointsData.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">{row.leistung}</td>
                                        <td className="px-4 py-2">{row.punkte}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 text-right">
                            <button
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                                onClick={() => setShowScale(false)}
                            >
                                Schliessen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}