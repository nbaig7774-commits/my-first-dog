"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { hasPremiumAccess } from "../../../lib/planAccess";
import Sidebar from "../../components/Sidebar";

export default function DogProfile() {
  const sb = createClient();
  const params = useParams();
  const router = useRouter();

  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNotifications, setSavingNotifications] =
    useState(false);
  const [sendingTestEmail, setSendingTestEmail] =
    useState(false);

  const [msg, setMsg] = useState("");
  const [notificationMsg, setNotificationMsg] =
    useState("");

  const [editing, setEditing] = useState(false);

  const [subscriptionPlan, setSubscriptionPlan] =
    useState("none");

  const [subscriptionStatus, setSubscriptionStatus] =
    useState("inactive");

  // -----------------------------
  // DOG EDIT FORM
  // -----------------------------

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [color, setColor] = useState("");
  const [microchipNumber, setMicrochipNumber] =
    useState("");

  const [vetName, setVetName] = useState("");
  const [vetPhone, setVetPhone] = useState("");
  const [photoPath, setPhotoPath] = useState("");

  // -----------------------------
  // NOTIFICATION SETTINGS
  // -----------------------------

  const [emailNotifications, setEmailNotifications] =
    useState(false);

  const [pushNotifications, setPushNotifications] =
    useState(false);

  const [appointmentReminders, setAppointmentReminders] =
    useState(false);

  const [vaccinationReminders, setVaccinationReminders] =
    useState(false);

  const [medicationReminders, setMedicationReminders] =
    useState(false);

  // -----------------------------
  // LOAD DOG
  // -----------------------------

  useEffect(() => {
    if (!params?.id) return;

    loadDog();
  }, [params?.id]);

  async function loadDog() {
    try {
      setLoading(true);
      setMsg("");
      setNotificationMsg("");

      const {
        data: { user },
      } = await sb.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // -----------------------------
      // LOAD SUBSCRIPTION
      // -----------------------------

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

      // -----------------------------
      // LOAD DOG
      // -----------------------------

      const {
        data,
        error,
      } = await sb
        .from("dogs")
        .select("*")
        .eq("id", params.id)
        .eq("owner_id", user.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setDog(data);

      // -----------------------------
      // LOAD FORM VALUES
      // -----------------------------

      setName(data.name || "");
      setBreed(data.breed || "");
      setGender(data.gender || "");

      setDateOfBirth(
        data.date_of_birth || ""
      );

      setAge(
        data.age !== null &&
          data.age !== undefined
          ? String(data.age)
          : ""
      );

      setWeight(
        data.weight !== null &&
          data.weight !== undefined
          ? String(data.weight)
          : ""
      );

      setHeight(
        data.height !== null &&
          data.height !== undefined
          ? String(data.height)
          : ""
      );

      setColor(data.color || "");

      setMicrochipNumber(
        data.microchip_number || ""
      );

      setVetName(data.vet_name || "");
      setVetPhone(data.vet_phone || "");
      setPhotoPath(data.photo_path || "");

      // -----------------------------
      // LOAD NOTIFICATION SETTINGS
      // -----------------------------

      const notificationResult = await sb
        .from("notification_preferences")
        .select("*")
        .eq("dog_id", data.id)
        .maybeSingle();

      if (
        !notificationResult.error &&
        notificationResult.data
      ) {
        const preferences =
          notificationResult.data;

        setEmailNotifications(
          Boolean(
            preferences.email_notifications
          )
        );

        setPushNotifications(
          Boolean(
            preferences.push_notifications
          )
        );

        setAppointmentReminders(
          Boolean(
            preferences.appointment_reminders
          )
        );

        setVaccinationReminders(
          Boolean(
            preferences.vaccination_reminders
          )
        );

        setMedicationReminders(
          Boolean(
            preferences.medication_reminders
          )
        );
      }
    } catch (error) {
      console.error(
        "Dog profile loading error:",
        error
      );

      setMsg(
        error.message ||
        "Unable to load dog profile."
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // PREMIUM ACCESS
  // -----------------------------

  const hasPremium =
    subscriptionStatus === "active" &&
    hasPremiumAccess(subscriptionPlan);

  // -----------------------------
  // PRICING
  // -----------------------------

  function goToPricing() {
    router.push("/dashboard");
  }

  // -----------------------------
  // START EDIT
  // -----------------------------

  function startEditing() {
    setMsg("");
    setEditing(true);
  }

  // -----------------------------
  // CANCEL EDIT
  // -----------------------------

  function cancelEditing() {
    if (!dog) return;

    setName(dog.name || "");
    setBreed(dog.breed || "");
    setGender(dog.gender || "");

    setDateOfBirth(
      dog.date_of_birth || ""
    );

    setAge(
      dog.age !== null &&
        dog.age !== undefined
        ? String(dog.age)
        : ""
    );

    setWeight(
      dog.weight !== null &&
        dog.weight !== undefined
        ? String(dog.weight)
        : ""
    );

    setHeight(
      dog.height !== null &&
        dog.height !== undefined
        ? String(dog.height)
        : ""
    );

    setColor(dog.color || "");

    setMicrochipNumber(
      dog.microchip_number || ""
    );

    setVetName(dog.vet_name || "");
    setVetPhone(dog.vet_phone || "");
    setPhotoPath(dog.photo_path || "");

    setMsg("");
    setEditing(false);
  }

  // -----------------------------
  // SAVE DOG PROFILE
  // -----------------------------

  async function saveProfile(event) {
    event.preventDefault();

    setSaving(true);
    setMsg("");

    try {
      if (!name.trim()) {
        throw new Error(
          "Dog name is required."
        );
      }

      // -----------------------------
      // BASIC DATA
      // -----------------------------

      const updateData = {
        name: name.trim(),
        breed: breed.trim() || null,
      };

      // -----------------------------
      // PREMIUM DATA
      // -----------------------------

      if (hasPremium) {
        updateData.gender =
          gender || null;

        updateData.date_of_birth =
          dateOfBirth || null;

        updateData.age =
          age !== ""
            ? Number(age)
            : null;

        updateData.weight =
          weight !== ""
            ? Number(weight)
            : null;

        updateData.height =
          height !== ""
            ? Number(height)
            : null;

        updateData.color =
          color.trim() || null;

        updateData.microchip_number =
          microchipNumber.trim() || null;

        updateData.vet_name =
          vetName.trim() || null;

        updateData.vet_phone =
          vetPhone.trim() || null;

        updateData.photo_path =
          photoPath.trim() || null;
      }

      const {
        data,
        error,
      } = await sb
        .from("dogs")
        .update(updateData)
        .eq("id", dog.id)
        .eq("owner_id", dog.owner_id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setDog(data);

      setMsg(
        "✅ Dog profile updated successfully."
      );

      setEditing(false);
    } catch (error) {
      console.error(
        "Dog profile save error:",
        error
      );

      setMsg(
        error.message ||
        "Unable to update dog profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------
  // SAVE NOTIFICATION SETTINGS
  // -----------------------------

  async function saveNotificationSettings() {
    if (!dog) return;

    if (!hasPremium) {
      setNotificationMsg(
        "Premium is required for notification settings."
      );
      return;
    }

    setSavingNotifications(true);
    setNotificationMsg("");

    try {
      const {
        data: { user },
      } = await sb.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const preferences = {
        user_id: user.id,
        dog_id: dog.id,
        email_notifications:
          emailNotifications,
        push_notifications:
          pushNotifications,
        appointment_reminders:
          appointmentReminders,
        vaccination_reminders:
          vaccinationReminders,
        medication_reminders:
          medicationReminders,
        updated_at:
          new Date().toISOString(),
      };

      // Find the existing preference row
      // using the UNIQUE user_id column.
      const {
        data: existingPreference,
        error: findError,
      } = await sb
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (findError) {
        throw new Error(
          findError.message
        );
      }

      // UPDATE existing row
      if (existingPreference) {
        const {
          error: updateError,
        } = await sb
          .from("notification_preferences")
          .update(preferences)
          .eq(
            "id",
            existingPreference.id
          );

        if (updateError) {
          throw new Error(
            updateError.message
          );
        }
      } else {
        // INSERT new row
        const {
          error: insertError,
        } = await sb
          .from("notification_preferences")
          .insert(preferences);

        if (insertError) {
          throw new Error(
            insertError.message
          );
        }
      }

      setNotificationMsg(
        "✅ Notification preferences saved successfully."
      );
    } catch (error) {
      console.error(
        "Notification settings error:",
        error
      );

      setNotificationMsg(
        error?.message ||
        "Unable to save notification settings."
      );
    } finally {
      setSavingNotifications(false);
    }
  }

  // -----------------------------
  // SEND TEST EMAIL
  // -----------------------------

  async function sendTestEmail() {
    if (!dog) return;

    if (!hasPremium) {
      setNotificationMsg(
        "Premium is required for email notifications."
      );
      return;
    }

    setSendingTestEmail(true);
    setNotificationMsg("");

    try {
      const {
        data: { user },
      } = await sb.auth.getUser();

      if (!user?.email) {
        throw new Error(
          "No email address is available for this account."
        );
      }

      const response = await fetch(
        "/api/send-email",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            to: user.email,
            subject:
              "🐶 My First Dog — Test Email",
            message:
              `This is a test email for ${dog.name}. ` +
              "Your My First Dog Premium email notification system is connected successfully. ✅",
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Unable to send test email."
        );
      }

      setNotificationMsg(
        "✅ Test email sent successfully. Check your inbox."
      );
    } catch (error) {
      console.error(
        "Test email error:",
        error
      );

      setNotificationMsg(
        error.message ||
        "Unable to send test email."
      );
    } finally {
      setSendingTestEmail(false);
    }
  }

  // -----------------------------
  // LOADING
  // -----------------------------

  if (loading) {
    return (
      <>
        <Sidebar />

        <main className="container">
          <p>
            Loading dog profile...
          </p>
        </main>
      </>
    );
  }

  // -----------------------------
  // NOT FOUND
  // -----------------------------

  if (!dog) {
    return (
      <>
        <Sidebar />

        <main className="container">
          <h1>
            Dog not found
          </h1>

          <p className="muted">
            {msg}
          </p>

          <button
            className="btn"
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
          >
            ← Back to Dashboard
          </button>
        </main>
      </>
    );
  }
  // -----------------------------
  // PAGE
  // -----------------------------

  return (
    <>
      <Sidebar />

      <main className="container">

        {/* BACK */}

        <button
          className="btn"
          type="button"
          onClick={() =>
            router.push("/dashboard")
          }
        >
          ← Back to Dashboard
        </button>

        <br />

        {/* HEADER */}

        <section className="hero">
          <h1>
            🐶 {dog.name}
          </h1>

          <p className="muted">
            {dog.breed ||
              "Breed not set"}
          </p>
        </section>

        {/* MESSAGE */}

        {msg && (
          <section
            className="card"
            style={{
              marginBottom: "20px",
            }}
          >
            <p>{msg}</p>
          </section>
        )}

        {/* =========================
            DOG INFORMATION
        ========================= */}

        <section className="card">

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h2>
              🐶 Dog Information
            </h2>

            {!editing && (
              <button
                className="btn primary"
                type="button"
                onClick={startEditing}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          {!editing ? (
            <>
              {/* BASIC */}

              <p>
                <strong>
                  Name:
                </strong>{" "}
                {dog.name}
              </p>

              <p>
                <strong>
                  Breed:
                </strong>{" "}
                {dog.breed ||
                  "Not set"}
              </p>

              {/* PREMIUM */}

              {hasPremium ? (
                <>
                  <hr />

                  <h3>
                    ⭐ Detailed Dog Profile
                  </h3>

                  <p>
                    <strong>
                      Date of Birth:
                    </strong>{" "}
                    {dog.date_of_birth ||
                      "Not set"}
                  </p>

                  <p>
                    <strong>
                      Age:
                    </strong>{" "}
                    {dog.age !== null &&
                      dog.age !== undefined
                      ? `${dog.age} years`
                      : "Not set"}
                  </p>

                  <p>
                    <strong>
                      Gender:
                    </strong>{" "}
                    {dog.gender ||
                      "Not set"}
                  </p>

                  <p>
                    <strong>
                      Weight:
                    </strong>{" "}
                    {dog.weight !== null &&
                      dog.weight !== undefined
                      ? `${dog.weight} kg`
                      : "Not set"}
                  </p>

                  <p>
                    <strong>
                      Height:
                    </strong>{" "}
                    {dog.height !== null &&
                      dog.height !== undefined
                      ? `${dog.height} cm`
                      : "Not set"}
                  </p>

                  <p>
                    <strong>
                      Color:
                    </strong>{" "}
                    {dog.color ||
                      "Not set"}
                  </p>

                  <p>
                    <strong>
                      Microchip Number:
                    </strong>{" "}
                    {dog.microchip_number ||
                      "Not set"}
                  </p>

                  <hr />

                  <h3>
                    🧑‍⚕️ Veterinarian
                  </h3>

                  <p>
                    <strong>
                      Name:
                    </strong>{" "}
                    {dog.vet_name ||
                      "Not set"}
                  </p>

                  <p>
                    <strong>
                      Phone:
                    </strong>{" "}
                    {dog.vet_phone ||
                      "Not set"}
                  </p>

                  {dog.photo_path && (
                    <p>
                      <strong>
                        Photo Path:
                      </strong>{" "}
                      {dog.photo_path}
                    </p>
                  )}
                </>
              ) : (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "18px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(135deg,#fff8e8,#fffdf7)",
                    border:
                      "1px solid #f5c451",
                  }}
                >
                  <h3>
                    ⭐ Premium Dog Profile
                  </h3>

                  <p>
                    🔒 Date of Birth
                  </p>

                  <p>
                    🔒 Age
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
                    🔒 Microchip Number
                  </p>

                  <p>
                    🔒 Veterinarian Name
                  </p>

                  <p>
                    🔒 Veterinarian Phone
                  </p>

                  <p className="muted">
                    Unlock your dog's
                    complete profile
                    with Premium.
                  </p>

                  <button
                    className="btn primary"
                    type="button"
                    onClick={goToPricing}
                  >
                    ⭐ Upgrade to Premium →
                  </button>
                </div>
              )}
            </>
          ) : (
            /* =========================
               EDIT FORM
            ========================= */

            <form
              className="form"
              onSubmit={saveProfile}
              style={{
                marginTop: "20px",
              }}
            >

              {/* BASIC */}

              <label>
                Dog Name
              </label>

              <input
                className="input"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                required
              />

              <label>
                Breed
              </label>

              <input
                className="input"
                value={breed}
                onChange={(e) =>
                  setBreed(
                    e.target.value
                  )
                }
              />

              {/* PREMIUM */}

              {hasPremium && (
                <>
                  <hr />

                  <h3>
                    ⭐ Detailed Information
                  </h3>

                  <label>
                    Gender
                  </label>

                  <select
                    className="input"
                    value={gender}
                    onChange={(e) =>
                      setGender(
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Select gender
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>
                  </select>

                  <label>
                    Date of Birth
                  </label>

                  <input
                    className="input"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) =>
                      setDateOfBirth(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Age (years)
                  </label>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={age}
                    onChange={(e) =>
                      setAge(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Weight (kg)
                  </label>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Example: 30.5"
                    value={weight}
                    onChange={(e) =>
                      setWeight(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Height (cm)
                  </label>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Example: 60"
                    value={height}
                    onChange={(e) =>
                      setHeight(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Color
                  </label>

                  <input
                    className="input"
                    value={color}
                    onChange={(e) =>
                      setColor(
                        e.target.value
                      )
                    }
                    placeholder="Example: Black and tan"
                  />

                  <label>
                    Microchip Number
                  </label>

                  <input
                    className="input"
                    value={microchipNumber}
                    onChange={(e) =>
                      setMicrochipNumber(
                        e.target.value
                      )
                    }
                    placeholder="Enter microchip number"
                  />

                  <hr />

                  <h3>
                    🧑‍⚕️ Veterinarian
                  </h3>

                  <label>
                    Veterinarian Name
                  </label>

                  <input
                    className="input"
                    value={vetName}
                    onChange={(e) =>
                      setVetName(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Veterinarian Phone
                  </label>

                  <input
                    className="input"
                    type="tel"
                    value={vetPhone}
                    onChange={(e) =>
                      setVetPhone(
                        e.target.value
                      )
                    }
                  />

                  <label>
                    Photo Path
                  </label>

                  <input
                    className="input"
                    value={photoPath}
                    onChange={(e) =>
                      setPhotoPath(
                        e.target.value
                      )
                    }
                    placeholder="Optional photo storage path"
                  />
                </>
              )}

              {/* BUTTONS */}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "10px",
                }}
              >
                <button
                  className="btn primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "💾 Save Profile"}
                </button>

                <button
                  className="btn"
                  type="button"
                  onClick={
                    cancelEditing
                  }
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>

            </form>
          )}

        </section>

        <br />

        {/* =========================
            ACCOUNT INFORMATION
        ========================= */}

        <section className="card">

          <h2>
            🔐 Account & Record Information
          </h2>

          <p>
            <strong>ID:</strong>{" "}
            {dog.id}
          </p>

          <p>
            <strong>
              Owner ID:
            </strong>{" "}
            {dog.owner_id}
          </p>

          <p>
            <strong>
              Created At:
            </strong>{" "}
            {dog.created_at
              ? new Date(
                dog.created_at
              ).toLocaleString()
              : "Not available"}
          </p>

          <p>
            <strong>
              Updated At:
            </strong>{" "}
            {dog.updated_at
              ? new Date(
                dog.updated_at
              ).toLocaleString()
              : "Not available"}
          </p>

        </section>

        <br />

        {/* =========================
            PREMIUM NOTIFICATIONS
        ========================= */}

        <section className="card">

          <h2>
            🔔 Premium Notifications
          </h2>

          {!hasPremium ? (
            <div
              style={{
                padding: "18px",
                borderRadius: "18px",
                background:
                  "#fff8e8",
                border:
                  "1px solid #f5c451",
              }}
            >

              <h3>
                🔒 Premium Feature
              </h3>

              <p className="muted">
                Premium customers can
                choose email, push,
                appointment, vaccination
                and medication notifications.
              </p>

              <button
                className="btn primary"
                type="button"
                onClick={goToPricing}
              >
                ⭐ Upgrade to Premium →
              </button>

            </div>
          ) : (
            <>
              <p className="muted">
                Choose which notifications
                you want to receive for
                your dogs.
              </p>

              {/* EMAIL */}

              <div
                className="card"
                style={{
                  marginTop: "16px",
                  background:
                    "#f7fbff",
                }}
              >

                <h3>
                  📧 Email Notifications
                </h3>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >

                  <input
                    type="checkbox"
                    checked={
                      emailNotifications
                    }
                    onChange={(e) =>
                      setEmailNotifications(
                        e.target.checked
                      )
                    }
                  />

                  Enable email notifications

                </label>

                <p className="muted">
                  Receive important
                  dog-care notifications
                  by email.
                </p>

              </div>

              {/* PUSH */}

              <div
                className="card"
                style={{
                  marginTop: "12px",
                  background:
                    "#f7fbff",
                }}
              >

                <h3>
                  📱 Push Notifications
                </h3>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >

                  <input
                    type="checkbox"
                    checked={
                      pushNotifications
                    }
                    onChange={(e) =>
                      setPushNotifications(
                        e.target.checked
                      )
                    }
                  />

                  Enable push notifications

                </label>

              </div>

              {/* APPOINTMENTS */}

              <div
                className="card"
                style={{
                  marginTop: "12px",
                  background:
                    "#f7fbff",
                }}
              >

                <h3>
                  📅 Appointment Reminders
                </h3>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >

                  <input
                    type="checkbox"
                    checked={
                      appointmentReminders
                    }
                    onChange={(e) =>
                      setAppointmentReminders(
                        e.target.checked
                      )
                    }
                  />

                  Appointment reminders

                </label>

              </div>

              {/* VACCINATIONS */}

              <div
                className="card"
                style={{
                  marginTop: "12px",
                  background:
                    "#f7fbff",
                }}
              >

                <h3>
                  💉 Vaccination Reminders
                </h3>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >

                  <input
                    type="checkbox"
                    checked={
                      vaccinationReminders
                    }
                    onChange={(e) =>
                      setVaccinationReminders(
                        e.target.checked
                      )
                    }
                  />

                  Vaccination reminders

                </label>

              </div>

              {/* MEDICATIONS */}

              <div
                className="card"
                style={{
                  marginTop: "12px",
                  background:
                    "#f7fbff",
                }}
              >

                <h3>
                  💊 Medication Reminders
                </h3>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >

                  <input
                    type="checkbox"
                    checked={
                      medicationReminders
                    }
                    onChange={(e) =>
                      setMedicationReminders(
                        e.target.checked
                      )
                    }
                  />

                  Medication reminders

                </label>

              </div>

              {/* SAVE */}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "18px",
                }}
              >

                <button
                  className="btn primary"
                  type="button"
                  onClick={
                    saveNotificationSettings
                  }
                  disabled={
                    savingNotifications
                  }
                >
                  {savingNotifications
                    ? "Saving..."
                    : "💾 Save Notification Settings"}
                </button>

                {/* TEST EMAIL */}

                <button
                  className="btn"
                  type="button"
                  onClick={
                    sendTestEmail
                  }
                  disabled={
                    sendingTestEmail
                  }
                >
                  {sendingTestEmail
                    ? "Sending..."
                    : "📧 Send Test Email"}
                </button>

              </div>

              {notificationMsg && (
                <div
                  className="card"
                  style={{
                    marginTop: "16px",
                    background:
                      "#f7fbff",
                  }}
                >
                  <p>
                    {notificationMsg}
                  </p>
                </div>
              )}

              <p
                className="muted"
                style={{
                  marginTop: "16px",
                }}
              >
                ℹ️ Premium email reminders are
                active for appointments,
                vaccinations, and medications.
              </p>

            </>
          )}

        </section>

        <br />

        {/* =========================
            APP FEATURES
        ========================= */}

        <section className="grid">

          {/* HEALTH */}

          <div
            className="card"
            onClick={() =>
              router.push(
                `/health?dog=${dog.id}`
              )
            }
            style={{
              cursor: "pointer",
            }}
          >

            <h2>
              ❤️ Health
            </h2>

            <p className="muted">
              View your dog's health
              records.
            </p>

            <span className="pill">
              View health records →
            </span>

          </div>

          {/* WEIGHT */}

          <div
            className="card"
            onClick={() =>
              router.push(
                `/weight?dog=${dog.id}`
              )
            }
            style={{
              cursor: "pointer",
            }}
          >

            <h2>
              ⚖️ Weight
            </h2>

            <p className="muted">
              Track your dog's weight
              and monitor trends.
            </p>

            <span className="pill">
              View weight history →
            </span>

          </div>

          {/* VACCINATIONS */}

          <div
            className="card"
            onClick={() =>
              router.push(
                `/vaccinations?dog=${dog.id}`
              )
            }
            style={{
              cursor: "pointer",
            }}
          >

            <h2>
              💉 Vaccinations
            </h2>

            <p className="muted">
              Track vaccines and
              due dates.
            </p>

            <span className="pill">
              View vaccinations →
            </span>

          </div>

          {/* MEDICATIONS */}

          <div
            className="card"
            onClick={() =>
              router.push(
                `/medications?dog=${dog.id}`
              )
            }
            style={{
              cursor: "pointer",
            }}
          >

            <h2>
              💊 Medications
            </h2>

            <p className="muted">
              Keep medication
              information organized.
            </p>

            <span className="pill">
              View medications →
            </span>

          </div>

          {/* ROUTINES */}

          <div
            className="card"
            onClick={() =>
              router.push(
                `/routines?dog=${dog.id}`
              )
            }
            style={{
              cursor: "pointer",
            }}
          >

            <h2>
              🔄 Routines
            </h2>

            <p className="muted">
              Manage your dog's
              daily routines.
            </p>

            <span className="pill">
              View routines →
            </span>

          </div>

          {/* APPOINTMENTS */}

          <div
            className="card"
            onClick={() =>
              router.push(
                `/appointments?dog=${dog.id}`
              )
            }
            style={{
              cursor: "pointer",
            }}
          >

            <h2>
              📅 Appointments
            </h2>

            <p className="muted">
              Keep track of vet
              appointments.
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