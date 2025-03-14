"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

export default function GroupResults() {
    const { sport, group } = useParams()
    const [students, setStudents] = useState([])
    const [filteredStudents, setFilteredStudents] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [scores, setScores] = useState({})

    useEffect(() => {
        const fetchStudents = async () => {
            const [className, geschlecht] = group.split("-")

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
            setFilteredStudents(data)

            const initialScores = {}
            data.forEach(student => {
                initialScores[student.id] = ["", "", ""]
            })
            setScores(initialScores)
        }

        fetchStudents()
    }, [group])

    useEffect(() => {
        if (!searchQuery) {
            setFilteredStudents(students)
        } else {
            setFilteredStudents(
                students.filter(student =>
                    `${student.vorname} ${student.nachname}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                )
            )
        }
    }, [searchQuery, students])

    const handleScoreChange = (studentId, index, value) => {
        setScores(prev => ({
            ...prev,
            [studentId]: prev[studentId].map((v, i) => (i === index ? value : v))
        }))
    }

    return (
        <div className="wrapper-container">
            <div className="transparent-container">
                <div className="w-full h-1/5 flex items-center justify-center">
                    <h1 className="text-4xl font-light text-gray-900">
                        Ergebnisse für {sport} ({group})
                    </h1>
                </div>

                <div className="w-full h-4/5">
                    <input
                        type="text"
                        placeholder="🔍 Schüler suchen..."
                        className="mb-4 p-4 border-2 border-blue-500 rounded-lg text-gray-900"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* Schülerübersicht */}
                    <div className="flex flex-col gap-4 w-full border-blue-500 border-2 rounded-lg">
                        <div className="mt-8"></div> {/* oberes Margin */}
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map(student => (
                                <div key={student.id}
                                     className="flex items-center justify-between bg-blue-50 border-2 border-blue-500 rounded-lg p-4 mx-15">
                                    {/* Name */}
                                    <p className="text-gray-900 text-lg font-medium w-1/4 text-center">
                                        {student.vorname} {student.nachname}
                                    </p>

                                    {/* Eingabefelder für die drei Versuche */}
                                    <div className="flex w-3/4 gap-15 justify-end mr-10">
                                        {[0, 1, 2].map(i => (
                                            <input
                                                key={i}
                                                type="text"
                                                className="p-2 w-1/5 text-center text-gray-700 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"                                                value={scores[student.id]?.[i] || ""}
                                                onChange={(e) => handleScoreChange(student.id, i, e.target.value)}
                                                placeholder="Versuch eintragen"
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600 text-center">Kein Schüler gefunden</p>
                        )}
                        <div className="mb-8"></div> {/* unteres Margin */}
                    </div>
                </div>
                {/* Suchleiste */}

            </div>
        </div>
    )
}
