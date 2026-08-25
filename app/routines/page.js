"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";

export default function Page() {
  const sb = createClient();

  const [dogs, setDogs] = useState([]);
  const [routines, setRoutines] = useState([]);

  const [dogId, setDogId] = useState("");
  const [title, setTitle] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [routineType, setRoutineType] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [active, setActive] = useState(true);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMsg("");

    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    // Load user's dogs
    const { data: dogData, error: dogError } = await sb
      .from("dogs")
      .select("id, name")
      .order("created_at", { ascending: true });

    if (dogError) {
      setMsg(dogError.message);
      setLoading(false);
      return;
    }

    const allDogs = dogData || [];
    setDogs(allDogs);

    // Check URL for a specific dog
    const urlDogId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("dog")
        : null;

    const validDog =
      urlDogId && allDogs.some((dog) => dog.id === urlDogId);

    const selectedDog = validDog
      ? urlDogId
      : allDogs.length > 0
      ? allDogs[0].id
      : "";

    setDogId(selectedDog);

    // Load routines
    let query = sb
      .from("routines")
      .select(
        "id, dog_id, title, time_of_day, routine_type, frequency, active, created_at"
      )
      .order("created_at", { ascending: false });

    // If opened from a dog profile, show only that dog's routines
    if (validDog) {
      query = query.eq("dog_id", urlDogId);
    }

    const { data: routineData, error: routineError } =
      await query;

    if (routineError) {
      setMsg(routineError.message);
    } else {
      setRoutines(routineData || []);
    }

    setLoading(false);
  }

  async function saveRoutine(e) {
    e.preventDefault();

    if (!dogId) {
      setMsg("Please add a dog first.");
      return;
    }

    if (!title.trim()) {
      setMsg("Please enter a routine title.");
      return;
    }

    if (!timeOfDay) {
      setMsg("Please select a time of day.");
      return;
    }

    if (!routineType.trim()) {
      setMsg("Please enter a routine type.");
      return;
    }

    setSaving(true);
    setMsg("");

    const { error } = await sb.from("routines").insert({
      dog_id: dogId,
      title: title.trim(),
      time_of_day: timeOfDay,
      routine_type: routineType.trim(),
      frequency,
      active,
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setTimeOfDay("");
    setRoutineType("");
    setFrequency("Daily");
    setActive(true);

    setMsg("Routine saved successfully. 🐶🐾");

    await loadData();

    setSaving(false);
  }

  async function deleteRoutine(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this routine?"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMsg("");

    const { error } = await sb
      .from("routines")
      .delete()
      .eq("id", id);

    if (error) {
      setMsg(error.message);
      setDeleting(false);
      return;
    }

    setMsg("Routine deleted successfully.");

    await loadData();

    setDeleting(false);
  }

  function dogName(id) {
    const dog = dogs.find((dog) => dog.id === id);
    return dog ? dog.name : "Unknown dog";
  }

  return (
    <>
      <Sidebar />

      <main className="container">
        <h1>🐾 Routines</h1>

        <div className="card">
          <h2>Add Routine</h2>

          {loading ? (
            <p className="muted">Loading...</p>
          ) : dogs.length === 0 ? (
            <p className="muted">
              Please add your first dog from the Dashboard first.
            </p>
          ) : (
            <form className="form" onSubmit={saveRoutine}>
              <label>Dog</label>

              <select
                className="input"
                value={dogId}
                onChange={(e) => setDogId(e.target.value)}
              >
                {dogs.map((dog) => (
                  <option key={dog.id} value={dog.id}>
                    🐶 {dog.name}
                  </option>
                ))}
              </select>

              <label>Routine title</label>

              <input
                className="input"
                type="text"
                placeholder="Example: Morning walk"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <label>Time of day</label>

              <input
                className="input"
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                required
              />

              <label>Routine type</label>

              <input
                className="input"
                type="text"
                placeholder="Example: Exercise"
                value={routineType}
                onChange={(e) => setRoutineType(e.target.value)}
                required
              />

              <label>Frequency</label>

              <select
                className="input"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="As needed">As needed</option>
              </select>

              <label>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />{" "}
                Active
              </label>

              <button
                className="btn primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Routine"}
              </button>
            </form>
          )}

          {msg && <p className="muted">{msg}</p>}
        </div>

        <br />

        <div className="card">
          <h2>Your Routines</h2>

          {routines.length === 0 ? (
            <p className="muted">
              No routines yet. Add your first routine above.
            </p>
          ) : (
            routines.map((routine) => (
              <div
                key={routine.id}
                className="card"
                style={{ marginTop: 12 }}
              >
                <h3>🐾 {routine.title}</h3>

                <p className="muted">
                  🐶 {dogName(routine.dog_id)}
                </p>

                <p>
                  🕐 Time: {routine.time_of_day}
                </p>

                <p>
                  🔄 Frequency: {routine.frequency}
                </p>

                <p>
                  📌 Type: {routine.routine_type}
                </p>

                <p>
                  {routine.active
                    ? "✅ Active"
                    : "⏸️ Inactive"}
                </p>

                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    deleteRoutine(routine.id)
                  }
                  disabled={deleting}
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete routine"}
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}