"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import Image from "next/image"
import PlaceholderImage from "../../../public/placeholder.png"

export default function SportsOverview() {
    const [sports, setSports] = useState([])

    const square = "bg-blue-800 rounded-lg w-[min(25vw,100px)] md:w-[30%] lg:w-[20%] aspect-square flex items-center justify-center text-white font-semibold hover:bg-blue-600 transition"

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
        <div className="wrapper-container h-screen">
            <div className="transparent-container h-full">

                {/* Sportarten Auswahl Titel */}
                <div className="h-1/5 w-full flex items-center justify-center rounded-t-lg">
                    <h1 className="text-4xl font-light text-gray-900">Sportarten auswählen</h1>
                </div>

                {/* Sportarten Felder */}
                <div className="h-4/5 w-full flex justify-center items-center flex-wrap gap-5 p-4 rounded-b-lg mb-10">
                    <div className="grid grid-cols-3 gap-6">
                        {sports.map((sport) => (
                            <Link href={`/sports/${sport.code}`} key={sport.id}>
                                <div className="aspect-square border-2 border-green-500 w-3xs rounded-lg hover:bg-blue-50 transition">
                                    
                                    {/* Bild */}
                                    <div className="w-full h-45 flex items-center justify-center">
                                        <Image
                                        src={PlaceholderImage}
                                        className="rounded-lg"
                                        width={150} 
                                        height={150}
                                        alt={sport.name}

                                        />
                                    </div>

                                    {/* Name Disziplin */}
                                    <p className="text-gray-700 text-2xl font-semibold text-center">{sport.name}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
