"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

export default function GroupResults() {
    const { sport, group } = useParams() // Sportart & Gruppe aus URL
    const [students, setStudents] = useState([])
    const [scores, setScores] = useState({}) // Speichert die Werte pro Schüler

    useEffect(() => {
        const fetchStudents = async () => {
            const [className, geschlecht] = group.split("-") // z. B. "3a-weiblich" → ["3a", "weiblich"]

            const { data, error } = await supabase
                .from("students")
                .select("id, vorname, nachname")
                .eq("klasse", className)
                .eq("geschlecht", geschlecht)

            if (error) {
                console.error("Fehler beim Laden der Schüler:", error)
                return
            }

            setStudents(data)

            // Initiale Score-Werte setzen
            const initialScores = {}
            data.forEach(student => {
                initialScores[student.id] = ["", "", ""]
            })
            setScores(initialScores)
        }

        fetchStudents()
    }, [group])

    const handleScoreChange = (studentId, index, value) => {
        setScores(prev => ({
            ...prev,
            [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
        }))
    }

    return (
        <div className="wrapper-container h-screen">
            <div className="transparent-container h-full">
                <div className="h-1/5 bg-cyan-300 w-full flex items-center justify-center">
                    <h1 className="text-2xl font-bold">Ergebnisse für {sport} ({group})</h1>
                </div>
                <div className="flex flex-col bg-amber-600 w-full p-4">
                    <table className="w-full bg-white rounded-lg shadow-md">
                        <thead>
                        <tr className="bg-blue-600 text-white">
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3">Versuch 1</th>
                            <th className="p-3">Versuch 2</th>
                            <th className="p-3">Versuch 3</th>
                        </tr>
                        </thead>
                        <tbody>
                        {students.map(student => (
                            <tr key={student.id} className="border-b">
                                <td className="p-3">{student.vorname} {student.nachname}</td>
                                {[0, 1, 2].map(i => (
                                    <td key={i} className="p-3">
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded"
                                            value={scores[student.id]?.[i] || ""}
                                            onChange={(e) => handleScoreChange(student.id, i, e.target.value)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
