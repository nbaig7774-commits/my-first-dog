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
  const [subscriptionStatus, setSubscriptionStatus] =
    useState("inactive");
  const [subscriptionInterval, setSubscriptionInterval] =
    useState(null);

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingDog, setSavingDog] = useState(false);
  const [msg, setMsg] = useState("");

  const [basicBilling, setBasicBilling] = useState("monthly");
  const [premiumBilling, setPremiumBilling] =
    useState("monthly");

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
      setSubscriptionPlan(
        profile.subscription_plan || "none"
      );

      setSubscriptionStatus(
        profile.subscription_status || "inactive"
      );

      setSubscriptionInterval(
        profile.subscription_interval || null
      );
    }

    const { data: dogData, error: dogsError } = await sb
      .from("dogs")
      .select(
        "id, name, breed, weight, height, vet_name, created_at"
      )
      .order("created_at", { ascending: true });

    if (dogsError) {
      setMsg(dogsError.message);
      setLoading(false);
      return;
    }

    setDogs(dogData || []);

    const [healthResult, vaccineResult] =
      await Promise.all([
        sb
          .from("health_records")
          .select(
            "id, dog_id, title, record_date, notes, created_at"
          )
          .order("record_date", { ascending: false }),

        sb
          .from("vaccinations")
          .select(
            "id, dog_id, vaccine_name, vaccination_date, due_date, status, notes, created_at"
          )
          .order("vaccination_date", {
            ascending: false,
          }),
      ]);

    setHealthRecords(
      healthResult.error
        ? []
        : healthResult.data || []
    );

    setVaccinations(
      vaccineResult.error
        ? []
        : vaccineResult.data || []
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
    }

    if (plan === "Premium") {
      setMsg(
        `Premium ${billing} selected. Premium has no free trial. Paddle checkout will be connected during payment setup.`
      );
    }
  }

  const isActive =
    subscriptionStatus === "active";

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

        <section
          style={{
            textAlign: "center",
            marginTop: "28px",
          }}
        >
          <h1>
            🐾 Choose the Best Plan for Your Dog
          </h1>

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
                  checked={
                    basicBilling === "monthly"
                  }
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
                  checked={
                    basicBilling === "annual"
                  }
                  onChange={() =>
                    setBasicBilling("annual")
                  }
                />{" "}
                Annual — $120/year
              </label>
            </div>

            <h3>Everyday Dog Care</h3>

            <p>🐾 ✓ Dog Profile</p>
            <p>❤️ ✓ Health Management</p>
            <p>💉 ✓ Vaccination Management</p>
            <p>💊 ✓ Medication Management</p>
            <p>🔄 ✓ Routine Management</p>
            <p>📅 ✓ Vet Appointment Management</p>
            <p>🤖 ✓ AI Care Assistant</p>

            <button
              className="btn primary"
              type="button"
              style={{
                width: "100%",
                marginTop: "20px",
              }}
              onClick={() =>
                selectPlan(
                  "Basic",
                  basicBilling
                )
              }
            >
              🎁 Start 3 Months Free →
            </button>
          </div>

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
                  checked={
                    premiumBilling === "monthly"
                  }
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
                  checked={
                    premiumBilling === "annual"
                  }
                  onChange={() =>
                    setPremiumBilling("annual")
                  }
                />{" "}
                Annual — $240/year
              </label>
            </div>

            <h3>Complete Dog Care</h3>

            <p>🐾 ✓ Dog Profile</p>
            <p>❤️ ✓ Health Management</p>
            <p>💉 ✓ Vaccination Management</p>
            <p>💊 ✓ Medication Management</p>
            <p>🔄 ✓ Routine Management</p>
            <p>📅 ✓ Vet Appointment Management</p>
            <p>🤖 ✓ Premium AI Care Assistant</p>
            <p>📧 ✓ Email Reminders</p>
            <p>🔔 ✓ Push Notifications</p>
            <p className="muted">
              Important dog-care reminders and alerts
            </p>
            <button
              className="btn primary"
              type="button"
              style={{
                width: "100%",
                marginTop: "20px",
              }}
              onClick={() =>
                selectPlan(
                  "Premium",
                  premiumBilling
                )
              }
            >
              ⭐ Choose Premium →
            </button>
          </div>
        </section>

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
            <div className="stat">🤖</div>

            <strong>AI Assistant</strong>

            <p className="muted">
              Get help with your dog's care →
            </p>
          </div>
        </section>

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

        {/* DOG COMPARISON */}

        <section
          className="card"
          style={{
            marginTop: "24px",
            width: "100%",
            overflowX: "auto",
          }}
        >
          <h2>🐶 Compare Your Dogs</h2>

          <p className="muted">
            Compare your dogs' health and care information side by side.
          </p>

          {dogs.length < 2 ? (
            <p
              className="muted"
              style={{
                marginTop: "16px",
              }}
            >
              Add at least two dogs to compare them.
            </p>
          ) : (
            <div
              style={{
                marginTop: "18px",
                overflowX: "auto",
                border: "1px solid #e1ebe7",
                borderRadius: "14px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: "760px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f8fafc",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "16px",
                        borderBottom:
                          "1px solid #e1ebe7",
                      }}
                    >
                      Information
                    </th>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => (
                        <th
                          key={dog.id}
                          style={{
                            textAlign: "left",
                            padding: "16px",
                            borderBottom:
                              "1px solid #e1ebe7",
                            borderLeft:
                              "1px solid #e1ebe7",
                          }}
                        >
                          🐶 {dog.name}
                        </th>
                      ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "700",
                      }}
                    >
                      🐾 Breed
                    </td>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => (
                        <td
                          key={`${dog.id}-breed`}
                          style={{
                            padding: "14px 16px",
                            borderLeft:
                              "1px solid #e1ebe7",
                          }}
                        >
                          {dog.breed || "Not set"}
                        </td>
                      ))}
                  </tr>

                  <tr
                    style={{
                      background: "#fafdfc",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "700",
                      }}
                    >
                      ⚖️ Weight
                    </td>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => (
                        <td
                          key={`${dog.id}-weight`}
                          style={{
                            padding: "14px 16px",
                            borderLeft:
                              "1px solid #e1ebe7",
                          }}
                        >
                          {dog.weight
                            ? `${dog.weight} kg`
                            : "Not recorded"}
                        </td>
                      ))}
                  </tr>

                  <tr>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "700",
                      }}
                    >
                      📏 Height
                    </td>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => (
                        <td
                          key={`${dog.id}-height`}
                          style={{
                            padding: "14px 16px",
                            borderLeft:
                              "1px solid #e1ebe7",
                          }}
                        >
                          {dog.height
                            ? `${dog.height} cm`
                            : "Not recorded"}
                        </td>
                      ))}
                  </tr>

                  <tr
                    style={{
                      background: "#fafdfc",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "700",
                      }}
                    >
                      🩺 Vet
                    </td>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => (
                        <td
                          key={`${dog.id}-vet`}
                          style={{
                            padding: "14px 16px",
                            borderLeft:
                              "1px solid #e1ebe7",
                          }}
                        >
                          {dog.vet_name || "Not set"}
                        </td>
                      ))}
                  </tr>

                  <tr>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "700",
                      }}
                    >
                      ❤️ Health Records
                    </td>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => {
                        const count =
                          healthRecords.filter(
                            (record) =>
                              record.dog_id === dog.id
                          ).length;

                        return (
                          <td
                            key={`${dog.id}-health`}
                            style={{
                              padding: "14px 16px",
                              borderLeft:
                                "1px solid #e1ebe7",
                            }}
                          >
                            {count}
                          </td>
                        );
                      })}
                  </tr>

                  <tr
                    style={{
                      background: "#fafdfc",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "700",
                      }}
                    >
                      💉 Vaccines
                    </td>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => {
                        const count =
                          vaccinations.filter(
                            (vaccine) =>
                              vaccine.dog_id === dog.id
                          ).length;

                        return (
                          <td
                            key={`${dog.id}-vaccines`}
                            style={{
                              padding: "14px 16px",
                              borderLeft:
                                "1px solid #e1ebe7",
                            }}
                          >
                            {count}
                          </td>
                        );
                      })}
                  </tr>

                  <tr>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "700",
                      }}
                    >
                      📅 Next Vaccine Due
                    </td>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => {
                        const dogVaccines =
                          vaccinations
                            .filter(
                              (vaccine) =>
                                vaccine.dog_id ===
                                dog.id &&
                                vaccine.due_date
                            )
                            .sort(
                              (a, b) =>
                                new Date(
                                  a.due_date
                                ) -
                                new Date(
                                  b.due_date
                                )
                            );

                        const nextVaccine =
                          dogVaccines[0];

                        return (
                          <td
                            key={`${dog.id}-next-vaccine`}
                            style={{
                              padding: "14px 16px",
                              borderLeft:
                                "1px solid #e1ebe7",
                            }}
                          >
                            {nextVaccine
                              ? new Date(
                                nextVaccine.due_date
                              ).toLocaleDateString()
                              : "None scheduled"}
                          </td>
                        );
                      })}
                  </tr>

                  <tr
                    style={{
                      background: "#fafdfc",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "700",
                      }}
                    >
                      📅 Vet Appointments
                    </td>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => (
                        <td
                          key={`${dog.id}-appointments`}
                          style={{
                            padding: "14px 16px",
                            borderLeft:
                              "1px solid #e1ebe7",
                          }}
                        >
                          <button
                            className="btn"
                            type="button"
                            onClick={() =>
                              router.push(
                                `/appointments?dog=${dog.id}`
                              )
                            }
                          >
                            View appointments →
                          </button>
                        </td>
                      ))}
                  </tr>

                  <tr>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "700",
                      }}
                    >
                      👤 Profile
                    </td>

                    {dogs
                      .slice(0, 2)
                      .map((dog) => (
                        <td
                          key={`${dog.id}-profile`}
                          style={{
                            padding: "14px 16px",
                            borderLeft:
                              "1px solid #e1ebe7",
                          }}
                        >
                          <button
                            className="btn"
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dogs/${dog.id}`
                              )
                            }
                          >
                            View profile →
                          </button>
                        </td>
                      ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {dogs.length > 2 && (
            <p
              className="muted"
              style={{
                marginTop: "14px",
              }}
            >
              Showing the first two dogs. Additional dogs can be
              managed from the Your Dogs section above.
            </p>
          )}
        </section>
      </main>
    </>
  );
}