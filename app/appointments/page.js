"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";

export default function Page() {
  const sb = createClient();

  const [dogs, setDogs] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [dogId, setDogId] = useState("");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [reason, setReason] = useState("");
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

    // Load dogs
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

    // Check if opened from a specific dog profile
    const urlDogId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("dog")
        : null;

    const validDog =
      urlDogId &&
      allDogs.some((dog) => dog.id === urlDogId);

    const selectedDog = validDog
      ? urlDogId
      : allDogs.length > 0
      ? allDogs[0].id
      : "";

    setDogId(selectedDog);

    // Load appointments
    let query = sb
      .from("appointments")
      .select(
        "id, dog_id, appointment_at, clinic_name, reason, notes, created_at"
      )
      .order("appointment_at", { ascending: true });

    // If opened from a dog profile, show only that dog's appointments
    if (validDog) {
      query = query.eq("dog_id", urlDogId);
    }

    const {
      data: appointmentData,
      error: appointmentError,
    } = await query;

    if (appointmentError) {
      setMsg(appointmentError.message);
    } else {
      setAppointments(appointmentData || []);
    }

    setLoading(false);
  }

  async function saveAppointment(e) {
    e.preventDefault();

    if (!dogId) {
      setMsg("Please add a dog first.");
      return;
    }

    if (!appointmentAt) {
      setMsg("Please select the appointment date and time.");
      return;
    }

    if (!clinicName.trim()) {
      setMsg("Please enter the clinic name.");
      return;
    }

    if (!reason.trim()) {
      setMsg("Please enter the reason for the appointment.");
      return;
    }

    setSaving(true);
    setMsg("");

    const { error } = await sb.from("appointments").insert({
      dog_id: dogId,
      appointment_at: new Date(
        appointmentAt
      ).toISOString(),
      clinic_name: clinicName.trim(),
      reason: reason.trim(),
      notes: notes.trim() || null,
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setAppointmentAt("");
    setClinicName("");
    setReason("");
    setNotes("");

    setMsg("Appointment saved successfully. 🐶📅");

    await loadData();

    setSaving(false);
  }

  async function deleteAppointment(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this appointment?"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMsg("");

    const { error } = await sb
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      setMsg(error.message);
      setDeleting(false);
      return;
    }

    setMsg("Appointment deleted successfully.");

    await loadData();

    setDeleting(false);
  }

  function dogName(id) {
    const dog = dogs.find((dog) => dog.id === id);

    return dog ? dog.name : "Unknown dog";
  }

  function formatDateTime(value) {
    return new Date(value).toLocaleString();
  }

  return (
    <>
      <Sidebar />

      <main className="container">
        <h1>📅 Vet Appointments</h1>

        <div className="card">
          <h2>Book Appointment</h2>

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
              onSubmit={saveAppointment}
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

              <label>
                Appointment date and time
              </label>

              <input
                className="input"
                type="datetime-local"
                value={appointmentAt}
                onChange={(e) =>
                  setAppointmentAt(
                    e.target.value
                  )
                }
                required
              />

              <label>Clinic name</label>

              <input
                className="input"
                type="text"
                placeholder="Example: Happy Paws Veterinary Clinic"
                value={clinicName}
                onChange={(e) =>
                  setClinicName(e.target.value)
                }
                required
              />

              <label>Reason for visit</label>

              <input
                className="input"
                type="text"
                placeholder="Example: Annual checkup"
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                required
              />

              <label>Notes</label>

              <textarea
                className="input"
                rows={4}
                placeholder="Optional notes..."
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
                  : "Save Appointment"}
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
          <h2>Upcoming Appointments</h2>

          {appointments.length === 0 ? (
            <p className="muted">
              No appointments yet. Book your
              first appointment above.
            </p>
          ) : (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="card"
                style={{ marginTop: 12 }}
              >
                <h3>
                  📅 {appointment.reason}
                </h3>

                <p className="muted">
                  🐶{" "}
                  {dogName(
                    appointment.dog_id
                  )}
                </p>

                <p>
                  🕐{" "}
                  {formatDateTime(
                    appointment.appointment_at
                  )}
                </p>

                <p>
                  🏥{" "}
                  {appointment.clinic_name}
                </p>

                {appointment.notes && (
                  <p>
                    📝 {appointment.notes}
                  </p>
                )}

                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    deleteAppointment(
                      appointment.id
                    )
                  }
                  disabled={deleting}
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete appointment"}
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}