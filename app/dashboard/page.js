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

  async function load() {
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      location.href = "/login";
      return;
    }

    setUser(user);

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