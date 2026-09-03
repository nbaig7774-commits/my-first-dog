"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";
import { hasPremiumAccess } from "../../lib/planAccess";

export default function DashboardPage() {
  const sb = createClient();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);

  const [subscriptionPlan, setSubscriptionPlan] = useState("none");
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
  const [subscriptionInterval, setSubscriptionInterval] = useState(null);

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingDog, setSavingDog] = useState(false);
  const [msg, setMsg] = useState("");

  const [basicBilling, setBasicBilling] = useState("monthly");
  const [premiumBilling, setPremiumBilling] = useState("monthly");

  async function loadDashboard() {
    setLoading(true);

    const {
      data: { user: currentUser },
    } = await sb.auth.getUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setUser(currentUser);

    const { data: profile } = await sb
      .from("profiles")
      .select(
        "subscription_plan, subscription_status, subscription_interval"
      )
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profile) {
      setSubscriptionPlan(profile.subscription_plan || "none");
      setSubscriptionStatus(profile.subscription_status || "inactive");
      setSubscriptionInterval(profile.subscription_interval || null);
    }

    const { data: dogData, error: dogsError } = await sb
      .from("dogs")
      .select("id, name, breed, created_at")
      .order("created_at", { ascending: true });

    if (dogsError) {
      setMsg(dogsError.message);
      setLoading(false);
      return;
    }

    setDogs(dogData || []);

    const [healthResult, vaccineResult] = await Promise.all([
      sb
        .from("health_records")
        .select("id, dog_id, title, record_date, notes, created_at")
        .order("record_date", { ascending: false }),

      sb
        .from("vaccinations")
        .select(
          "id, dog_id, vaccine_name, vaccination_date, due_date, status, notes, created_at"
        )
        .order("vaccination_date", { ascending: false }),
    ]);

    setHealthRecords(
      healthResult.error ? [] : healthResult.data || []
    );

    setVaccinations(
      vaccineResult.error ? [] : vaccineResult.data || []
    );

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function addDog(event) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanBreed = breed.trim();

    if (!cleanName) {
      setMsg("Please enter your dog's name.");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    setSavingDog(true);
    setMsg("");

    const { error } = await sb.from("dogs").insert({
      owner_id: user.id,
      name: cleanName,
      breed: cleanBreed || null,
    });

    if (error) {
      setMsg(error.message);
      setSavingDog(false);
      return;
    }

    setName("");
    setBreed("");
    setMsg("Dog added successfully. 🐶");

    await loadDashboard();

    setSavingDog(false);
  }

  async function logout() {
    await sb.auth.signOut();
    router.replace("/login");
  }

  function selectPlan(plan, billing) {
    if (plan === "Basic") {
      setMsg(
        `Basic ${billing} selected. Your first 3 months are FREE. Paddle checkout will be connected during payment setup.`
      );
      return;
    }

    if (plan === "Premium") {
      setMsg(
        `Premium ${billing} selected. Premium has no free trial. Paddle checkout will be connected during payment setup.`
      );
    }
  }

  const isActive = subscriptionStatus === "active";

  const isPremium =
    isActive && hasPremiumAccess(subscriptionPlan);

  const isBasic =
    isActive && subscriptionPlan === "basic";

  return (
    <>
      <Sidebar />

      <main
        className="container"
        style={{
          paddingBottom: "60px",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1>Dashboard</h1>

            <p className="muted">
              Your dog's care at a glance.
            </p>
          </div>

          <button
            className="btn"
            type="button"
            onClick={logout}
          >
            Log out
          </button>
        </div>

        {/* ACTIVE PLAN */}

        {isBasic && (
          <section
            className="card"
            style={{
              marginBottom: "22px",
              background: "#f3f9ff",
              border: "1px solid #bfdbfe",
            }}
          >
            <h2>🐶 Basic Plan</h2>

            <p className="muted">
              Your Basic subscription is active.
            </p>

            <strong>
              {subscriptionInterval === "annual"
                ? "Annual subscription"
                : "Monthly subscription"}
            </strong>
          </section>
        )}

        {isPremium && (
          <section
            className="card"
            style={{
              marginBottom: "22px",
              background: "#fff8e8",
              border: "1px solid #f5c451",
            }}
          >
            <h2>⭐ Premium Plan</h2>

            <p className="muted">
              Your Premium subscription is active.
            </p>

            <strong>
              {subscriptionInterval === "annual"
                ? "Annual subscription"
                : "Monthly subscription"}
            </strong>
          </section>
        )}

        {/* PRICING */}

        <section
          style={{
            textAlign: "center",
            marginTop: "28px",
          }}
        >
          <h1>🐾 Choose the Best Plan for Your Dog</h1>

          <p className="muted">
            Simple. Flexible. Complete.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "22px",
            marginTop: "26px",
          }}
        >
          {/* BASIC CARD */}

          <div
            className="card"
            style={{
              borderRadius: "22px",
              padding: "26px",
              background:
                "linear-gradient(180deg,#f3f9ff 0%,#ffffff 42%)",
              border: "2px solid #bfdbfe",
              boxSizing: "border-box",
            }}
          >
            <h2>🐶 Basic</h2>

            <p className="muted">
              Perfect for everyday dog care.
            </p>

            <div
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                background: "#eaf4ff",
                marginBottom: "12px",
                fontWeight: "800",
              }}
            >
              🎁 3 MONTHS FREE
            </div>

            <h1>
              $10
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "400",
                }}
              >
                /month
              </span>
            </h1>

            <strong>$120/year</strong>

            <p className="muted">
              3 months free for new customers, then
              $10/month or $120/year.
            </p>

            <div
              style={{
                padding: "15px",
                marginTop: "15px",
                borderRadius: "15px",
                background: "#f7fbff",
              }}
            >
              <strong>💳 Billing</strong>

              <label
                style={{
                  display: "block",
                  marginTop: "12px",
                }}
              >
                <input
                  type="radio"
                  name="basicBilling"
                  checked={basicBilling === "monthly"}
                  onChange={() =>
                    setBasicBilling("monthly")
                  }
                />{" "}
                Monthly — $10/month
              </label>

              <label
                style={{
                  display: "block",
                  marginTop: "10px",
                }}
              >
                <input
                  type="radio"
                  name="basicBilling"
                  checked={basicBilling === "annual"}
                  onChange={() =>
                    setBasicBilling("annual")
                  }
                />{" "}
                Annual — $120/year
              </label>
            </div>

            <div
              style={{
                padding: "15px",
                marginTop: "18px",
                borderRadius: "15px",
                background: "#f7fbff",
              }}
            >
              <h3>Everyday Dog Care</h3>

              <p>🐾 ✓ Dog Profile</p>
              <p className="muted">
                Name and breed
              </p>

              <p>❤️ ✓ Health Management</p>
              <p className="muted">
                Health records and timeline
              </p>

              <p>💉 ✓ Vaccination Management</p>
              <p className="muted">
                Vaccines and due dates
              </p>

              <p>💊 ✓ Medication Management</p>
              <p className="muted">
                Medication and treatment information
              </p>

              <p>🔄 ✓ Routine Management</p>
              <p className="muted">
                Daily routines and care schedules
              </p>

              <p>📅 ✓ Vet Appointment Management</p>
              <p className="muted">
                Appointment records and vet details
              </p>

              <p>🤖 ✓ AI Care Assistant</p>
              <p className="muted">
                Basic dog-care questions and guidance
              </p>
            </div>

            <button
              className="btn primary"
              type="button"
              style={{
                width: "100%",
                marginTop: "20px",
              }}
              onClick={() =>
                selectPlan("Basic", basicBilling)
              }
            >
              🎁 Start 3 Months Free →
            </button>
          </div>

          {/* PREMIUM CARD */}

          <div
            className="card"
            style={{
              borderRadius: "22px",
              padding: "26px",
              background:
                "linear-gradient(180deg,#fff9e8 0%,#ffffff 42%)",
              border: "2px solid #f5c451",
              position: "relative",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-13px",
                right: "20px",
                padding: "7px 14px",
                borderRadius: "999px",
                background: "#f59e0b",
                color: "#ffffff",
                fontWeight: "800",
              }}
            >
              ⭐ Most Popular
            </div>

            <h2>⭐ Premium</h2>

            <p className="muted">
              Complete care for your dog.
            </p>

            <h1>
              $20
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "400",
                }}
              >
                /month
              </span>
            </h1>

            <strong>$240/year</strong>

            <p className="muted">
              Premium has no free trial.
            </p>

            <div
              style={{
                padding: "15px",
                marginTop: "15px",
                borderRadius: "15px",
                background: "#fffaf0",
              }}
            >
              <strong>💳 Billing</strong>

              <label
                style={{
                  display: "block",
                  marginTop: "12px",
                }}
              >
                <input
                  type="radio"
                  name="premiumBilling"
                  checked={premiumBilling === "monthly"}
                  onChange={() =>
                    setPremiumBilling("monthly")
                  }
                />{" "}
                Monthly — $20/month
              </label>

              <label
                style={{
                  display: "block",
                  marginTop: "10px",
                }}
              >
                <input
                  type="radio"
                  name="premiumBilling"
                  checked={premiumBilling === "annual"}
                  onChange={() =>
                    setPremiumBilling("annual")
                  }
                />{" "}
                Annual — $240/year
              </label>
            </div>

            <div
              style={{
                padding: "15px",
                marginTop: "18px",
                borderRadius: "15px",
                background: "#fffaf0",
              }}
            >
              <h3>Complete Dog Care</h3>

              <p>🐾 ✓ Dog Profile</p>
              <p className="muted">
                Complete dog information
              </p>

              <p>❤️ ✓ Health Management</p>
              <p className="muted">
                Complete health history
              </p>

              <p>💉 ✓ Vaccination Management</p>
              <p className="muted">
                Vaccines, dates and reminders
              </p>

              <p>💊 ✓ Medication Management</p>
              <p className="muted">
                Medication and treatment tracking
              </p>

              <p>🔄 ✓ Routine Management</p>
              <p className="muted">
                Daily routines and schedules
              </p>

              <p>📅 ✓ Vet Appointment Management</p>
              <p className="muted">
                Appointments and vet details
              </p>

              <p>🤖 ✓ Premium AI Care Assistant</p>
              <p className="muted">
                Advanced personalized dog-care guidance
              </p>

              <p>📧 ✓ Email Reminders</p>
              <p className="muted">
                Appointment, vaccination and medication reminders
              </p>
            </div>

            <button
              className="btn primary"
              type="button"
              style={{
                width: "100%",
                marginTop: "20px",
              }}
              onClick={() =>
                selectPlan("Premium", premiumBilling)
              }
            >
              ⭐ Choose Premium →
            </button>
          </div>
        </section>

        {/* MESSAGE */}

        {msg && (
          <div
            className="card"
            style={{
              marginTop: "20px",
              background: "#f8fafc",
            }}
          >
            <p>{msg}</p>
          </div>
        )}

        {/* STATS */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginTop: "26px",
          }}
        >
          <div className="card">
            <div className="stat">
              🐾 {dogs.length}
            </div>

            <strong>Dogs</strong>

            <p className="muted">
              Your furry family members
            </p>
          </div>

          <div className="card">
            <div className="stat">
              ❤️ {healthRecords.length}
            </div>

            <strong>Health Records</strong>

            <p className="muted">
              Keep track of health history
            </p>
          </div>

          <div className="card">
            <div className="stat">
              💉 {vaccinations.length}
            </div>

            <strong>Vaccines</strong>

            <p className="muted">
              Stay up to date
            </p>
          </div>

          <div
            className="card"
            style={{ cursor: "pointer" }}
            onClick={() =>
              router.push("/ai-assistant")
            }
          >
            <div className="stat">
              🤖
            </div>

            <strong>AI Assistant</strong>

            <p className="muted">
              Get help with your dog's care →
            </p>
          </div>
        </section>

        {/* ADD DOG + YOUR DOGS */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          <form
            className="card"
            onSubmit={addDog}
          >
            <h2>➕ Add your dog</h2>

            <p className="muted">
              Start tracking your dog's health and care.
            </p>

            <input
              className="input"
              placeholder="Dog name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />

            <br />

            <input
              className="input"
              placeholder="Breed (optional)"
              value={breed}
              onChange={(e) =>
                setBreed(e.target.value)
              }
            />

            <br />

            <button
              className="btn primary"
              type="submit"
              disabled={savingDog}
              style={{
                width: "100%",
              }}
            >
              {savingDog
                ? "Adding..."
                : "Add dog →"}
            </button>
          </form>

          <div className="card">
            <h2>🐾 Your dogs</h2>

            <p className="muted">
              Manage your dogs and view their profiles.
            </p>

            {loading ? (
              <p className="muted">
                Loading...
              </p>
            ) : dogs.length === 0 ? (
              <p className="muted">
                Add your first dog.
              </p>
            ) : (
              dogs.map((dog) => (
                <div
                  key={dog.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 0",
                    borderBottom:
                      "1px solid #edf1f7",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    router.push(
                      `/dogs/${dog.id}`
                    )
                  }
                >
                  <div>
                    <strong>
                      🐶 {dog.name}
                    </strong>

                    <p
                      className="muted"
                      style={{
                        margin: "4px 0 0",
                      }}
                    >
                      {dog.breed ||
                        "Breed not set"}
                    </p>
                  </div>

                  <span className="pill">
                    View profile →
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}