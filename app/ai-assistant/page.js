"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { createClient } from "../../lib/supabase";

export default function AIAssistant() {
  const sb = createClient();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function askAI(e) {
    e.preventDefault();

    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setAnswer("");
    setError("");

    try {
      // Get the currently logged-in user's session.
      const {
        data: { session },
      } = await sb.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      // Send only the question and the user's authentication
      // token to the server.
      //
      // The server will use the token to retrieve this
      // customer's own dog data from Supabase.
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          accessToken: session.access_token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "AI Assistant failed."
        );
      }

      setAnswer(data.answer || "No answer received.");
    } catch (err) {
      setError(
        err.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Sidebar />

      <main className="container">
        <section className="hero">
          <span className="pill">
            🤖 Smart Dog Care
          </span>

          <h1>AI Care Assistant</h1>

          <p>
            Ask questions about your dog's health,
            appointments, vaccinations, routines,
            and medications.
          </p>
        </section>

        <section className="card">
          <h2>🐶 Ask about your dog</h2>

          <p className="muted">
            Your AI assistant can answer questions using
            information stored in your My First Dog account.
          </p>

          <form className="form" onSubmit={askAI}>
            <label>Your question</label>

            <textarea
              className="input"
              rows={5}
              placeholder="Example: When is Jet's next appointment?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />

            <button
              className="btn primary"
              type="submit"
              disabled={loading}
            >
              {loading ? "🤖 Thinking..." : "🤖 Ask AI"}
            </button>
          </form>
        </section>

        {error && (
          <section
            className="card"
            style={{ marginTop: 20 }}
          >
            <h3>⚠️ Something went wrong</h3>

            <p>{error}</p>
          </section>
        )}

        {answer && (
          <section
            className="card"
            style={{ marginTop: 20 }}
          >
            <h2>🤖 AI Care Assistant</h2>

            <p style={{ whiteSpace: "pre-wrap" }}>
              {answer}
            </p>
          </section>
        )}

        <section
          className="card"
          style={{ marginTop: 20 }}
        >
          <h3>💡 Try asking</h3>

          <p className="muted">
            “When is Jet's next appointment?”
          </p>

          <p className="muted">
            “What medication is Jet taking?”
          </p>

          <p className="muted">
            “When was Jet's last health checkup?”
          </p>

          <p className="muted">
            “What vaccinations does Jet have?”
          </p>

          <p className="muted">
            “What is Jet's daily routine?”
          </p>
        </section>
      </main>
    </>
  );
} []