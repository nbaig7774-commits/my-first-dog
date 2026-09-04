"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";
import { hasPremiumAccess } from "../../lib/planAccess";

export default function HealthPage() {
  const sb = createClient();
  const router = useRouter();

  const [dogs, setDogs] = useState([]);
  const [dogId, setDogId] = useState("");

  const [healthRecords, setHealthRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [medications, setMedications] = useState([]);
  const [weightRecords, setWeightRecords] = useState([]);

  const [subscriptionPlan, setSubscriptionPlan] =
    useState("none");

  const [subscriptionStatus, setSubscriptionStatus] =
    useState("inactive");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMsg("");

    try {
      const {
        data: { user },
      } = await sb.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      /* ==============================
         SUBSCRIPTION
      ============================== */

      const profileResult = await sb
        .from("profiles")
        .select(
          "subscription_plan, subscription_status"
        )
        .eq("id", user.id)
        .single();

      if (
        !profileResult.error &&
        profileResult.data
      ) {
        setSubscriptionPlan(
          profileResult.data.subscription_plan ||
          "none"
        );

        setSubscriptionStatus(
          profileResult.data.subscription_status ||
          "inactive"
        );
      }

      /* ==============================
         DOGS
      ============================== */

      const {
        data: dogData,
        error: dogError,
      } = await sb
        .from("dogs")
        .select(
          "id, name, breed, gender, date_of_birth, birthday, color, height, weight, microchip_number, vet_name, vet_phone, created_at, updated_at"
        )
        .order("created_at", {
          ascending: true,
        });

      if (dogError) {
        throw new Error(
          dogError.message
        );
      }

      const allDogs = dogData || [];

      setDogs(allDogs);

      let selectedDogId = dogId;

      if (!selectedDogId && allDogs.length > 0) {
        selectedDogId = allDogs[0].id;
      }

      setDogId(selectedDogId || "");

      if (!selectedDogId) {
        setHealthRecords([]);
        setVaccinations([]);
        setMedications([]);
        setWeightRecords([]);
        return;
      }

      /* ==============================
         HEALTH RECORDS
      ============================== */

      const healthResult = await sb
        .from("health_records")
        .select(
          "id, dog_id, title, record_date, notes, created_at"
        )
        .eq(
          "dog_id",
          selectedDogId
        )
        .order("record_date", {
          ascending: false,
        });

      if (healthResult.error) {
        console.error(
          "Health records:",
          healthResult.error.message
        );

        setHealthRecords([]);
      } else {
        setHealthRecords(
          healthResult.data || []
        );
      }

      /* ==============================
         VACCINATIONS
      ============================== */

      const vaccinationResult = await sb
        .from("vaccinations")
        .select(
          "id, dog_id, vaccine_name, vaccination_date, due_date, status, notes, created_at"
        )
        .eq(
          "dog_id",
          selectedDogId
        )
        .order("vaccination_date", {
          ascending: false,
        });

      if (vaccinationResult.error) {
        console.error(
          "Vaccinations:",
          vaccinationResult.error.message
        );

        setVaccinations([]);
      } else {
        setVaccinations(
          vaccinationResult.data || []
        );
      }

      /* ==============================
         MEDICATIONS
      ============================== */

      const medicationResult = await sb
        .from("medications")
        .select("*")
        .eq(
          "dog_id",
          selectedDogId
        );

      if (medicationResult.error) {
        console.error(
          "Medications:",
          medicationResult.error.message
        );

        setMedications([]);
      } else {
        setMedications(
          medicationResult.data || []
        );
      }

      /* ==============================
         WEIGHT
      ============================== */

      const weightResult = await sb
        .from("dog_weight_records")
        .select(
          "id, dog_id, weight, recorded_at, notes, created_at"
        )
        .eq(
          "dog_id",
          selectedDogId
        )
        .order("recorded_at", {
          ascending: false,
        });

      if (weightResult.error) {
        console.error(
          "Weight:",
          weightResult.error.message
        );

        setWeightRecords([]);
      } else {
        setWeightRecords(
          weightResult.data || []
        );
      }

    } catch (error) {
      console.error(
        "Health page error:",
        error
      );

      setMsg(
        error.message ||
        "Unable to load health information."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==============================
     PREMIUM ACCESS
  ============================== */

  const isPremium =
    subscriptionStatus === "active" &&
    hasPremiumAccess(subscriptionPlan);

  /* ==============================
     SELECTED DOG
  ============================== */

  const selectedDog = dogs.find(
    (dog) => dog.id === dogId
  );

  /* ==============================
     CHANGE DOG
  ============================== */

  async function changeDog(newDogId) {
    setDogId(newDogId);

    router.replace(
      `/health?dog=${newDogId}`
    );

    setLoading(true);

    try {
      const [
        healthResult,
        vaccinationResult,
        medicationResult,
        weightResult,
      ] = await Promise.all([
        sb
          .from("health_records")
          .select(
            "id, dog_id, title, record_date, notes, created_at"
          )
          .eq(
            "dog_id",
            newDogId
          )
          .order("record_date", {
            ascending: false,
          }),

        sb
          .from("vaccinations")
          .select(
            "id, dog_id, vaccine_name, vaccination_date, due_date, status, notes, created_at"
          )
          .eq(
            "dog_id",
            newDogId
          )
          .order("vaccination_date", {
            ascending: false,
          }),

        sb
          .from("medications")
          .select("*")
          .eq(
            "dog_id",
            newDogId
          ),

        sb
          .from("dog_weight_records")
          .select(
            "id, dog_id, weight, recorded_at, notes, created_at"
          )
          .eq(
            "dog_id",
            newDogId
          )
          .order("recorded_at", {
            ascending: false,
          }),
      ]);

      setHealthRecords(
        healthResult.data || []
      );

      setVaccinations(
        vaccinationResult.data || []
      );

      setMedications(
        medicationResult.data || []
      );

      setWeightRecords(
        weightResult.data || []
      );

    } catch (error) {
      setMsg(
        error.message ||
        "Unable to change dog."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==============================
     HEALTH SUMMARY
  ============================== */

  const healthSummary = useMemo(() => {
    const completedVaccines =
      vaccinations.filter(
        (vaccine) =>
          vaccine.status ===
          "Complete"
      ).length;

    const upcomingVaccines =
      vaccinations.filter(
        (vaccine) =>
          vaccine.status ===
          "Upcoming"
      ).length;

    const dueSoonVaccines =
      vaccinations.filter(
        (vaccine) =>
          vaccine.status ===
          "Due soon"
      ).length;

    const latestWeight =
      weightRecords.length > 0
        ? Number(
          weightRecords[0].weight
        )
        : null;

    const previousWeight =
      weightRecords.length > 1
        ? Number(
          weightRecords[1].weight
        )
        : null;

    const weightChange =
      latestWeight !== null &&
        previousWeight !== null
        ? latestWeight -
        previousWeight
        : null;

    return {
      healthRecords:
        healthRecords.length,

      vaccinations:
        vaccinations.length,

      completedVaccines,

      upcomingVaccines,

      dueSoonVaccines,

      medications:
        medications.length,

      weightRecords:
        weightRecords.length,

      latestWeight,

      previousWeight,

      weightChange,
    };
  }, [
    healthRecords,
    vaccinations,
    medications,
    weightRecords,
  ]);

  /* ==============================
     DOG AGE
  ============================== */

  function calculateAge(dateString) {
    if (!dateString) {
      return null;
    }

    const birthDate =
      new Date(dateString);

    if (
      Number.isNaN(
        birthDate.getTime()
      )
    ) {
      return null;
    }

    const today =
      new Date();

    let years =
      today.getFullYear() -
      birthDate.getFullYear();

    let months =
      today.getMonth() -
      birthDate.getMonth();

    if (
      today.getDate() <
      birthDate.getDate()
    ) {
      months--;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return {
      years,
      months,
    };
  }

  const dogAge =
    calculateAge(
      selectedDog?.date_of_birth ||
      selectedDog?.birthday
    );

  /* ==============================
     TREND MESSAGE
  ============================== */

  function getWeightMessage() {
    const change =
      healthSummary.weightChange;

    if (change === null) {
      return "Add more weight records to monitor changes.";
    }

    if (change > 0) {
      return `Weight increased by ${change.toFixed(
        2
      )} kg since the previous measurement.`;
    }

    if (change < 0) {
      return `Weight decreased by ${Math.abs(
        change
      ).toFixed(
        2
      )} kg since the previous measurement.`;
    }

    return "Weight is unchanged from the previous measurement.";
  }

  /* ==============================
     PAGE
  ============================== */

  return (
    <>
      <Sidebar />

      <main className="container">

        <button
          className="btn"
          type="button"
          onClick={() =>
            router.push(
              selectedDog
                ? `/dogs/${selectedDog.id}`
                : "/dashboard"
            )
          }
        >
          ← Back to Dog Profile
        </button>

        <br />

        <h1>
          ❤️ Health & Medical Insights
        </h1>

        <p className="muted">
          Review your dog's health history,
          vaccinations, medications and
          weight information in one place.
        </p>

        {/* ==========================
                    DOG SELECTOR
                ========================== */}

        <section className="card">

          <h2>
            🐶 Select Dog
          </h2>

          {loading &&
            dogs.length === 0 ? (
            <p className="muted">
              Loading dogs...
            </p>
          ) : dogs.length === 0 ? (
            <p className="muted">
              Please add a dog first.
            </p>
          ) : (
            <select
              className="input"
              value={dogId}
              onChange={(event) =>
                changeDog(
                  event.target.value
                )
              }
            >
              {dogs.map(
                (dog) => (
                  <option
                    key={
                      dog.id
                    }
                    value={
                      dog.id
                    }
                  >
                    🐶{" "}
                    {
                      dog.name
                    }
                    {" "}
                    —{" "}
                    {
                      dog.breed ||
                      "Unknown breed"
                    }
                  </option>
                )
              )}
            </select>
          )}

          {selectedDog && (
            <p className="muted">
              Health information for{" "}
              <strong>
                {
                  selectedDog.name
                }
              </strong>
              .
            </p>
          )}

        </section>

        <br />

        {/* ==========================
                    PREMIUM FEATURE
                ========================== */}

        <section
          className="card"
          style={{
            borderRadius:
              "20px",
            background:
              isPremium
                ? "#f7fbff"
                : "#fff8e8",
            border:
              isPremium
                ? "1px solid #cfe5ff"
                : "1px solid #f5c451",
          }}
        >

          <h2>
            📊 Health Overview
          </h2>

          {!isPremium ? (
            <>
              <p>
                🔒 Premium Feature
              </p>

              <p className="muted">
                Upgrade to Premium to
                unlock the complete
                health and medical
                overview.
              </p>

              <p>
                ❤️ Health history
              </p>

              <p>
                💉 Vaccination overview
              </p>

              <p>
                💊 Medication overview
              </p>

              <p>
                ⚖️ Weight trends
              </p>

              <p>
                📈 Health monitoring
              </p>

              <button
                className="btn primary"
                type="button"
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
              >
                ⭐ Upgrade to Premium →
              </button>
            </>
          ) : (
            <>
              {/* ==================
                                DOG INFORMATION
                            ================== */}

              {selectedDog && (
                <div
                  style={{
                    marginTop:
                      "18px",
                    padding:
                      "18px",
                    borderRadius:
                      "16px",
                    background:
                      "#ffffff",
                  }}
                >

                  <h3>
                    🐶{" "}
                    {
                      selectedDog.name
                    }
                  </h3>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(160px, 1fr))",
                      gap:
                        "12px",
                    }}
                  >

                    <div>
                      <strong>
                        Breed
                      </strong>

                      <p className="muted">
                        {
                          selectedDog.breed ||
                          "—"
                        }
                      </p>
                    </div>

                    <div>
                      <strong>
                        Gender
                      </strong>

                      <p className="muted">
                        {
                          selectedDog.gender ||
                          "—"
                        }
                      </p>
                    </div>

                    <div>
                      <strong>
                        Age
                      </strong>

                      <p className="muted">
                        {dogAge
                          ? `${dogAge.years} years, ${dogAge.months} months`
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <strong>
                        Color
                      </strong>

                      <p className="muted">
                        {
                          selectedDog.color ||
                          "—"
                        }
                      </p>
                    </div>

                    <div>
                      <strong>
                        Height
                      </strong>

                      <p className="muted">
                        {
                          selectedDog.height ||
                          "—"
                        }
                      </p>
                    </div>

                    <div>
                      <strong>
                        Microchip
                      </strong>

                      <p className="muted">
                        {
                          selectedDog.microchip_number ||
                          "—"
                        }
                      </p>
                    </div>

                  </div>

                </div>
              )}

              {/* ==================
                                HEALTH STATS
                            ================== */}

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap:
                    "14px",
                  marginTop:
                    "18px",
                }}
              >

                <div
                  className="card"
                  style={{
                    margin: 0,
                    background:
                      "#ffffff",
                  }}
                >
                  <div className="stat">
                    ❤️{" "}
                    {
                      healthSummary.healthRecords
                    }
                  </div>

                  <strong>
                    Health Records
                  </strong>

                  <p className="muted">
                    Medical history
                  </p>
                </div>

                <div
                  className="card"
                  style={{
                    margin: 0,
                    background:
                      "#ffffff",
                  }}
                >
                  <div className="stat">
                    💉{" "}
                    {
                      healthSummary.vaccinations
                    }
                  </div>

                  <strong>
                    Vaccinations
                  </strong>

                  <p className="muted">
                    Total vaccine records
                  </p>
                </div>

                <div
                  className="card"
                  style={{
                    margin: 0,
                    background:
                      "#ffffff",
                  }}
                >
                  <div className="stat">
                    💊{" "}
                    {
                      healthSummary.medications
                    }
                  </div>

                  <strong>
                    Medications
                  </strong>

                  <p className="muted">
                    Medication records
                  </p>
                </div>

                <div
                  className="card"
                  style={{
                    margin: 0,
                    background:
                      "#ffffff",
                  }}
                >
                  <div className="stat">
                    ⚖️{" "}
                    {healthSummary.latestWeight !==
                      null
                      ? `${healthSummary.latestWeight} kg`
                      : "—"}
                  </div>

                  <strong>
                    Current Weight
                  </strong>

                  <p className="muted">
                    Latest measurement
                  </p>
                </div>

              </div>

              {/* ==================
                                VACCINATION STATUS
                            ================== */}

              <div
                style={{
                  marginTop:
                    "18px",
                  padding:
                    "18px",
                  borderRadius:
                    "16px",
                  background:
                    "#ffffff",
                }}
              >

                <h3>
                  💉 Vaccination Status
                </h3>

                <p>
                  ✅ Complete:{" "}
                  {
                    healthSummary.completedVaccines
                  }
                </p>

                <p>
                  📅 Upcoming:{" "}
                  {
                    healthSummary.upcomingVaccines
                  }
                </p>

                <p>
                  ⚠️ Due soon:{" "}
                  {
                    healthSummary.dueSoonVaccines
                  }
                </p>

              </div>

              {/* ==================
                                WEIGHT INSIGHT
                            ================== */}

              <div
                style={{
                  marginTop:
                    "18px",
                  padding:
                    "18px",
                  borderRadius:
                    "16px",
                  background:
                    "#ffffff",
                }}
              >

                <h3>
                  ⚖️ Weight Insight
                </h3>

                <p>
                  {getWeightMessage()}
                </p>

                <p className="muted">
                  Weight information is
                  intended for monitoring
                  and record keeping.
                </p>

                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    router.push(
                      dogId
                        ? `/weight?dog=${dogId}`
                        : "/weight"
                    )
                  }
                >
                  📈 View Weight Trends →
                </button>

              </div>

              {/* ==================
                                VET INFORMATION
                            ================== */}

              <div
                style={{
                  marginTop:
                    "18px",
                  padding:
                    "18px",
                  borderRadius:
                    "16px",
                  background:
                    "#ffffff",
                }}
              >

                <h3>
                  🩺 Veterinarian
                </h3>

                <p>
                  <strong>
                    Name:
                  </strong>{" "}
                  {
                    selectedDog?.vet_name ||
                    "Not provided"
                  }
                </p>

                <p>
                  <strong>
                    Phone:
                  </strong>{" "}
                  {
                    selectedDog?.vet_phone ||
                    "Not provided"
                  }
                </p>

              </div>

            </>
          )}

        </section>

        <br />

        {/* ==========================
                    RECENT HEALTH RECORDS
                ========================== */}

        <section className="card">

          <h2>
            ❤️ Recent Health Records
          </h2>

          {loading ? (
            <p className="muted">
              Loading...
            </p>
          ) : healthRecords.length ===
            0 ? (
            <p className="muted">
              No health records found
              for this dog.
            </p>
          ) : (
            healthRecords
              .slice(0, 10)
              .map(
                (record) => (
                  <div
                    key={
                      record.id
                    }
                    className="card"
                    style={{
                      marginTop:
                        "12px",
                      background:
                        "#f9fbff",
                    }}
                  >

                    <h3>
                      ❤️{" "}
                      {
                        record.title
                      }
                    </h3>

                    <p>
                      📅{" "}
                      {
                        record.record_date
                      }
                    </p>

                    {record.notes && (
                      <p>
                        📝{" "}
                        {
                          record.notes
                        }
                      </p>
                    )}

                  </div>
                )
              )
          )}

        </section>

        <br />

        {/* ==========================
                    VACCINATION RECORDS
                ========================== */}

        <section className="card">

          <h2>
            💉 Vaccinations
          </h2>

          {loading ? (
            <p className="muted">
              Loading...
            </p>
          ) : vaccinations.length ===
            0 ? (
            <p className="muted">
              No vaccination records
              found.
            </p>
          ) : (
            vaccinations
              .slice(0, 10)
              .map(
                (vaccine) => (
                  <div
                    key={
                      vaccine.id
                    }
                    className="card"
                    style={{
                      marginTop:
                        "12px",
                      background:
                        "#f9fbff",
                    }}
                  >

                    <h3>
                      💉{" "}
                      {
                        vaccine.vaccine_name
                      }
                    </h3>

                    <p>
                      📅 Vaccinated:{" "}
                      {
                        vaccine.vaccination_date ||
                        "—"
                      }
                    </p>

                    <p>
                      📌 Status:{" "}
                      {
                        vaccine.status ||
                        "—"
                      }
                    </p>

                    {vaccine.due_date && (
                      <p>
                        ⏰ Due:{" "}
                        {
                          vaccine.due_date
                        }
                      </p>
                    )}

                  </div>
                )
              )
          )}

        </section>

        <br />

        {/* ==========================
                    MEDICATIONS
                ========================== */}

        <section className="card">

          <h2>
            💊 Medications
          </h2>

          {loading ? (
            <p className="muted">
              Loading...
            </p>
          ) : medications.length ===
            0 ? (
            <p className="muted">
              No medication records
              found.
            </p>
          ) : (
            medications
              .slice(0, 10)
              .map(
                (medication) => (
                  <div
                    key={
                      medication.id
                    }
                    className="card"
                    style={{
                      marginTop:
                        "12px",
                      background:
                        "#f9fbff",
                    }}
                  >

                    <h3>
                      💊{" "}
                      {
                        medication.name
                      }
                    </h3>

                    {medication.schedule && (
                      <p>
                        🕐{" "}
                        {
                          medication.schedule
                        }
                      </p>
                    )}

                    {medication.notes && (
                      <p>
                        📝{" "}
                        {
                          medication.notes
                        }
                      </p>
                    )}

                  </div>
                )
              )
          )}

        </section>

        <br />

        {/* ==========================
                    FOOTER WARNING
                ========================== */}

        <section
          className="card"
          style={{
            background:
              "#fff8e8",
            border:
              "1px solid #f5c451",
          }}
        >

          <p>
            ⚠️ <strong>
              Important:
            </strong>{" "}
            Health insights shown here are
            for organization and monitoring
            only. They do not provide a
            veterinary diagnosis or replace
            professional veterinary advice.
          </p>

        </section>

        {msg && (
          <>
            <br />

            <section className="card">
              <p>
                ⚠️ {msg}
              </p>
            </section>
          </>
        )}

      </main>
    </>
  );
}