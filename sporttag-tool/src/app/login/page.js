"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include" // Cookies mit der Anfrage senden
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unbekannter Fehler");
        setIsLoading(false);
        return;
      }

      console.log("✅ Login erfolgreich! Weiterleitung...");
      router.replace("/menu");
    } catch (error) {
      console.error("Login error:", error);
      setError("Ein Fehler ist aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="wrapper-container">
        <div className="transparent-container text-center flex justify-center items-center">
          <section>
            <h1 className="text-5xl font-light text-gray-900 mb-10">
              Leichtathletik Sporttag
            </h1>
            <p className="text-4xl text-gray-700 mb-6">Login</p>
          </section>

          <section>
            <form onSubmit={handleLogin} className="flex flex-col space-y-4 items-center">
              <label className="text-lg font-semibold text-gray-900">
                Benutzername
              </label>
              <input
                  type="text"
                  className="bg-white/60 text-gray-900 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
              />

              <label className="text-lg font-semibold text-gray-900">
                Passwort
              </label>
              <input
                  type="password"
                  className="bg-white/60 text-gray-900 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
              />

              {error && <p className="text-red-600 mt-2">{error}</p>}

              <button
                  type="submit"
                  disabled={isLoading}
                  className={`mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md transition-all ${
                      isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
                  }`}
              >
                {isLoading ? "WIRD GELADEN..." : "LOGIN"}
              </button>
            </form>
          </section>
        </div>
      </div>
  );
}
