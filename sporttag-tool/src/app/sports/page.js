"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import Image from "next/image"
import PlaceholderImage from "../../../public/placeholder.png"

export default function SportsOverview() {
    const [sports, setSports] = useState([])

    useEffect(() => {
        const fetchSports = async () => {
            const { data, error } = await supabase.from("sports").select("*")
            if (error) {
                console.error("Fehler beim Laden der Sportarten:", error)
            } else {
                setSports(data)
            }
        }
        fetchSports()
    }, [])

    return (
        <div className="wrapper-container h-screen flex items-center justify-center">
            <div className="transparent-container">

                {/* Sportarten Auswahl Titel */}
                <div className="w-full py-6 flex items-center justify-center">
                    <h1 className="text-4xl font-light text-gray-900">Sportarten auswählen</h1>
                </div>

                {/* Responsive Grid bleibt im transparent-container */}
                <div className="w-full flex-1 flex justify-center items-center">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-5xl">
                        {sports.map((sport) => (
                            <Link href={`/sports/${sport.code}`} key={sport.id}>
                                <div className="aspect-square border-2 border-green-500 rounded-lg hover:bg-blue-50 transition flex flex-col items-center justify-center p-4">

                                    {/* Bild */}
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 flex items-center justify-center">
                                        <Image
                                            src={PlaceholderImage}
                                            className="rounded-lg"
                                            width={150}
                                            height={150}
                                            alt={sport.name}
                                        />
                                    </div>

                                    {/* Name Disziplin */}
                                    <p className="text-gray-700 text-lg sm:text-xl md:text-2xl font-semibold text-center mt-2">{sport.name}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
