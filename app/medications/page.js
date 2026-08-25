"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";

export default function Page() {
  const sb = createClient();

  const [dogs, setDogs] = useState([]);
  const [medications, setMedications] = useState([]);

  const [dogId, setDogId] = useState("");
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

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

    let query = sb
      .from("medications")
      .select(
        "id, dog_id, name, schedule, duration, notes, created_at"
      )
      .order("created_at", { ascending: false });

    if (validDog) {
      query = query.eq("dog_id", urlDogId);
    }

    const {
      data: medicationData,
      error: medicationError,
    } = await query;

    if (medicationError) {
      setMsg(medicationError.message);
    } else {
      setMedications(medicationData || []);
    }

    setLoading(false);
  }

  async function saveMedication(e) {
    e.preventDefault();

    if (!dogId) {
      setMsg("Please add a dog first.");
      return;
    }

    if (!name.trim()) {
      setMsg("Please enter the medication name.");
      return;
    }

    if (!schedule.trim()) {
      setMsg("Please enter the medication schedule.");
      return;
    }

    setSaving(true);
    setMsg("");

    const { error } = await sb.from("medications").insert({
      dog_id: dogId,
      name: name.trim(),
      schedule: schedule.trim(),
      duration: duration.trim() || null,
      notes: notes.trim() || null,
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setSchedule("");
    setDuration("");
    setNotes("");

    setMsg("Medication saved successfully. 🐶💊");

    await loadData();

    setSaving(false);
  }

  async function deleteMedication(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this medication?"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMsg("");

    const { error } = await sb
      .from("medications")
      .delete()
      .eq("id", id);

    if (error) {
      setMsg(error.message);
      setDeleting(false);
      return;
    }

    setMsg("Medication deleted successfully.");

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
        <h1>💊 Medications</h1>

        <div className="card">
          <h2>Add Medication</h2>

          {loading ? (
            <p className="muted">Loading...</p>
          ) : dogs.length === 0 ? (
            <p className="muted">
              Please add your first dog from the Dashboard first.
            </p>
          ) : (
            <form className="form" onSubmit={saveMedication}>
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

              <label>Medication name</label>

              <input
                className="input"
                type="text"
                placeholder="Example: Medication name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <label>Schedule</label>

              <input
                className="input"
                type="text"
                placeholder="Example: 1 tablet twice daily"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                required
              />

              <label>Duration</label>

              <input
                className="input"
                type="text"
                placeholder="Example: 7 days"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />

              <label>Notes</label>

              <textarea
                className="input"
                rows={4}
                placeholder="Optional medication notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <button
                className="btn primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Medication"}
              </button>
            </form>
          )}

          {msg && <p className="muted">{msg}</p>}
        </div>

        <br />

        <div className="card">
          <h2>Medication List</h2>

          {medications.length === 0 ? (
            <p className="muted">
              No medications yet. Add the first medication above.
            </p>
          ) : (
            medications.map((medication) => (
              <div
                key={medication.id}
                className="card"
                style={{ marginTop: 12 }}
              >
                <h3>💊 {medication.name}</h3>

                <p className="muted">
                  🐶 {dogName(medication.dog_id)}
                </p>

                <p>
                  🕐 Schedule: {medication.schedule}
                </p>

                {medication.duration && (
                  <p>
                    📆 Duration: {medication.duration}
                  </p>
                )}

                {medication.notes && (
                  <p>
                    📝 {medication.notes}
                  </p>
                )}

                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    deleteMedication(medication.id)
                  }
                  disabled={deleting}
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete medication"}
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}