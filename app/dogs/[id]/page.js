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

  const [subscriptionPlan, setSubscriptionPlan] =
    useState("none");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState("inactive");

  useEffect(() => {
    async function loadDog() {
      const {
        data: { user },
      } = await sb.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Load subscription
      const profileResult = await sb
        .from("profiles")
        .select("subscription_plan, subscription_status")
        .eq("id", user.id)
        .single();

      if (!profileResult.error) {
        setSubscriptionPlan(
          profileResult.data?.subscription_plan || "none"
        );

        setSubscriptionStatus(
          profileResult.data?.subscription_status || "inactive"
        );
      }

      // Load dog
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

  const isPremium =
    subscriptionPlan === "premium" &&
    subscriptionStatus === "active";

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

          {/* BASIC INFORMATION */}

          <div className="card">
            <h2>Dog Information</h2>

            <p>
              <strong>Name:</strong>{" "}
              {dog.name}
            </p>

            <p>
              <strong>Breed:</strong>{" "}
              {dog.breed || "Not set"}
            </p>

            {isPremium ? (
              <>
                <p>
                  <strong>Birthday:</strong>{" "}
                  {dog.date_of_birth || "Not set"}
                </p>

                <p>
                  <strong>Gender:</strong>{" "}
                  {dog.gender || "Not set"}
                </p>

                <p>
                  <strong>Weight:</strong>{" "}
                  {dog.weight
                    ? `${dog.weight} kg`
                    : "Not set"}
                </p>

                <p>
                  <strong>Height:</strong>{" "}
                  {dog.height
                    ? `${dog.height} cm`
                    : "Not set"}
                </p>

                <p>
                  <strong>Color:</strong>{" "}
                  {dog.color || "Not set"}
                </p>

                <p>
                  <strong>Microchip:</strong>{" "}
                  {dog.microchip_number || "Not set"}
                </p>
              </>
            ) : (
              <div className="card">
                <h3>⭐ Premium Dog Profile</h3>

                <p>
                  🔒 Birthday
                </p>

                <p>
                  🔒 Gender
                </p>

                <p>
                  🔒 Weight
                </p>

                <p>
                  🔒 Height
                </p>

                <p>
                  🔒 Color
                </p>

                <p>
                  🔒 Microchip number
                </p>

                <p className="muted">
                  Unlock detailed information about
                  your dog with Premium.
                </p>

                <button
                  className="btn primary"
                  onClick={() =>
                    router.push("/pricing")
                  }
                >
                  ⭐ Upgrade to Premium →
                </button>
              </div>
            )}
          </div>

          {/* VETERINARIAN */}

          <div className="card">
            <h2>Veterinarian</h2>

            {isPremium ? (
              <>
                <p>
                  <strong>Name:</strong>{" "}
                  {dog.vet_name || "Not set"}
                </p>

                <p>
                  <strong>Phone:</strong>{" "}
                  {dog.vet_phone || "Not set"}
                </p>
              </>
            ) : (
              <>
                <p>🔒 Veterinarian information</p>

                <p className="muted">
                  Available with Premium.
                </p>

                <button
                  className="btn"
                  onClick={() =>
                    router.push("/pricing")
                  }
                >
                  View Premium →
                </button>
              </>
            )}
          </div>

        </section>

        <br />

        {/* PREMIUM BONUS */}

        <section className="card">
          <h2>🎁 Premium Bonus Features</h2>

          <div className="grid">

            <div className="card">
              <h3>
                📧 Email Notifications{" "}
                {!isPremium && "🔒"}
              </h3>

              <p className="muted">
                Get important dog-care reminders
                delivered directly to your email.
              </p>

              <p>🔔 Appointment reminders</p>
              <p>💉 Vaccination reminders</p>
              <p>💊 Medication reminders</p>

              {!isPremium && (
                <button
                  className="btn primary"
                  onClick={() => router.push("/pricing")}
                >
                  ⭐ Unlock Premium →
                </button>
              )}
            </div>

            <div className="card">
              <h3>
                📱 Push Notifications{" "}
                {!isPremium && "🔒"}
              </h3>

              <p className="muted">
                Receive timely alerts on your phone
                for important dog-care events.
              </p>

              <p>📅 Appointment alerts</p>
              <p>💉 Vaccine alerts</p>
              <p>💊 Medication alerts</p>

              {!isPremium && (
                <button
                  className="btn primary"
                  onClick={() => router.push("/pricing")}
                >
                  ⭐ Unlock Premium →
                </button>
              )}
            </div>

          </div>
        </section>

        {/* APP FEATURES */}

        <section className="grid">

          <div
            className="card"
            onClick={() =>
            (window.location.href =
              `/health?dog=${dog.id}`)
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

          <div
            className="card"
            onClick={() =>
            (window.location.href =
              `/vaccinations?dog=${dog.id}`)
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

          <div
            className="card"
            onClick={() =>
            (window.location.href =
              `/medications?dog=${dog.id}`)
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

          <div
            className="card"
            onClick={() =>
            (window.location.href =
              `/routines?dog=${dog.id}`)
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

          <div
            className="card"
            onClick={() =>
            (window.location.href =
              `/appointments?dog=${dog.id}`)
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