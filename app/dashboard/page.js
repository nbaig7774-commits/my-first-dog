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

  const [subscriptionPlan, setSubscriptionPlan] = useState("none");
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
  const [subscriptionInterval, setSubscriptionInterval] = useState(null);

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

    if (profileResult.error) {
      setMsg(profileResult.error.message);
    } else {
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

    const r = await sb
      .from("dogs")
      .select("*")
      .order("created_at", { ascending: false });

    if (r.error) {
      setMsg(r.error.message);
    } else {
      setDogs(r.data || []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();

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

  const isPremium =
    isActive && subscriptionPlan === "premium";

  const isBasic =
    isActive && subscriptionPlan === "basic";

  return (
    <>
      <Sidebar />

      <main className="container">
        <div
          className="row"
          style={{ justifyContent: "space-between" }}
        >
          <div>
            <h1>Dashboard</h1>

            <p className="muted">
              Your dog's care at a glance.
            </p>
          </div>

          <button className="btn" onClick={logout}>
            Log out
          </button>
        </div>

        <section className="card">
          <h2>Your Plan</h2>

          {isPremium ? (
            <>
              <strong>⭐ Premium</strong>

              <p className="muted">
                {subscriptionInterval === "annual"
                  ? "Annual subscription"
                  : "Monthly subscription"}
              </p>
            </>
          ) : isBasic ? (
            <>
              <strong>🐶 Basic</strong>

              <p className="muted">
                {subscriptionInterval === "annual"
                  ? "Annual subscription"
                  : "Monthly subscription"}
              </p>
            </>
          ) : (
            <>
              <strong>No active subscription</strong>

              <p className="muted">
                Please choose a Basic or Premium plan.
              </p>
            </>
          )}
        </section>

        <br />

        <section className="grid">
          <div className="card">
            <div className="stat">{dogs.length}</div>
            <p className="muted">Dogs</p>
          </div>

          <div className="card">
            <div className="stat">🩺</div>
            <p className="muted">Health</p>
          </div>

          <div className="card">
            <div className="stat">💉</div>
            <p className="muted">Vaccines</p>
          </div>

          <div className="card">
            <div className="stat">🤖</div>
            <p className="muted">AI Assistant</p>
          </div>
        </section>

        <br />

        <section className="grid">
          <form className="card" onSubmit={add}>
            <h2>Add your dog</h2>

            <input
              className="input"
              placeholder="Dog name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              className="input"
              placeholder="Breed"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
            />

            <button className="btn primary">
              Add dog
            </button>

            <p className="muted">{msg}</p>
          </form>

          <div className="card">
            <h2>Your dogs</h2>

            {dogs.length ? (
              dogs.map((d) => (
                <div
                  key={d.id}
                  className="card"
                  onClick={() =>
                    (location.href = `/dogs/${d.id}`)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <strong>🐶 {d.name}</strong>

                  <p className="muted">
                    {d.breed || "Breed not set"}
                  </p>

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