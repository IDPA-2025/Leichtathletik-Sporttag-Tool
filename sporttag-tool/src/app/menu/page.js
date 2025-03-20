"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, PieChart } from "lucide-react";

export default function Menu() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    console.log("🔍 Auth-Token aus localStorage:", token);

    if (token) {
      try {
        const payloadBase64 = token.split(".")[1];
        const decoded = JSON.parse(atob(payloadBase64));

        console.log("✅ Decodiertes Token:", decoded);
        setRole(decoded.role);
      } catch (error) {
        console.error("❌ Fehler beim Token-Parsing:", error);
      }
    } else {
      console.warn("⚠️ Kein Token gefunden!");
    }
  }, []);

  return (
      <div className="wrapper-container">
        <div className="transparent-container text-center flex justify-center items-center">
          <h1 className="big-title">Leichtathletik Sporttag</h1>

          <div className="flex gap-8 md:flex-row flex-col mt-2">
            {/* Klassenliste hochladen → Nur für Lehrer sichtbar */}
            {role === "lehrer" && (
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
            )}

            {/* Ergebnisse / Rangliste (Für alle sichtbar) */}
            <Link href="/sports">
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
