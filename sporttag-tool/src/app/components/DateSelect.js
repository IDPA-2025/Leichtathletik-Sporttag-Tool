import {useState, useEffect, useRef} from 'react';

const DateSelect = () => {
    const [selectedDate, setSelectedDate] = useState(null); // initial null
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const calendarRef = useRef(null);
    const buttonRef = useRef(null);

    // Formatiere den Monatsnamen und Jahr für die Anzeige
    const formatMonthYear = (date) => {
        const monthNames = [
            "Januar", "Februar", "März", "April", "Mai", "Juni",
            "Juli", "August", "September", "Oktober", "November", "Dezember"
        ];
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    };

    const saveDateToDatabase = async (date) => {
        const response = await fetch("/api/sportday/update-date", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date }),
        });

        const result = await response.json();
        if (!response.ok) {
            console.error("Fehler beim Speichern des Datums:", result.error);
        } else {
            console.log("Datum erfolgreich gespeichert:", result);
        }
    };



    // Generiere Kalenderdaten für aktuellen Monat
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Erster Tag des Monats
        const firstDay = new Date(year, month, 1);
        // Letzter Tag des Monats
        const lastDay = new Date(year, month + 1, 0);

        // Erster Tag der Kalenderwoche (Mo-So)
        const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Umrechnung auf Mo=0, So=6

        // Tage vom vorherigen Monat
        const prevMonth = new Date(year, month, 0);
        const prevMonthDays = prevMonth.getDate();

        const days = [];

        // Tage vom vorherigen Monat
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push({
                day: prevMonthDays - firstDayOfWeek + i + 1,
                month: 'prev',
                date: new Date(year, month - 1, prevMonthDays - firstDayOfWeek + i + 1)
            });
        }

        // Tage vom aktuellen Monat
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({
                day: i,
                month: 'current',
                date: new Date(year, month, i)
            });
        }

        // Tage vom nächsten Monat (bis zum Ende der Woche)
        const remainingDays = 42 - days.length; // 6 Wochen * 7 Tage = 42
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                day: i,
                month: 'next',
                date: new Date(year, month + 1, i)
            });
        }

        return days;
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDateClick = async (date) => {
        setSelectedDate(date);
        setIsOpen(false);

        // Speichere Datum in DB
        await saveDateToDatabase(date.toLocaleDateString("sv-SE")); // yyyy-mm-dd Format

        // Triggere Alterskategorien-Neuberechnung
        const response = await fetch("/api/students/recalculate-age", { method: "POST" });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            console.error("Fehler beim Aktualisieren der Alterskategorien:", result?.error || "Unbekannter Fehler");
        } else {
            console.log("Alterskategorien erfolgreich neu berechnet");
        }
    };


    const handleToday = async () => {
        const today = new Date();
        setSelectedDate(today);
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        setIsOpen(false);

        // Datum speichern
        await saveDateToDatabase(today.toLocaleDateString("sv-SE"));

        // Alterskategorien neu berechnen
        const response = await fetch("/api/students/recalculate-age", { method: "POST" });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            console.error("Fehler beim Aktualisieren der Alterskategorien:", result?.error || "Unbekannter Fehler");
        } else {
            console.log("Alterskategorien erfolgreich neu berechnet");
        }
    };

    const handleClear = () => {
        setSelectedDate(null);
        setIsOpen(false);
    };

    // Aktualisiere currentMonth wenn sich selectedDate ändert
    useEffect(() => {
        if (selectedDate) {
            setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
        }
    }, []);

    // Schließe das Popup beim Klick außerhalb
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                calendarRef.current &&
                !calendarRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };



        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchDate = async () => {
            const response = await fetch("/api/sportday/get-date");
            console.log("Response:", response);
            const result = await response.json();
            if (response.ok && result.date) {
                const loadedDate = new Date(result.date);
                setSelectedDate(loadedDate);
                setCurrentMonth(new Date(loadedDate.getFullYear(), loadedDate.getMonth(), 1));
            } else {
                console.warn("Kein gültiges Datum geladen:", result.error || result);
            }
        };

        fetchDate();
    }, []);


    // Überprüfe ob ein Datum dem ausgewählten Datum entspricht
    const isSelectedDate = (date) => {
        return selectedDate &&
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    };

    // Überprüfe ob ein Datum dem heutigen Datum entspricht
    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    return (
        <div className="w-full max-w-md mx-auto text-gray-900 relative">
            <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center">
                <p>Datum des Sporttages</p>
                {/* Großes Datum Anzeige */}
                <div className="text-center mb-8">
                    <div className="text-8xl font-bold">
                        {selectedDate ? selectedDate.getDate() : "--"}
                    </div>
                    <div className="text-4xl mt-2">
                        {selectedDate
                            ? `${formatMonthYear(selectedDate).split(' ')[0]} ${selectedDate.getFullYear()}`
                            : "Kein Datum"}
                    </div>
                </div>

                {/* Button zum Öffnen */}
                <button
                    ref={buttonRef}
                    onClick={() => setIsOpen(!isOpen)}
                    className="button cursor-pointer"
                >
                    Datum
                </button>

                {/* Popup direkt unter dem Button */}
                {isOpen && (
                    <div
                        ref={calendarRef}
                        className="lg:absolute relative top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 w-80"
                    >
                        {/* Monat & Navigation */}
                        <div className="flex justify-between items-center mb-4">
                            <div className="font-bold">{formatMonthYear(currentMonth)}</div>
                            <div className="flex gap-2">
                                <button onClick={prevMonth}>←</button>
                                <button onClick={nextMonth}>→</button>
                            </div>
                        </div>

                        {/* Wochentage */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                                <div key={day} className="text-gray-600">{day}</div>
                            ))}
                        </div>

                        {/* Kalendertage */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {generateCalendarDays().map((day, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleDateClick(day.date)}
                                    className={`h-8 w-8 flex items-center justify-center rounded-sm ${
                                        isSelectedDate(day.date)
                                            ? 'bg-blue-500 text-white'
                                            : day.month === 'current'
                                                ? 'text-black hover:bg-gray-100'
                                                : 'text-gray-400 hover:bg-gray-100'
                                    } ${isToday(day.date) && !isSelectedDate(day.date) ? 'font-bold' : ''}`}
                                >
                                    {day.day}
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between mt-4">
                            <button
                                onClick={handleClear}
                                className="text-blue-500 hover:underline"
                            >
                                Löschen
                            </button>
                            <button
                                onClick={handleToday}
                                className="text-blue-500 hover:underline"
                            >
                                Heute
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DateSelect;