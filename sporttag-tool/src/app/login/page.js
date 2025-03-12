"use client";
import { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="wrapper-container">
      <div className="transparent-container">
        <h1 className="text-5xl font-light text-gray-900 mb-4">
          Leichtathletik Sporttag
        </h1>
        <p className="text-2xl text-gray-700 mb-6">Login</p>

        <div className="flex flex-col space-y-4 items-center">
          <label className="text-lg font-semibold text-gray-900">Benutzername</label>
          <input
            type="text"
            className="bg-white/60 text-gray-900 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label className="text-lg font-semibold text-gray-900">Passwort</label>
          <input
            type="password"
            className="bg-white/60 text-gray-900 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all">
            LOGIN
          </button>
        </div>
      </div>
    </div>
  );
}