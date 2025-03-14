"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "../../lib/supabaseClient"

export default function GroupOverview() {
    const { sport } = useParams()
    const [groups, setGroups] = useState([])

    useEffect(() => {
        const fetchGroups = async () => {
            const { data, error } = await supabase.from("students").select("klasse, geschlecht")
            if (error) {
                console.error("Fehler beim Laden der Schüler:", error)
                return
            }

            // Alle Gruppen generieren: "3a-weiblich", "2b-männlich"
            const groupSet = new Set()
            data.forEach(student => {
                const groupName = `${student.klasse}-${student.geschlecht.toLowerCase()}`
                groupSet.add(groupName)
            })

            setGroups(Array.from(groupSet).sort())
        }

        fetchGroups()
    }, [])

    return (
        <div className="wrapper-container h-screen flex flex-col">
            <div className="transparent-container flex flex-col items-center w-full">

                {/* Gruppen Auswahl Titel */}
                <div className="w-full py-6 flex items-center justify-center rounded-t-lg bg-cyan-300">
                    <h1 className="text-4xl font-light text-gray-900">Gruppen für {sport}</h1>
                </div>

                {/* Responsive Grid für Gruppen */}
                <div className="w-full flex-1 flex justify-center items-center p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-5xl">
                        {groups.map((group) => (
                            <Link key={group} href={`/sports/${sport}/${group}`}>
                                <div className="aspect-square border-2 border-green-500 rounded-lg hover:bg-blue-50 transition flex flex-col items-center justify-center p-4">
                                    {/* Gruppenname */}
                                    <p className="text-gray-700 text-xl md:text-2xl font-semibold text-center">{group}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
