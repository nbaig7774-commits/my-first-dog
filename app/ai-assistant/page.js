"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";

export default function AIAssistant() {
  const sb = createClient();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [dogs, setDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState("");

  const [subscriptionPlan, setSubscriptionPlan] =
    useState("none");

  const [subscriptionStatus, setSubscriptionStatus] =
    useState("inactive");

  const [loadingAccount, setLoadingAccount] =
    useState(true);


  /* =====================================================
     LOAD USER + DOGS + PLAN
  ===================================================== */

  useEffect(() => {
    async function loadAccount() {
      setLoadingAccount(true);

      try {
        const {
          data: { user },
        } = await sb.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }


        /* LOAD PLAN */

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


        /* LOAD DOGS */

        const dogsResult = await sb
          .from("dogs")
          .select(
            "id, name, breed"
          )
          .order("created_at", {
            ascending: true,
          });

        if (dogsResult.error) {
          console.error(
            "Dogs loading error:",
            dogsResult.error
          );
        } else {
          const dogData =
            dogsResult.data || [];

          setDogs(dogData);

          if (dogData.length > 0) {
            setSelectedDog(
              dogData[0].id
            );
          }
        }

      } catch (err) {
        console.error(
          "Account loading error:",
          err
        );

        setError(
          err.message ||
          "Unable to load your account."
        );
      } finally {
        setLoadingAccount(false);
      }
    }

    loadAccount();
  }, []);


  /* =====================================================
     PLAN STATUS
  ===================================================== */

  const isBasic =
    subscriptionPlan === "basic" &&
    subscriptionStatus === "active";

  const isPremium =
    subscriptionPlan === "premium" &&
    subscriptionStatus === "active";


  /* =====================================================
     ASK AI
  ===================================================== */

  async function askAI(e) {
    e.preventDefault();

    if (!question.trim()) {
      setError(
        "Please enter a question."
      );
      return;
    }

    if (!selectedDog) {
      setError(
        "Please select a dog first."
      );
      return;
    }

    setLoading(true);
    setAnswer("");
    setError("");


    try {

      /* GET SESSION */

      const {
        data: { session },
      } = await sb.auth.getSession();


      if (!session) {
        window.location.href = "/login";
        return;
      }


      /* SEND REQUEST */

      const response = await fetch(
        "/api/assistant",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            question:
              question.trim(),

            dogId:
              selectedDog,

            accessToken:
              session.access_token,

            plan:
              subscriptionPlan,
          }),
        }
      );


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
          "AI Assistant failed."
        );
      }


      setAnswer(
        data.answer ||
        "No answer received."
      );

    } catch (err) {

      setError(
        err.message ||
        "Something went wrong."
      );

    } finally {

      setLoading(false);
    }
  }


  /* =====================================================
     QUICK QUESTIONS
  ===================================================== */

  function useQuestion(text) {
    setQuestion(text);
    setAnswer("");
    setError("");
  }


  /* =====================================================
     DOG NAME
  ===================================================== */

  const selectedDogData =
    dogs.find(
      (dog) =>
        dog.id === selectedDog
    );


  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <>
      <Sidebar />

      <main className="container">

        {/* HERO */}

        <section className="hero">

          <span className="pill">
            🤖 Smart Dog Care
          </span>

          <h1>
            AI Care Assistant
          </h1>

          <p>
            Get personalized help with your dog's
            health, vaccinations, medications,
            routines, appointments, and care.
          </p>

        </section>


        {/* PLAN STATUS */}

        {!loadingAccount && (
          <section
            className="card"
            style={{
              marginBottom: 20,
              background:
                isPremium
                  ? "#fff8e8"
                  : "#f3f9ff",

              border:
                isPremium
                  ? "2px solid #f5c451"
                  : "1px solid #bfdbfe",
            }}
          >

            {isPremium ? (

              <>
                <h3>
                  ⭐ Premium AI Assistant
                </h3>

                <p className="muted">
                  Your Premium plan unlocks
                  advanced personalized AI care.
                </p>

                <strong>
                  🧠 Advanced AI enabled
                </strong>
              </>

            ) : isBasic ? (

              <>
                <h3>
                  🐶 Basic AI Assistant
                </h3>

                <p className="muted">
                  Your Basic plan includes
                  AI dog-care assistance.
                </p>

                <strong>
                  🤖 Basic AI enabled
                </strong>
              </>

            ) : (

              <>
                <h3>
                  🤖 AI Care Assistant
                </h3>

                <p className="muted">
                  Choose a My First Dog plan
                  to use the AI Care Assistant.
                </p>
              </>

            )}

          </section>
        )}


        {/* MAIN AI CARD */}

        <section className="card">

          <h2>
            🐶 Ask about your dog
          </h2>

          <p className="muted">
            Select a dog and ask a question.
            The assistant can use information
            stored in your My First Dog account.
          </p>


          {/* DOG SELECTOR */}

          <div
            style={{
              marginTop: 18,
            }}
          >

            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "700",
              }}
            >
              Select your dog
            </label>


            {loadingAccount ? (

              <p className="muted">
                Loading your dogs...
              </p>

            ) : dogs.length === 0 ? (

              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: "#f7f9fc",
                }}
              >

                <p>
                  🐶 You don't have a dog
                  profile yet.
                </p>

                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    window.location.href =
                    "/dashboard"
                  }
                >
                  Add Your Dog →
                </button>

              </div>

            ) : (

              <select
                className="input"
                value={selectedDog}
                onChange={(e) =>
                  setSelectedDog(
                    e.target.value
                  )
                }
                disabled={loading}
              >

                {dogs.map((dog) => (

                  <option
                    key={dog.id}
                    value={dog.id}
                  >
                    🐶 {dog.name}
                    {dog.breed
                      ? ` — ${dog.breed}`
                      : ""}
                  </option>

                ))}

              </select>

            )}

          </div>


          {/* SELECTED DOG */}

          {selectedDogData && (
            <div
              style={{
                marginTop: 15,
                padding: 14,
                borderRadius: 14,
                background:
                  isPremium
                    ? "#fff8e8"
                    : "#f3f9ff",
              }}
            >

              <strong>
                🐶 Asking about{" "}
                {selectedDogData.name}
              </strong>

              {selectedDogData.breed && (
                <p
                  className="muted"
                  style={{
                    marginBottom: 0,
                  }}
                >
                  {selectedDogData.breed}
                </p>
              )}

            </div>
          )}


          {/* QUESTION FORM */}

          <form
            className="form"
            onSubmit={askAI}
            style={{
              marginTop: 20,
            }}
          >

            <label>
              Your question
            </label>


            <textarea
              className="input"
              rows={6}
              placeholder={
                selectedDogData
                  ? `Example: What should I know about ${selectedDogData.name}'s recent health records?`
                  : "Example: When is my dog's next appointment?"
              }
              value={question}
              onChange={(e) =>
                setQuestion(
                  e.target.value
                )
              }
              disabled={
                loading ||
                dogs.length === 0
              }
            />


            <button
              className="btn primary"
              type="submit"
              disabled={
                loading ||
                dogs.length === 0
              }
            >

              {loading
                ? "🤖 Thinking..."
                : "🤖 Ask AI"}

            </button>

          </form>

        </section>


        {/* ERROR */}

        {error && (
          <section
            className="card"
            style={{
              marginTop: 20,
              border:
                "1px solid #f0b4b4",
            }}
          >

            <h3>
              ⚠️ Something went wrong
            </h3>

            <p>
              {error}
            </p>

          </section>
        )}


        {/* ANSWER */}

        {answer && (
          <section
            className="card"
            style={{
              marginTop: 20,
            }}
          >

            <h2>
              🤖 AI Care Assistant
            </h2>

            {selectedDogData && (
              <p className="muted">
                Personalized answer for{" "}
                <strong>
                  {selectedDogData.name}
                </strong>
              </p>
            )}

            <div
              style={{
                padding: 18,
                borderRadius: 16,
                background: "#f7f9fc",
                marginTop: 12,
              }}
            >

              <p
                style={{
                  whiteSpace:
                    "pre-wrap",
                  lineHeight: 1.7,
                  marginBottom: 0,
                }}
              >
                {answer}
              </p>

            </div>

            <p
              className="muted"
              style={{
                marginTop: 15,
                fontSize: 13,
              }}
            >
              ⚠️ AI guidance is for
              informational purposes and
              does not replace professional
              veterinary diagnosis or treatment.
            </p>

          </section>
        )}


        {/* QUICK QUESTIONS */}

        <section
          className="card"
          style={{
            marginTop: 20,
          }}
        >

          <h3>
            💡 Try asking
          </h3>


          <p
            className="muted"
            style={{
              marginBottom: 10,
            }}
          >
            Select a question to fill the
            assistant automatically.
          </p>


          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >

            <button
              className="btn"
              type="button"
              onClick={() =>
                useQuestion(
                  selectedDogData
                    ? `When is ${selectedDogData.name}'s next appointment?`
                    : "When is my dog's next appointment?"
                )
              }
            >
              📅 Next appointment
            </button>


            <button
              className="btn"
              type="button"
              onClick={() =>
                useQuestion(
                  selectedDogData
                    ? `What medication is ${selectedDogData.name} currently taking?`
                    : "What medication is my dog currently taking?"
                )
              }
            >
              💊 Current medications
            </button>


            <button
              className="btn"
              type="button"
              onClick={() =>
                useQuestion(
                  selectedDogData
                    ? `When was ${selectedDogData.name}'s last health checkup?`
                    : "When was my dog's last health checkup?"
                )
              }
            >
              ❤️ Last health checkup
            </button>


            <button
              className="btn"
              type="button"
              onClick={() =>
                useQuestion(
                  selectedDogData
                    ? `What vaccinations does ${selectedDogData.name} have and when are they next due?`
                    : "What vaccinations does my dog have and when are they next due?"
                )
              }
            >
              💉 Vaccinations
            </button>


            <button
              className="btn"
              type="button"
              onClick={() =>
                useQuestion(
                  selectedDogData
                    ? `What is ${selectedDogData.name}'s current daily routine?`
                    : "What is my dog's current daily routine?"
                )
              }
            >
              🔄 Daily routine
            </button>


            {isPremium && (
              <button
                className="btn"
                type="button"
                onClick={() =>
                  useQuestion(
                    selectedDogData
                      ? `Give me a personalized overall care review for ${selectedDogData.name} based on the information in my My First Dog account. Tell me what is going well and what I should discuss with my veterinarian.`
                      : "Give me a personalized overall care review of my dog based on the information in my My First Dog account."
                  )
                }
              >
                ⭐ Premium Care Review
              </button>
            )}

          </div>

        </section>


        {/* PREMIUM FEATURE PROMOTION */}

        {!isPremium && (
          <section
            className="card"
            style={{
              marginTop: 20,
              background:
                "linear-gradient(135deg,#fff8e8,#fffdf7)",
              border:
                "2px solid #f5c451",
            }}
          >

            <h2>
              ⭐ Unlock Advanced AI
            </h2>

            <p>
              Premium gives you a more
              personalized dog-care experience.
            </p>

            <p>
              🔒 Advanced personalized AI
            </p>

            <p>
              🔒 Personalized care reviews
            </p>

            <p>
              🔒 Health and weight analysis
            </p>

            <p>
              🔒 Vet report generation
            </p>

            <p>
              🔒 AI document analysis
            </p>

            <button
              className="btn primary"
              type="button"
              onClick={() =>
                window.location.href =
                "/dashboard"
              }
            >
              ⭐ View Premium →
            </button>

          </section>
        )}

      </main>
    </>
  );
}