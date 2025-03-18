"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://your-supabase-url.supabase.co", "your-anon-key");

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [absentees, setAbsentees] = useState([]);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").slice(1); // Kopfzeile entfernen
      const parsedStudents = lines.map((line) => {
        const [nachname, vorname, anrede, klasse] = line.split(",");
        return {
          nachname: nachname.trim(),
          vorname: vorname.trim(),
          geschlecht: anrede.trim() === "Herr" ? "männlich" : "weiblich",
          klasse: klasse.trim(),
        };
      }).filter(student => student.nachname);
      setStudents(parsedStudents);
    };
    reader.readAsText(uploadedFile);
  };

  const toggleHelper = (index) => {
    if (!absentees.includes(index)) {
      setHelpers((prev) =>
          prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    }
  };

  const toggleAbsentee = (index) => {
    setAbsentees((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );

    // Falls als "Abwesend" markiert, entferne Helfer-Status
    if (!absentees.includes(index)) {
      setHelpers(prev => prev.filter(i => i !== index));
    }
  };

  const handleSubmit = async () => {
    const payload = students.map((student, index) => ({
      vorname: student.vorname,
      nachname: student.nachname,
      geschlecht: student.geschlecht,
      klasse: student.klasse,
      helfer: helpers.includes(index),
      anwesend: !absentees.includes(index),
    }));

    const { data, error } = await supabase.from("students").insert(payload);
    if (error) {
      console.error("Fehler beim Einfügen in die Datenbank:", error);
    } else {
      console.log("Erfolgreich gespeichert:", data);
    }
  };

  return (
      <div className="wrapper-container">
        <div className="transparent-container text-center flex justify-center items-center">
          <h2 className="mid-title">Klassenliste hochladen</h2>

          {/* Upload-Bereich bleibt genau gleich! */}
          <div className="border-2 border-dashed border-blue-500 w-full max-w-2xl h-32 flex flex-col items-center justify-center rounded-lg p-4 mb-6">
            <Upload size={32} className="text-blue-600" />
            <p className="text-gray-700 text-sm">Drag & Drop Klassenliste hier</p>
            <label className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-600">
              Datei suchen
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {/* Schülerliste */}
          <div className="w-1/2 bg-white shadow-md rounded-lg p-4 max-h-[500px] overflow-y-auto">

            {/* Desktop-Tabelle */}
            <table className="hidden md:table w-full text-center border-collapse">
              <thead>
              <tr className="border-b border-gray-300">
                <th className="p-2 text-gray-700">Name</th>
                <th className="p-2 text-gray-700">Geschlecht</th>
                <th className="p-2 text-gray-700">Klasse</th>
                <th className="p-2 text-gray-700">Helfer</th>
                <th className="p-2 text-gray-700">Abwesend</th>
              </tr>
              </thead>
              <tbody>
              {students.map((student, index) => (
                  <tr key={index} className="border-b border-gray-200 text-black">
                    <td className="p-2">{`${student.nachname}, ${student.vorname}`}</td>
                    <td className="p-2">{student.geschlecht}</td>
                    <td className="p-2">{student.klasse}</td>
                    <td className="p-2">
                      <button
                          className={`helper-button ${helpers.includes(index) ? "active" : "inactive"} ${absentees.includes(index) ? "absent" : ""}`}
                          onClick={() => toggleHelper(index)}
                          disabled={absentees.includes(index)}
                      >
                        Helfer
                      </button>
                    </td>
                    <td className="p-2 flex justify-center">
                      <button
                          className={`absent-button ${absentees.includes(index) ? "active" : "inactive"} `}
                          onClick={() => toggleAbsentee(index)}
                      />
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>

            {/* Mobile-Ansicht */}
            <div className="md:hidden flex flex-col gap-4">
              {students.map((student, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-3 shadow-sm">
                    <p className={`text-lg font-medium ${absentees.includes(index) ? "text-gray-400 line-through" : "text-black"}`}>
                      {student.vorname} {student.nachname}
                    </p>
                    <p className="text-gray-600">Klasse: {student.klasse} | Geschlecht: {student.geschlecht}</p>

                    {/* Buttons */}
                    <div className="flex justify-between mt-2">
                      <button
                          className={`helper-button ${helpers.includes(index) ? "active" : "inactive"} ${absentees.includes(index) ? "absent" : ""}`}
                          onClick={() => toggleHelper(index)}
                          disabled={absentees.includes(index)}
                      >
                        Helfer
                      </button>
                      <button
                          className={`absent-button ${absentees.includes(index) ? "active" : "inactive"}`}
                          onClick={() => toggleAbsentee(index)}
                      />
                    </div>
                  </div>
              ))}
            </div>

          </div>

          {/* Speicher-Button */}
          <button
              onClick={handleSubmit}
              className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 transition-all"
          >
            Speichern
          </button>

        </div>
      </div>
  );
}
