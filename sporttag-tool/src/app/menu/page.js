"use client";
import Link from "next/link";
import { Upload, PieChart } from "lucide-react"; // Icons für Buttons

export default function Menu() {
  return (
    <div className="bg-zurich flex justify-center items-center h-screen">
      <div className="bg-white/50 backdrop-blur-md shadow-lg rounded-lg p-10 w-[85vw] h-[72vh] flex flex-col justify-center items-center">
        <h1 className="text-5xl font-extralight text-gray-900 mb-12 tracking-wide">
          Leichtathletik Sporttag
        </h1>

        <div className="flex space-x-16 mt-2">
          {/* Klassenliste hochladen */}
          <Link href="/upload">
            <div className="w-52 h-52 border-2 border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition">
              <div className="bg-blue-100 p-5 rounded-full flex items-center justify-center">
                <Upload size={40} className="text-blue-600" />
              </div>
              <p className="mt-4 text-lg text-gray-700 font-medium text-center">
                Klassenliste <br /> hochladen
              </p>
            </div>
          </Link>

          {/* Ergebnisse / Rangliste */}
          <Link href="/ranking">
            <div className="w-52 h-52 border-2 border-green-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition">
              <div className="bg-green-100 p-5 rounded-full flex items-center justify-center">
                <PieChart size={40} className="text-green-600" />
              </div>
              <p className="mt-4 text-lg text-gray-700 font-medium text-center">
                Ergebnisse / <br /> Rangliste
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}