"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import Sidebar from "../../components/Sidebar";

export default function DogProfile() {
  const sb = createClient();
  const params = useParams();
  const router = useRouter();

  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadDog() {
      const {
        data: { user },
      } = await sb.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await sb
        .from("dogs")
        .select("*")
        .eq("id", params.id)
        .eq("owner_id", user.id)
        .single();

      if (error) {
        setMsg(error.message);
      } else {
        setDog(data);
      }

      setLoading(false);
    }

    loadDog();
  }, [params.id]);

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className="container">
          <p>Loading dog profile...</p>
        </main>
      </>
    );
  }

  if (!dog) {
    return (
      <>
        <Sidebar />
        <main className="container">
          <h1>Dog not found</h1>
          <p className="muted">{msg}</p>

          <button
            className="btn"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="container">

        <button
          className="btn"
          onClick={() => router.push("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        <section className="hero">
          <h1>🐶 {dog.name}</h1>

          <p className="muted">
            {dog.breed || "Breed not set"}
          </p>
        </section>

        <section className="grid">

          <div className="card">
            <h2>Dog Information</h2>

            <p>
              <strong>Name:</strong> {dog.name}
            </p>

            <p>
              <strong>Breed:</strong>{" "}
              {dog.breed || "Not set"}
            </p>

            <p>
              <strong>Age:</strong>{" "}
              {dog.age_text || "Not set"}
            </p>

            <p>
              <strong>Weight:</strong>{" "}
              {dog.weight_text || "Not set"}
            </p>

            <p>
              <strong>Birthday:</strong>{" "}
              {dog.birthday || "Not set"}
            </p>
          </div>

          <div className="card">
            <h2>Veterinarian</h2>

            <p>
              <strong>Name:</strong>{" "}
              {dog.vet_name || "Not set"}
            </p>

            <p>
              <strong>Phone:</strong>{" "}
              {dog.vet_phone || "Not set"}
            </p>
          </div>

        </section>

        <br />

        <section className="grid">

          {/* HEALTH */}

          <div
            className="card"
            onClick={() =>
              (window.location.href = `/health?dog=${dog.id}`)
            }
            style={{ cursor: "pointer" }}
          >
            <h2>❤️ Health</h2>

            <p className="muted">
              View your dog's health records.
            </p>

            <span className="pill">
              View health records →
            </span>
          </div>

          {/* VACCINATIONS */}

          <div
            className="card"
            onClick={() =>
              (window.location.href = `/vaccinations?dog=${dog.id}`)
            }
            style={{ cursor: "pointer" }}
          >
            <h2>💉 Vaccinations</h2>

            <p className="muted">
              Track vaccines and due dates.
            </p>

            <span className="pill">
              View vaccinations →
            </span>
          </div>

          {/* MEDICATIONS */}

          <div
            className="card"
            onClick={() =>
              (window.location.href = `/medications?dog=${dog.id}`)
            }
            style={{ cursor: "pointer" }}
          >
            <h2>💊 Medications</h2>

            <p className="muted">
              Keep medication information organized.
            </p>

            <span className="pill">
              View medications →
            </span>
          </div>

          {/* ROUTINES */}

          <div
            className="card"
            onClick={() =>
              (window.location.href = `/routines?dog=${dog.id}`)
            }
            style={{ cursor: "pointer" }}
          >
            <h2>🔄 Routines</h2>

            <p className="muted">
              Manage your dog's daily routines.
            </p>

            <span className="pill">
              View routines →
            </span>
          </div>

          {/* APPOINTMENTS */}

          <div
            className="card"
            onClick={() =>
              (window.location.href = `/appointments?dog=${dog.id}`)
            }
            style={{ cursor: "pointer" }}
          >
            <h2>📅 Appointments</h2>

            <p className="muted">
              Keep track of vet appointments.
            </p>

            <span className="pill">
              View appointments →
            </span>
          </div>

        </section>

      </main>
    </>
  );
}