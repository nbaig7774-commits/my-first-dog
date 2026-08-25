"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";

export default function Page() {
  const sb = createClient();

  const [dogs, setDogs] = useState([]);
  const [records, setRecords] = useState([]);

  const [dogId, setDogId] = useState("");
  const [title, setTitle] = useState("");
  const [recordDate, setRecordDate] = useState("");
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

    // Check whether this page was opened from a specific dog profile.
    const urlDogId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("dog")
        : null;

    const selectedDog =
      urlDogId && allDogs.some((dog) => dog.id === urlDogId)
        ? urlDogId
        : allDogs.length > 0
        ? allDogs[0].id
        : "";

    setDogId(selectedDog);

    let query = sb
      .from("health_records")
      .select("id, dog_id, title, record_date, notes, created_at")
      .order("record_date", { ascending: false });

    if (urlDogId && allDogs.some((dog) => dog.id === urlDogId)) {
      query = query.eq("dog_id", urlDogId);
    }

    const { data: recordData, error: recordError } = await query;

    if (recordError) {
      setMsg(recordError.message);
    } else {
      setRecords(recordData || []);
    }

    setLoading(false);
  }

  async function saveRecord(e) {
    e.preventDefault();

    if (!dogId) {
      setMsg("Please add a dog first.");
      return;
    }

    if (!title.trim()) {
      setMsg("Please enter a health record title.");
      return;
    }

    if (!recordDate) {
      setMsg("Please select a record date.");
      return;
    }

    setSaving(true);
    setMsg("");

    const { error } = await sb.from("health_records").insert({
      dog_id: dogId,
      title: title.trim(),
      record_date: recordDate,
      notes: notes.trim() || null,
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setRecordDate("");
    setNotes("");

    setMsg("Health record saved successfully. 🐶");

    await loadData();

    setSaving(false);
  }

  async function deleteRecord(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this health record?"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMsg("");

    const { error } = await sb
      .from("health_records")
      .delete()
      .eq("id", id);

    if (error) {
      setMsg(error.message);
      setDeleting(false);
      return;
    }

    setMsg("Health record deleted successfully.");

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
        <h1>🩺 Health</h1>

        <div className="card">
          <h2>Add Health Record</h2>

          {loading ? (
            <p className="muted">Loading...</p>
          ) : dogs.length === 0 ? (
            <p className="muted">
              Please add your first dog from the Dashboard before adding a
              health record.
            </p>
          ) : (
            <form className="form" onSubmit={saveRecord}>
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

              <label>Record title</label>

              <input
                className="input"
                type="text"
                placeholder="Example: Annual checkup"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <label>Record date</label>

              <input
                className="input"
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                required
              />

              <label>Notes</label>

              <textarea
                className="input"
                placeholder="Enter health information, vet notes, treatment, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
              />

              <button
                className="btn primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Health Record"}
              </button>
            </form>
          )}

          {msg && <p className="muted">{msg}</p>}
        </div>

        <br />

        <div className="card">
          <h2>Health Timeline</h2>

          {records.length === 0 ? (
            <p className="muted">
              No health records yet. Add your first record above.
            </p>
          ) : (
            records.map((record) => (
              <div
                key={record.id}
                className="card"
                style={{ marginTop: 12 }}
              >
                <h3>🩺 {record.title}</h3>

                <p className="muted">
                  🐶 {dogName(record.dog_id)}
                </p>

                <p>
  📅 {record.record_date}
                </p>

                {record.notes && <p>📝 {record.notes}</p>}

                <button
                  className="btn"
                  type="button"
                  onClick={() => deleteRecord(record.id)}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete health record"}
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}