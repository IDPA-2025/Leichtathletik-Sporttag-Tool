"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"


export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  const router = useRouter()

  const handleLogin = async (e) => {
    e?.preventDefault()
    setError(null)
    setStatusMessage("")
    setIsLoading(true)

    if (!username || !password) {
      setError("Bitte geben Sie einen Benutzernamen und ein Passwort ein.")
      setIsLoading(false)
      return
    }

    try {
      // First try with 'username' column
      let { data: user, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .limit(1)
          .single()

      // If no user found with 'username', try 'benutzername'
      if (userError && userError.code === 'PGRST116') {
        const { data: userAlt, error: userAltError } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .limit(1)
            .single()

        if (!userAltError) {
          user = userAlt
        } else if (userAltError.code === 'PGRST116') {
          setError("Benutzername nicht gefunden.")
          setIsLoading(false)
          return
        } else {
          throw userAltError
        }
      } else if (userError) {
        throw userError
      }

      // User found - now verify password
      // In a real app, this would be done server-side
      const passwordField = user.passwort || user.password || user.passwordHash

      if (!passwordField) {
        throw new Error("Password field not found in user record")
      }

      // Import bcrypt dynamically to avoid server-side issues
      const bcryptjs = await import('bcryptjs')

      // Compare passwords
      const isPasswordValid = await bcryptjs.compare(password, passwordField)

      if (!isPasswordValid) {
        setError("Falsches Passwort.")
        setIsLoading(false)
        return
      }

      // Success! Redirect to menu
      setStatusMessage("Login erfolgreich! Weiterleitung...")
      router.push("/menu")

    } catch (error) {
      console.error("Login error:", error)
      setError("Ein Fehler ist aufgetreten: " + (error.message || "Unbekannter Fehler"))
    } finally {
      setIsLoading(false)
    }
  }

  // For demonstration - generate a hash for a test password
  const generateHash = async () => {
    try {
      const bcryptjs = await import('bcryptjs')
      const salt = await bcryptjs.genSalt(10)
      const testPassword = "helferpass" // Example password
      const hash = await bcryptjs.hash(testPassword, salt)
      setStatusMessage(`Test password hash (for "password123"): ${hash}`)
    } catch (error) {
      console.error("Hash generation error:", error)
      setStatusMessage("Fehler bei der Hash-Generierung: " + error.message)
    }
  }

  return (
      <div className="wrapper-container">
        <div className="transparent-container">
          <h1 className="text-5xl font-light text-gray-900 mb-4">
            Leichtathletik Sporttag
          </h1>
          <p className="text-2xl text-gray-700 mb-6">Login</p>

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
            {statusMessage && <p className="text-green-600 mt-2 text-sm">{statusMessage}</p>}

            <button
                type="submit"
                disabled={isLoading}
                className={`mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md transition-all ${
                    isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
                }`}
            >
              {isLoading ? "WIRD GELADEN..." : "LOGIN"}
            </button>

            <button
                type="button"
                onClick={generateHash}
                className="text-sm text-gray-500 hover:text-gray-700 mt-4"
            >
              Generate Test Password Hash
            </button>
          </form>
        </div>
      </div>
  )
}