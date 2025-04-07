"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const [logoFadeOut, setLogoFadeOut] = useState(false);
  const [bgFadeOut, setBgFadeOut] = useState(false);
  const [removeSplash, setRemoveSplash] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLogoFadeOut(true), 1400); // Logo rausfaden
    const t2 = setTimeout(() => setBgFadeOut(true), 1000);   // Hintergrund rausfaden
    const t3 = setTimeout(() => setRemoveSplash(true), 1800); // Splash entfernen

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Splash Overlay */}
      {!removeSplash && (
        <div className={`fixed inset-0 z-50 bg-white flex items-center justify-center ${bgFadeOut ? "animate-fade-out" : ""}`}>
          <Image
            src="/resulta-x-kbw.svg"
            alt="Splash Logo"
            width={800}
            height={400}
            className={`object-contain ${logoFadeOut ? "animate-fade-out" : "animate-fade-in"}`}
          />
        </div>
      )}

      {/* Hauptinhalt */}
      <div className="wrapper-container">
        <div className="transparent-container text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Willkommen zum Leichtathletik-Sporttag!
          </h1>
          <p className="text-lg text-gray-700 mb-4">
            Ein Projekt im Rahmen der IDPA – entwickelt zur einfachen Verwaltung von Ergebnissen und Teilnehmern.  
            Logge dich ein, um Schülerdaten zu verwalten und Leistungen zu erfassen.
          </p>
          <Link href="/login">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all mb-0">
              Zum Login
            </button>
          </Link>

          <div className="w-full flex justify-center mt-10">
            <Image
              src="/resulta-x-kbw.svg"
              alt="RESULTA und KBW Logo"
              width={480}
              height={200}
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}