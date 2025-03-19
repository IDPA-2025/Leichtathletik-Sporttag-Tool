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

    const getSportConfig = () => {
        const sportConfigs = {
            "80m": { unit: "sek", attempts: 1 },
            "huerdenlauf": { unit: "sek", attempts: 1 },
            "kugelstossen": { unit: "m", attempts: 3 },
            "hochsprung": { unit: "m", attempts: 6, trackHeight: true },
            "speerwurf": { unit: "m", attempts: 3, trackHeight: true },
        };
        return sportConfigs[sport.toLowerCase()] || { unit: "", attempts: 3 };
    };

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

            setStudents(data);
            setFilteredStudents(data);

            const initialAttemptHeights = {};
            const initialResults = {};
            const initialScores = {};
            data.forEach(student => {
                initialAttemptHeights[student.id] = Array(getSportConfig().attempts).fill("");
                initialResults[student.id] = Array(getSportConfig().attempts).fill(null);
                initialScores[student.id] = Array(getSportConfig().attempts).fill("");
            });
            setAttemptHeights(initialAttemptHeights);
            setResults(initialResults);
            setScores(initialScores);

            // Load existing results
            fetchExistingResults(data.map(s => s.id));
        };

        fetchStudents();
    }, [group, sport]);

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
            const loadedAttemptHeights = {...attemptHeights};
            const loadedResults = {...results};
            const loadedScores = {...scores};

            data.forEach(result => {
                if (result.heights) loadedAttemptHeights[result.student_id] = result.heights;
                if (result.attempt_results) loadedResults[result.student_id] = result.attempt_results;
                if (result.scores) loadedScores[result.student_id] = result.scores;
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

    const saveResults = async () => {
        setIsSaving(true);
        setSaveMessage("");

        try {
            const updates = students.map(student => ({
                student_id: student.id,
                sport: sport,
                group: group,
                heights: getSportConfig().trackHeight ? attemptHeights[student.id] : null,
                attempt_results: getSportConfig().trackHeight ? results[student.id] : null,
                scores: !getSportConfig().trackHeight ? scores[student.id] : null,
                best_result: getBestResult(student.id)
            }));

            for (const update of updates) {
                // Check if record exists
                const { data: existingData } = await supabase
                    .from("results")
                    .select("id")
                    .eq("student_id", update.student_id)
                    .eq("sport", sport)
                    .single();

                if (existingData) {
                    const { error } = await supabase
                        .from("results")
                        .update(update)
                        .eq("id", existingData.id);

                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from("results")
                        .insert(update);

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

    const getBestResult = (studentId) => {
        if (getSportConfig().trackHeight) {
            // For height-based sports, find the highest successful attempt
            const heightResults = attemptHeights[studentId].map((height, index) =>
                results[studentId][index] === true ? parseFloat(height) || 0 : 0
            );
            return Math.max(...heightResults);
        } else {
            // For other sports, find the best score
            const numericScores = scores[studentId].map(score => parseFloat(score) || 0);
            if (sport.toLowerCase() === "80m" || sport.toLowerCase() === "huerdenlauf") {
                // For time-based sports, lower is better
                return Math.min(...numericScores.filter(score => score > 0)) || 0;
            } else {
                // For distance-based sports, higher is better
                return Math.max(...numericScores) || 0;
            }
        }
    };

    return (
        <div className="wrapper-container p-4">
            <div className="transparent-container flex flex-col w-full mx-auto">
                <h1 className="text-3xl font-semibold text-gray-900 text-center my-6">
                    Ergebnisse für {sport} ({group})
                </h1>

                <input
                    type="text"
                    placeholder="🔍 Schüler suchen..."
                    className="mb-4 w-full p-3 border border-gray-300 rounded-lg text-gray-900 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="flex flex-col gap-4">
                    {filteredStudents.map(student => (
                        <div key={student.id} className="bg-white shadow-md p-4 rounded-lg border border-gray-300">
                            <p className="text-lg font-medium text-gray-900 mb-2">{student.vorname} {student.nachname}</p>
                            <div className="flex flex-wrap gap-4 justify-center text-gray-900">
                                {getSportConfig().trackHeight ? (
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
                                            >✔</button>
                                            <button
                                                className={`p-2 rounded-lg ${results[student.id][i] === false ? 'bg-red-400' : 'bg-gray-200'}`}
                                                onClick={() => handleResultChange(student.id, i, false)}
                                            >✘</button>
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
        </div>
    );
}