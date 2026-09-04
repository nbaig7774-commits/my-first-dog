"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase.js";

export default function Home() {
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [healthCount, setHealthCount] = useState(0);
  const [vaccineCount, setVaccineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const basicFeatures = [
    ["🐾", "Dog Profile", "Name and breed"],
    ["❤️", "Health Management", "Health records and timeline"],
    ["💉", "Vaccination Management", "Vaccines and due dates"],
    ["💊", "Medication Management", "Medication and treatment information"],
    ["🔄", "Routine Management", "Daily routines and care schedules"],
    ["📅", "Vet Appointment Management", "Appointment records and vet details"],
    ["🤖", "AI Care Assistant", "Basic dog-care questions and guidance"],
  ];

  const premiumFeatures = [
    ["🐕", "Detailed Dog Profile", "Birthday, age, gender, weight, height, color and microchip"],
    ["🩺", "Advanced Health Timeline", "Detailed health history and trends"],
    ["📊", "Weight & Health Trends", "Track changes over time"],
    ["🤖", "Advanced AI Care Assistant", "Personalized dog-care guidance"],
    ["📄", "AI Vet Document Scanner", "Turn vet documents into organized records"],
    ["🧑‍⚕️", "Veterinarian Management", "Store important veterinarian information"],
    ["📋", "Vet Visit Report", "Create a useful summary for vet visits"],
    ["❤️", "Dog Care Score", "See your dog's overall care status"],
  ];

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUser(user || null);

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        setProfile(profileData || null);

        const { data: dogsData } = await supabase
          .from("dogs")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        const dogList = dogsData || [];
        setDogs(dogList);

        if (dogList.length > 0) {
          const dogIds = dogList.map((dog) => dog.id);

          const { count: healthCountData } = await supabase
            .from("health_records")
            .select("*", { count: "exact", head: true })
            .in("dog_id", dogIds);

          const { count: vaccineCountData } = await supabase
            .from("vaccinations")
            .select("*", { count: "exact", head: true })
            .in("dog_id", dogIds);

          setHealthCount(healthCountData || 0);
          setVaccineCount(vaccineCountData || 0);
        }
      } catch (error) {
        console.error("HOME PAGE ERROR:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const isLoggedIn = !!user;

  const subscriptionPlan =
    profile?.subscription_plan?.toLowerCase() || "";

  const subscriptionStatus =
    profile?.subscription_status?.toLowerCase() || "";

  const isPremium =
    subscriptionPlan === "premium" &&
    subscriptionStatus === "active";

  return (
    <>
      {/* ===================================================== */}
      {/* NAVIGATION */}
      {/* ===================================================== */}

      <nav
        className="nav"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div
          className="brand"
          style={{
            fontWeight: "800",
            fontSize: "20px",
          }}
        >
          🐶 My First Dog
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          {isLoggedIn ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/health">Health</Link>
              <Link href="/weight">⚖️ Weight</Link>
              <Link href="/medications">Medications</Link>
              <Link href="/vaccinations">Vaccinations</Link>
              <Link href="/routines">Routines</Link>
              <Link href="/appointments">Appointments</Link>
              <Link href="/ai-assistant">🤖 AI Assistant</Link>

              <button
                type="button"
                onClick={handleLogout}
                className="btn"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>

              <Link
                className="btn primary"
                href="/login"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="container">

        {/* ===================================================== */}
        {/* HERO */}
        {/* ===================================================== */}

        <section
          className="hero"
          style={{
            textAlign: "center",
            paddingTop: "55px",
            paddingBottom: "45px",
          }}
        >
          <span className="pill">
            🐾 Your dog's complete care manager
          </span>

          <h1
            style={{
              fontSize: "46px",
              fontWeight: "800",
              marginTop: "20px",
            }}
          >
            Everything you need to care
            for your dog.
          </h1>

          <p
            className="muted"
            style={{
              fontSize: "19px",
              maxWidth: "720px",
              margin: "0 auto 24px",
            }}
          >
            Keep your dog's health records,
            vaccinations, medications, routines
            and vet appointments organized in one
            simple place.
          </p>

          <Link
            className="btn primary"
            href={isLoggedIn ? "/dashboard" : "/login"}
          >
            {isLoggedIn ? "Go to Dashboard →" : "Get Started →"}
          </Link>
        </section>

        {/* ===================================================== */}
        {/* LOGGED-IN DASHBOARD SUMMARY */}
        {/* ===================================================== */}

        {isLoggedIn && (
          <section
            style={{
              marginBottom: "45px",
            }}
          >
            <div
              className="card"
              style={{
                borderRadius: "20px",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <h2>
                👋 Welcome back
              </h2>

              <p className="muted">
                Your dog's care at a glance.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginTop: "15px",
                }}
              >
                <div>
                  <strong>
                    {isPremium
                      ? "⭐ Premium Plan"
                      : "🐶 Basic Plan"}
                  </strong>

                  <p
                    className="muted"
                    style={{
                      margin: "5px 0 0",
                    }}
                  >
                    {isPremium
                      ? "Your Premium subscription is active."
                      : "Your Basic dog-care plan is active."}
                  </p>
                </div>

                <Link
                  className="btn"
                  href="/dashboard"
                >
                  Open Dashboard →
                </Link>
              </div>
            </div>

            {/* STATS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
              }}
            >
              <div
                className="card"
                style={{
                  textAlign: "center",
                  borderRadius: "18px",
                }}
              >
                <div style={{ fontSize: "30px" }}>
                  🐾
                </div>

                <h2>{dogs.length}</h2>

                <strong>Dogs</strong>

                <p className="muted">
                  Your furry family members
                </p>
              </div>

              <div
                className="card"
                style={{
                  textAlign: "center",
                  borderRadius: "18px",
                }}
              >
                <div style={{ fontSize: "30px" }}>
                  ❤️
                </div>

                <h2>{healthCount}</h2>

                <strong>Health Records</strong>

                <p className="muted">
                  Keep track of health history
                </p>
              </div>

              <div
                className="card"
                style={{
                  textAlign: "center",
                  borderRadius: "18px",
                }}
              >
                <div style={{ fontSize: "30px" }}>
                  💉
                </div>

                <h2>{vaccineCount}</h2>

                <strong>Vaccines</strong>

                <p className="muted">
                  Stay up to date
                </p>
              </div>

              <Link
                href="/ai-assistant"
                className="card"
                style={{
                  textAlign: "center",
                  borderRadius: "18px",
                  textDecoration: "none",
                }}
              >
                <div style={{ fontSize: "30px" }}>
                  🤖
                </div>

                <h2>AI</h2>

                <strong>AI Assistant</strong>

                <p className="muted">
                  Get help with your dog's care →
                </p>
              </Link>
            </div>

            {/* ADD DOG */}

            <div
              className="card"
              style={{
                marginTop: "20px",
                borderRadius: "18px",
                textAlign: "center",
              }}
            >
              <h2>
                ➕ Add your dog
              </h2>

              <p className="muted">
                Start tracking your dog's health and care.
              </p>

              <Link
                className="btn primary"
                href="/dashboard"
              >
                Add dog →
              </Link>
            </div>

            {/* YOUR DOGS */}

            <div style={{ marginTop: "25px" }}>
              <h2>
                🐾 Your dogs
              </h2>

              <p className="muted">
                Manage your dogs and view their profiles.
              </p>

              {dogs.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "15px",
                  }}
                >
                  {dogs.map((dog) => (
                    <div
                      className="card"
                      key={dog.id}
                      style={{
                        borderRadius: "18px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "32px",
                        }}
                      >
                        🐶
                      </div>

                      <h3>
                        {dog.name}
                      </h3>

                      <p className="muted">
                        {dog.breed || "Dog"}
                      </p>

                      <Link
                        className="btn"
                        href={`/dogs/${dog.id}`}
                      >
                        View profile →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="card"
                  style={{
                    borderRadius: "18px",
                  }}
                >
                  <p className="muted">
                    You haven't added a dog yet.
                  </p>

                  <Link
                    className="btn primary"
                    href="/dashboard"
                  >
                    Add your first dog →
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===================================================== */}
        {/* FEATURES */}
        {/* ===================================================== */}

        <section>
          <h2
            style={{
              textAlign: "center",
              fontSize: "30px",
              marginBottom: "20px",
            }}
          >
            🐶 Everything in One Place
          </h2>

          <div className="grid">
            {[
              [
                "🩺",
                "Health",
                "Organize your dog's health records.",
              ],
              [
                "💊",
                "Medications",
                "Keep medication information organized.",
              ],
              [
                "💉",
                "Vaccinations",
                "Track vaccines and due dates.",
              ],
              [
                "🐾",
                "Routines",
                "Manage daily care routines.",
              ],
              [
                "📅",
                "Appointments",
                "Keep track of vet appointments.",
              ],
              [
                "🤖",
                "AI Care Assistant",
                "Get helpful dog-care guidance.",
              ],
            ].map((x) => (
              <div
                className="card"
                key={x[1]}
                style={{
                  borderRadius: "18px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "36px",
                    marginBottom: "8px",
                  }}
                >
                  {x[0]}
                </div>

                <h3>{x[1]}</h3>

                <p className="muted">
                  {x[2]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <br />

        {/* ===================================================== */}
        {/* PRICING */}
        {/* ===================================================== */}

        <section>
          <div
            style={{
              textAlign: "center",
              marginBottom: "30px",
            }}
          >
            <h2
              style={{
                fontSize: "36px",
                fontWeight: "800",
              }}
            >
              Choose the Best Plan for Your Dog
            </h2>

            <p className="muted">
              Simple. Flexible. Complete.
            </p>
          </div>

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "22px",
              alignItems: "stretch",
            }}
          >

            {/* ================================================= */}
            {/* BASIC */}
            {/* ================================================= */}

            <div
              className="card"
              style={{
                border: "2px solid #dbeafe",
                borderRadius: "24px",
                padding: "26px",
                background:
                  "linear-gradient(180deg, #f3f9ff 0%, #ffffff 38%)",
                boxShadow:
                  "0 14px 35px rgba(30, 100, 180, 0.12)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h2>🐶 Basic</h2>

              <p className="muted">
                Perfect for everyday dog care.
              </p>

              <div
                style={{
                  padding: "14px",
                  borderRadius: "14px",
                  background: "#e8f4ff",
                  marginTop: "10px",
                  textAlign: "center",
                }}
              >
                <strong
                  style={{
                    fontSize: "22px",
                  }}
                >
                  🎁 3 MONTHS FREE
                </strong>

                <p
                  style={{
                    marginBottom: 0,
                  }}
                >
                  New customers get Basic free
                  for their first 3 months.
                </p>
              </div>

              <hr />

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

              <p>
                <strong>$120/year</strong>
              </p>

              <p className="muted">
                After the free trial:
                $10/month or $120/year.
              </p>

              <h3>
                Everyday Dog Care
              </h3>

              {basicFeatures.map((feature) => (
                <div
                  key={feature[1]}
                  style={{
                    marginTop: "15px",
                  }}
                >
                  <strong>
                    {feature[0]} ✓ {feature[1]}
                  </strong>

                  <p
                    className="muted"
                    style={{
                      margin: "4px 0 0",
                    }}
                  >
                    {feature[2]}
                  </p>
                </div>
              ))}

              <Link
                className="btn primary"
                href="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: "25px",
                }}
              >
                🎁 Start 3 Months Free →
              </Link>
            </div>

            {/* ================================================= */}
            {/* PREMIUM */}
            {/* ================================================= */}

            <div
              className="card"
              style={{
                border: "2px solid #f5b942",
                borderRadius: "24px",
                padding: "26px",
                background:
                  "linear-gradient(180deg, #fff9e9 0%, #ffffff 38%)",
                boxShadow:
                  "0 18px 42px rgba(230, 150, 20, 0.18)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-14px",
                  right: "20px",
                  padding: "8px 15px",
                  borderRadius: "999px",
                  background: "#f59e0b",
                  color: "white",
                  fontWeight: "800",
                  fontSize: "13px",
                }}
              >
                ⭐ Most Popular
              </div>

              <h2>⭐ Premium</h2>

              <p className="muted">
                Complete care for your dog.
              </p>

              <hr />

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

              <p>
                <strong>$240/year</strong>
              </p>

              <p className="muted">
                No free trial.
              </p>

              <h3>
                Advanced Dog Care
              </h3>

              <p>
                ✓ Everything in Basic
              </p>

              {premiumFeatures.map((feature) => (
                <div
                  key={feature[1]}
                  style={{
                    marginTop: "15px",
                  }}
                >
                  <strong>
                    {feature[0]} ✓ {feature[1]}
                  </strong>

                  <p
                    className="muted"
                    style={{
                      margin: "4px 0 0",
                    }}
                  >
                    {feature[2]}
                  </p>
                </div>
              ))}

              {/* PREMIUM BONUS */}

              <div
                style={{
                  marginTop: "22px",
                  padding: "17px",
                  borderRadius: "16px",
                  background:
                    "linear-gradient(135deg, #fff0f7, #fff8ec)",
                  border:
                    "1px solid #f5d5e5",
                }}
              >
                <h3>
                  🎁 Premium Bonuses
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
                  Important alerts delivered to your
                  phone.
                </p>
              </div>

              <Link
                className="btn primary"
                href="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: "25px",
                }}
              >
                ⭐ Get Premium →
              </Link>
            </div>
          </section>
        </section>

        <br />

        {/* ===================================================== */}
        {/* TRUST */}
        {/* ===================================================== */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            padding: "20px",
            borderRadius: "18px",
            background: "#f5f9ff",
            textAlign: "center",
          }}
        >
          <div>
            🛡️
            <br />

            <strong>
              Secure Payment
            </strong>

            <p className="muted">
              Your information is protected.
            </p>
          </div>

          <div>
            ❤️
            <br />

            <strong>
              Cancel Anytime
            </strong>

            <p className="muted">
              No long-term commitment.
            </p>
          </div>

          <div>
            🐾
            <br />

            <strong>
              Made for Dog Owners
            </strong>

            <p className="muted">
              One place for your dog's care.
            </p>
          </div>
        </section>

        <br />

        {/* ===================================================== */}
        {/* FINAL CTA */}
        {/* ===================================================== */}

        <section
          className="hero"
          style={{
            textAlign: "center",
          }}
        >
          <h2>
            Ready to give your dog better care?
          </h2>

          <p className="muted">
            Choose the plan that fits your dog's needs.
          </p>

          <Link
            className="btn primary"
            href={isLoggedIn ? "/dashboard" : "/login"}
          >
            {isLoggedIn
              ? "Go to Dashboard →"
              : "Get Started →"}
          </Link>
        </section>

      </main>
    </>
  );
}