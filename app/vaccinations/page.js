"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";

export default function Page() {
  const sb = createClient();

  const [dogs, setDogs] = useState([]);
  const [vaccines, setVaccines] = useState([]);

  const [dogId, setDogId] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [vaccinationDate, setVaccinationDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Complete");
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

    // Read dog ID from URL
    const urlDogId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("dog")
        : null;

    // Check whether URL dog actually belongs to the loaded dogs
    const validDog =
      urlDogId &&
      allDogs.some((dog) => dog.id === urlDogId);

    // Select URL dog if valid, otherwise first dog
    const selectedDog = validDog
      ? urlDogId
      : allDogs.length > 0
      ? allDogs[0].id
      : "";

    setDogId(selectedDog);

    // Load vaccinations
    let query = sb
      .from("vaccinations")
      .select(
        "id, dog_id, vaccine_name, vaccination_date, due_date, status, notes, created_at"
      )
      .order("vaccination_date", { ascending: false });

    // IMPORTANT:
    // If opened from a dog profile,
    // show ONLY that dog's vaccinations.
    if (validDog) {
      query = query.eq("dog_id", urlDogId);
    }

    const {
      data: vaccineData,
      error: vaccineError,
    } = await query;

    if (vaccineError) {
      setMsg(vaccineError.message);
    } else {
      setVaccines(vaccineData || []);
    }

    setLoading(false);
  }

  async function saveVaccination(e) {
    e.preventDefault();

    if (!dogId) {
      setMsg("Please add a dog first.");
      return;
    }

    if (!vaccineName.trim()) {
      setMsg("Please enter a vaccine name.");
      return;
    }

    if (!vaccinationDate) {
      setMsg("Please select the vaccination date.");
      return;
    }

    setSaving(true);
    setMsg("");

    const { error } = await sb.from("vaccinations").insert({
      dog_id: dogId,
      vaccine_name: vaccineName.trim(),
      vaccination_date: vaccinationDate,
      due_date: dueDate || null,
      status,
      notes: notes.trim() || null,
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setVaccineName("");
    setVaccinationDate("");
    setDueDate("");
    setStatus("Complete");
    setNotes("");

    setMsg("Vaccination saved successfully. 🐶💉");

    await loadData();

    setSaving(false);
  }

  async function deleteVaccination(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this vaccination?"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMsg("");

    const { error } = await sb
      .from("vaccinations")
      .delete()
      .eq("id", id);

    if (error) {
      setMsg(error.message);
      setDeleting(false);
      return;
    }

    setMsg("Vaccination deleted successfully.");

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
        <h1>💉 Vaccinations</h1>

        <div className="card">
          <h2>Add Vaccination</h2>

          {loading ? (
            <p className="muted">
              Loading...
            </p>
          ) : dogs.length === 0 ? (
            <p className="muted">
              Please add your first dog from the
              Dashboard first.
            </p>
          ) : (
            <form
              className="form"
              onSubmit={saveVaccination}
            >
              <label>Dog</label>

              <select
                className="input"
                value={dogId}
                onChange={(e) =>
                  setDogId(e.target.value)
                }
              >
                {dogs.map((dog) => (
                  <option
                    key={dog.id}
                    value={dog.id}
                  >
                    🐶 {dog.name}
                  </option>
                ))}
              </select>

              <label>Vaccine name</label>

              <input
                className="input"
                type="text"
                placeholder="Example: Rabies"
                value={vaccineName}
                onChange={(e) =>
                  setVaccineName(e.target.value)
                }
                required
              />

              <label>Vaccination date</label>

              <input
                className="input"
                type="date"
                value={vaccinationDate}
                onChange={(e) =>
                  setVaccinationDate(
                    e.target.value
                  )
                }
                required
              />

              <label>Next due date</label>

              <input
                className="input"
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
              />

              <label>Status</label>

              <select
                className="input"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
              >
                <option value="Complete">
                  Completed
                </option>

                <option value="Upcoming">
                  Upcoming
                </option>

                <option value="Due soon">
                  Due soon
                </option>
              </select>

              <label>Notes</label>

              <textarea
                className="input"
                rows={4}
                placeholder="Optional vaccination notes..."
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
              />

              <button
                className="btn primary"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Vaccination"}
              </button>
            </form>
          )}

          {msg && (
            <p className="muted">
              {msg}
            </p>
          )}
        </div>

        <br />

        <div className="card">
          <h2>Vaccination Timeline</h2>

          {vaccines.length === 0 ? (
            <p className="muted">
              No vaccinations yet. Add the first
              vaccination above.
            </p>
          ) : (
            vaccines.map((vaccine) => (
              <div
                key={vaccine.id}
                className="card"
                style={{ marginTop: 12 }}
              >
                <h3>
                  💉 {vaccine.vaccine_name}
                </h3>

                <p className="muted">
                  🐶{" "}
                  {dogName(vaccine.dog_id)}
                </p>

                <p>
                  📅 Vaccinated:{" "}
                  {vaccine.vaccination_date}
                </p>

                {vaccine.due_date && (
                  <p>
                    🔔 Next due:{" "}
                    {vaccine.due_date}
                  </p>
                )}

                <p>
                  📌 Status: {vaccine.status}
                </p>

                {vaccine.notes && (
                  <p>
                    📝 {vaccine.notes}
                  </p>
                )}

                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    deleteVaccination(
                      vaccine.id
                    )
                  }
                  disabled={deleting}
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete vaccination"}
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}