"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const sb = createClient();

  const [user, setUser] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [msg, setMsg] = useState("");

  const [subscriptionPlan, setSubscriptionPlan] =
    useState("none");

  const [subscriptionStatus, setSubscriptionStatus] =
    useState("inactive");

  const [subscriptionInterval, setSubscriptionInterval] =
    useState(null);

  const [basicBilling, setBasicBilling] =
    useState("monthly");

  const [premiumBilling, setPremiumBilling] =
    useState("monthly");

  const [proBilling, setProBilling] =
    useState("monthly");

  const [healthCount, setHealthCount] = useState(0);
  const [vaccineCount, setVaccineCount] = useState(0);

  async function load() {
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      location.href = "/login";
      return;
    }

    setUser(user);

    const profileResult = await sb
      .from("profiles")
      .select(
        "subscription_plan, subscription_status, subscription_interval"
      )
      .eq("id", user.id)
      .single();

    if (!profileResult.error) {
      setSubscriptionPlan(
        profileResult.data?.subscription_plan || "none"
      );

      setSubscriptionStatus(
        profileResult.data?.subscription_status || "inactive"
      );

      setSubscriptionInterval(
        profileResult.data?.subscription_interval || null
      );
    }

    const dogsResult = await sb
      .from("dogs")
      .select("*")
      .order("created_at", { ascending: false });

    if (dogsResult.error) {
      setMsg(dogsResult.error.message);
    } else {
      setDogs(dogsResult.data || []);
    }

    const healthResult = await sb
      .from("health_records")
      .select("id", {
        count: "exact",
        head: true,
      });

    if (!healthResult.error) {
      setHealthCount(healthResult.count || 0);
    }

    const vaccineResult = await sb
      .from("vaccinations")
      .select("id", {
        count: "exact",
        head: true,
      });

    if (!vaccineResult.error) {
      setVaccineCount(vaccineResult.count || 0);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();

    if (!user) return;

    const r = await sb.from("dogs").insert({
      owner_id: user.id,
      name: name.trim(),
      breed: breed.trim(),
    });

    if (r.error) {
      setMsg(r.error.message);
    } else {
      setName("");
      setBreed("");
      setMsg("");
      load();
    }
  }

  async function logout() {
    await sb.auth.signOut();
    location.href = "/";
  }

  const isActive =
    subscriptionStatus === "active";

  const isBasic =
    isActive && subscriptionPlan === "basic";

  const isPremium =
    isActive && subscriptionPlan === "premium";

  const isPro =
    isActive &&
    (subscriptionPlan === "pro" ||
      subscriptionPlan === "pro_family");

  const showPricing = !isActive;

  function choosePlan(plan, interval) {
    setMsg(
      `${plan} ${interval} selected. Payment checkout will be connected in the payment setup step.`
    );
  }

  const pageStyle = {
    paddingBottom: "50px",
  };

  const titleStyle = {
    fontSize: "42px",
    fontWeight: "800",
    marginBottom: "6px",
  };

  const subtitleStyle = {
    fontSize: "18px",
    marginTop: 0,
  };

  const pricingGrid = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "22px",
    marginTop: "28px",
    alignItems: "stretch",
  };

  const basicCard = {
    border: "2px solid #dbeafe",
    borderRadius: "24px",
    padding: "26px",
    background:
      "linear-gradient(180deg, #f3f9ff 0%, #ffffff 35%)",
    boxShadow:
      "0 14px 35px rgba(30, 100, 180, 0.12)",
    display: "flex",
    flexDirection: "column",
  };

  const premiumCard = {
    border: "2px solid #f5b942",
    borderRadius: "24px",
    padding: "26px",
    background:
      "linear-gradient(180deg, #fff9e9 0%, #ffffff 35%)",
    boxShadow:
      "0 18px 42px rgba(230, 150, 20, 0.18)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  };

  const proCard = {
    border: "2px solid #ddd6fe",
    borderRadius: "24px",
    padding: "26px",
    background:
      "linear-gradient(180deg, #f8f5ff 0%, #ffffff 35%)",
    boxShadow:
      "0 14px 35px rgba(100, 70, 180, 0.12)",
    display: "flex",
    flexDirection: "column",
  };

  const featureBox = {
    borderRadius: "16px",
    padding: "15px",
    marginTop: "18px",
    background: "#f7fbff",
  };

  const premiumFeatureBox = {
    borderRadius: "16px",
    padding: "15px",
    marginTop: "18px",
    background: "#fff8e8",
  };

  const proFeatureBox = {
    borderRadius: "16px",
    padding: "15px",
    marginTop: "18px",
    background: "#f8f5ff",
  };

  const bonusBox = {
    borderRadius: "16px",
    padding: "16px",
    marginTop: "18px",
    background:
      "linear-gradient(135deg, #fff0f7, #fff8ec)",
    border: "1px solid #f5d5e5",
  };

  const subscribeBasic = {
    width: "100%",
    marginTop: "22px",
    padding: "15px",
    border: "none",
    borderRadius: "14px",
    background: "#1683f7",
    color: "white",
    fontSize: "17px",
    fontWeight: "700",
    cursor: "pointer",
  };

  const subscribePremium = {
    width: "100%",
    marginTop: "22px",
    padding: "15px",
    border: "none",
    borderRadius: "14px",
    background: "#f59e0b",
    color: "white",
    fontSize: "17px",
    fontWeight: "700",
    cursor: "pointer",
  };

  const subscribePro = {
    width: "100%",
    marginTop: "22px",
    padding: "15px",
    border: "none",
    borderRadius: "14px",
    background: "#7c3aed",
    color: "white",
    fontSize: "17px",
    fontWeight: "700",
    cursor: "pointer",
  };

  return (
    <>
      <Sidebar />

      <main
        className="container"
        style={pageStyle}
      >

        {/* HEADER */}

        <div
          className="row"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <div>
            <h1 style={titleStyle}>
              Dashboard
            </h1>

            <p
              className="muted"
              style={subtitleStyle}
            >
              Your dog's care at a glance.
            </p>
          </div>

          <button
            className="btn"
            onClick={logout}
          >
            Log out
          </button>
        </div>

        {/* ACTIVE BASIC */}

        {isBasic && (
          <section
            className="card"
            style={{
              borderRadius: "18px",
              background: "#f2f8ff",
              border: "1px solid #b9dcff",
              marginBottom: "24px",
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

        {/* ACTIVE PREMIUM */}

        {isPremium && (
          <section
            className="card"
            style={{
              borderRadius: "18px",
              background: "#fff8e8",
              border: "1px solid #f5c451",
              marginBottom: "24px",
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

        {/* ACTIVE PRO */}

        {isPro && (
          <section
            className="card"
            style={{
              borderRadius: "18px",
              background: "#f7f3ff",
              border: "1px solid #c4b5fd",
              marginBottom: "24px",
            }}
          >
            <h2>🏆 Pro Family Plan</h2>

            <p className="muted">
              Your Pro Family subscription is active.
            </p>

            <strong>
              {subscriptionInterval === "annual"
                ? "Annual subscription"
                : "Monthly subscription"}
            </strong>
          </section>
        )}

        {/* PRICING */}

        {showPricing && (
          <>
            <section
              style={{
                textAlign: "center",
                marginTop: "20px",
              }}
            >
              <h1
                style={{
                  fontSize: "38px",
                  fontWeight: "800",
                  marginBottom: "8px",
                }}
              >
                🐾 Choose the Best Plan for Your Dog
              </h1>

              <p
                className="muted"
                style={{
                  fontSize: "18px",
                  marginBottom: "4px",
                }}
              >
                Give your dog the care, tracking,
                and support they deserve.
              </p>

              <p
                className="muted"
                style={{
                  fontSize: "16px",
                }}
              >
                Simple. Flexible. Complete.
              </p>
            </section>

            <section style={pricingGrid}>

              {/* ================= BASIC ================= */}

              <div style={basicCard}>

                <h2
                  style={{
                    fontSize: "28px",
                    marginBottom: "4px",
                  }}
                >
                  🐶 Basic Plan
                </h2>

                <p className="muted">
                  Perfect for everyday dog care.
                </p>

                <hr />

                <h1>
                  $15
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "400",
                    }}
                  >
                    /month
                  </span>
                </h1>

                <p>
                  <strong>$150/year</strong>
                </p>

                <p className="muted">
                  💰 Save $30 with annual billing.
                </p>

                {/* BILLING */}

                <div style={featureBox}>

                  <h3>
                    💳 Payment Subscription
                  </h3>

                  <label
                    style={{
                      display: "block",
                      padding: "8px 0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="basicBilling"
                      checked={
                        basicBilling === "monthly"
                      }
                      onChange={() =>
                        setBasicBilling("monthly")
                      }
                    />{" "}
                    <strong>Monthly</strong>{" "}
                    — $15/month
                  </label>

                  <label
                    style={{
                      display: "block",
                      padding: "8px 0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="basicBilling"
                      checked={
                        basicBilling === "annual"
                      }
                      onChange={() =>
                        setBasicBilling("annual")
                      }
                    />{" "}
                    <strong>Annual</strong>{" "}
                    — $150/year
                  </label>

                </div>

                {/* SERVICES */}

                <div style={featureBox}>

                  <h3>
                    Everyday Dog Care Services
                  </h3>

                  <p>
                    🐾 ✓ Dog Profile
                  </p>

                  <p className="muted">
                    Name and breed
                  </p>

                  <p>
                    ❤️ ✓ Health Management
                  </p>

                  <p className="muted">
                    Health records and timeline
                  </p>

                  <p>
                    💉 ✓ Vaccination Management
                  </p>

                  <p className="muted">
                    Vaccines and due dates
                  </p>

                  <p>
                    💊 ✓ Medication Management
                  </p>

                  <p className="muted">
                    Medication and treatment information
                  </p>

                  <p>
                    🔄 ✓ Routine Management
                  </p>

                  <p className="muted">
                    Daily routines and care schedules
                  </p>

                  <p>
                    📅 ✓ Vet Appointment Management
                  </p>

                  <p className="muted">
                    Appointment records and vet details
                  </p>

                  <p>
                    🤖 ✓ AI Care Assistant
                  </p>

                  <p className="muted">
                    Basic dog-care questions and guidance
                  </p>

                </div>

                <button
                  style={subscribeBasic}
                  onClick={() =>
                    choosePlan(
                      "Basic",
                      basicBilling
                    )
                  }
                >
                  Subscribe to Basic →
                </button>

              </div>

              {/* ================= PREMIUM ================= */}

              <div style={premiumCard}>

                <div
                  style={{
                    position: "absolute",
                    top: "-14px",
                    right: "24px",
                    padding: "8px 16px",
                    borderRadius: "999px",
                    background: "#f59e0b",
                    color: "white",
                    fontWeight: "800",
                    fontSize: "14px",
                  }}
                >
                  ⭐ Most Popular
                </div>

                <h2
                  style={{
                    fontSize: "28px",
                    marginBottom: "4px",
                  }}
                >
                  ⭐ Premium Plan
                </h2>

                <p className="muted">
                  Complete care for your dog.
                </p>

                <hr />

                <h1>
                  $25
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "400",
                    }}
                  >
                    /month
                  </span>
                </h1>

                <p>
                  <strong>$250/year</strong>
                </p>

                <p className="muted">
                  💰 Save $50 with annual billing.
                </p>

                {/* BILLING */}

                <div style={premiumFeatureBox}>

                  <h3>
                    💳 Payment Subscription
                  </h3>

                  <label
                    style={{
                      display: "block",
                      padding: "8px 0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="premiumBilling"
                      checked={
                        premiumBilling === "monthly"
                      }
                      onChange={() =>
                        setPremiumBilling("monthly")
                      }
                    />{" "}
                    <strong>Monthly</strong>{" "}
                    — $25/month
                  </label>

                  <label
                    style={{
                      display: "block",
                      padding: "8px 0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="premiumBilling"
                      checked={
                        premiumBilling === "annual"
                      }
                      onChange={() =>
                        setPremiumBilling("annual")
                      }
                    />{" "}
                    <strong>Annual</strong>{" "}
                    — $250/year
                  </label>

                </div>

                {/* SERVICES */}

                <div style={premiumFeatureBox}>

                  <h3>
                    Advanced Dog Care Services
                  </h3>

                  <p>
                    ✓ Everything in Basic
                  </p>

                  <p>
                    🐕 ✓ Detailed Dog Profile
                  </p>

                  <p className="muted">
                    Birthday, age, gender, weight,
                    height, color and microchip
                  </p>

                  <p>
                    🩺 ✓ Advanced Health Timeline
                  </p>

                  <p className="muted">
                    Detailed health history and trends
                  </p>

                  <p>
                    📊 ✓ Weight & Health Trends
                  </p>

                  <p className="muted">
                    Track changes over time
                  </p>

                  <p>
                    🤖 ✓ Advanced AI Care Assistant
                  </p>

                  <p className="muted">
                    Personalized dog-care guidance
                  </p>

                  <p>
                    📄 ✓ AI Vet Document Scanner
                  </p>

                  <p className="muted">
                    Turn vet documents into organized records
                  </p>

                  <p>
                    🧑‍⚕️ ✓ Veterinarian Management
                  </p>

                  <p className="muted">
                    Store important veterinarian information
                  </p>

                  <p>
                    📋 ✓ Vet Visit Report
                  </p>

                  <p className="muted">
                    Create a useful summary for vet visits
                  </p>

                  <p>
                    ❤️ ✓ Dog Care Score
                  </p>

                  <p className="muted">
                    See your dog's overall care status
                  </p>

                </div>

                {/* PREMIUM BONUS */}

                <div style={bonusBox}>

                  <h3>
                    🎁 Premium Bonus Features
                  </h3>

                  <p>
                    📧{" "}
                    <strong>
                      Email Notifications
                    </strong>
                  </p>

                  <p className="muted">
                    Appointment, vaccine and medication
                    reminders.
                  </p>

                  <p>
                    📱{" "}
                    <strong>
                      Push Notifications
                    </strong>
                  </p>

                  <p className="muted">
                    Important alerts delivered to your phone.
                  </p>

                </div>

                <button
                  style={subscribePremium}
                  onClick={() =>
                    choosePlan(
                      "Premium",
                      premiumBilling
                    )
                  }
                >
                  ⭐ Subscribe to Premium →
                </button>

              </div>

              {/* ================= PRO ================= */}

              <div style={proCard}>

                <h2
                  style={{
                    fontSize: "28px",
                    marginBottom: "4px",
                  }}
                >
                  🏆 Pro Family
                </h2>

                <p className="muted">
                  Built for multi-dog families.
                </p>

                <hr />

                <h1>
                  $35
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "400",
                    }}
                  >
                    /month
                  </span>
                </h1>

                <p>
                  <strong>$350/year</strong>
                </p>

                <p className="muted">
                  💰 Save $70 with annual billing.
                </p>

                {/* BILLING */}

                <div style={proFeatureBox}>

                  <h3>
                    💳 Payment Subscription
                  </h3>

                  <label
                    style={{
                      display: "block",
                      padding: "8px 0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="proBilling"
                      checked={
                        proBilling === "monthly"
                      }
                      onChange={() =>
                        setProBilling("monthly")
                      }
                    />{" "}
                    <strong>Monthly</strong>{" "}
                    — $35/month
                  </label>

                  <label
                    style={{
                      display: "block",
                      padding: "8px 0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="proBilling"
                      checked={
                        proBilling === "annual"
                      }
                      onChange={() =>
                        setProBilling("annual")
                      }
                    />{" "}
                    <strong>Annual</strong>{" "}
                    — $350/year
                  </label>

                </div>

                {/* PRO SERVICES */}

                <div style={proFeatureBox}>

                  <h3>
                    Family & Advanced Care
                  </h3>

                  <p>
                    🐶 ✓ Everything in Premium
                  </p>

                  <p className="muted">
                    All Premium features included.
                  </p>

                  <p>
                    👨‍👩‍👧 ✓ Family & Caregiver Sharing
                  </p>

                  <p className="muted">
                    Share care information with family members.
                  </p>

                  <p>
                    📄 ✓ Unlimited Document Scanning
                  </p>

                  <p className="muted">
                    Organize more veterinary documents.
                  </p>

                  <p>
                    💰 ✓ Pet-Care Expense Tracking
                  </p>

                  <p className="muted">
                    Keep track of important care expenses.
                  </p>

                  <p>
                    🛡️ ✓ Insurance-Ready Reports
                  </p>

                  <p className="muted">
                    Prepare organized records for insurance.
                  </p>

                  <p>
                    ⚡ ✓ Priority Support
                  </p>

                  <p className="muted">
                    Get help when you need it.
                  </p>

                </div>

                <button
                  style={subscribePro}
                  onClick={() =>
                    choosePlan(
                      "Pro Family",
                      proBilling
                    )
                  }
                >
                  🏆 Subscribe to Pro →
                </button>

              </div>

            </section>

            {/* TRUST */}

            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginTop: "22px",
                padding: "18px",
                borderRadius: "18px",
                background: "#f5f9ff",
                textAlign: "center",
              }}
            >
              <div>
                🛡️
                <strong>
                  <br />
                  Secure Payment
                </strong>

                <p className="muted">
                  Your information is safe.
                </p>
              </div>

              <div>
                ❤️
                <strong>
                  <br />
                  Cancel Anytime
                </strong>

                <p className="muted">
                  No long-term commitment.
                </p>
              </div>

              <div>
                🐾
                <strong>
                  <br />
                  Made for Dog Owners
                </strong>

                <p className="muted">
                  One place for your dog's care.
                </p>
              </div>
            </section>

            {msg && (
              <p
                className="muted"
                style={{
                  textAlign: "center",
                  marginTop: "16px",
                }}
              >
                {msg}
              </p>
            )}
          </>
        )}

        <br />

        {/* DASHBOARD STATS */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >

          <div
            className="card"
            style={{
              borderRadius: "18px",
              background: "#f5efff",
            }}
          >
            <div className="stat">
              🐾 {dogs.length}
            </div>

            <strong>
              Dogs
            </strong>

            <p className="muted">
              Your furry family members
            </p>
          </div>

          <div
            className="card"
            style={{
              borderRadius: "18px",
              background: "#effcf4",
            }}
          >
            <div className="stat">
              ❤️ {healthCount}
            </div>

            <strong>
              Health Records
            </strong>

            <p className="muted">
              Keep track of health history
            </p>
          </div>

          <div
            className="card"
            style={{
              borderRadius: "18px",
              background: "#eef7ff",
            }}
          >
            <div className="stat">
              💉 {vaccineCount}
            </div>

            <strong>
              Vaccines
            </strong>

            <p className="muted">
              Stay up to date
            </p>
          </div>

          <div
            className="card"
            style={{
              borderRadius: "18px",
              background: "#f8f0ff",
              cursor: "pointer",
            }}
            onClick={() =>
            (window.location.href =
              "/ai-assistant")
            }
          >
            <div className="stat">
              🤖
            </div>

            <strong>
              AI Assistant
            </strong>

            <p className="muted">
              Get help with your dog's care →
            </p>
          </div>

        </section>

        <br />

        {/* ADD DOG + YOUR DOGS */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >

          {/* ADD DOG */}

          <form
            className="card"
            onSubmit={add}
            style={{
              borderRadius: "20px",
              background: "#f7fbff",
            }}
          >
            <h2>
              ➕ Add your dog
            </h2>

            <p className="muted">
              Start tracking your dog's health
              and care.
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
              style={{
                width: "100%",
              }}
            >
              Add dog →
            </button>

            {msg && (
              <p className="muted">
                {msg}
              </p>
            )}
          </form>

          {/* YOUR DOGS */}

          <div
            className="card"
            style={{
              borderRadius: "20px",
              background: "#ffffff",
            }}
          >
            <h2>
              🐾 Your dogs
            </h2>

            <p className="muted">
              Manage your dogs and view their profiles.
            </p>

            {dogs.length ? (
              dogs.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    padding: "14px 0",
                    borderBottom:
                      "1px solid #edf1f7",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                  (location.href =
                    `/dogs/${d.id}`)
                  }
                >
                  <div>
                    <strong>
                      🐶 {d.name}
                    </strong>

                    <p
                      className="muted"
                      style={{
                        margin: "4px 0 0",
                      }}
                    >
                      {d.breed ||
                        "Breed not set"}
                    </p>
                  </div>

                  <span className="pill">
                    View profile →
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">
                Add your first dog.
              </p>
            )}
          </div>

        </section>

      </main>
    </>
  );
}