import Link from "next/link";

export default function Home() {
  return (
    <>
      <nav className="nav">
        <div className="brand">🐶 My First Dog</div>

        <div className="navlinks">
          <Link href="/login">Log in</Link>

          <Link className="btn primary" href="/login">
            Get Basic
          </Link>
        </div>
      </nav>

      <main className="container">
        <section className="hero">
          <span className="pill">
            Your dog's care, organized
          </span>

          <h1>
            Everything you need to care for your first dog.
          </h1>

          <p>
            Keep health records, vaccinations, medications,
            routines and vet appointments together in one place.
          </p>

          <Link className="btn primary" href="/login">
            Get Basic — $99.90/month
          </Link>
        </section>

        <section className="grid">
          {[
            ["🩺", "Health"],
            ["💊", "Medications"],
            ["💉", "Vaccinations"],
            ["🐾", "Routines"],
            ["📅", "Appointments"],
            ["🤖", "AI Care Assistant"],
          ].map((x) => (
            <div className="card" key={x[1]}>
              <div style={{ fontSize: 30 }}>
                {x[0]}
              </div>

              <h3>{x[1]}</h3>

              <p className="muted">
                Organize your dog's care in one place.
              </p>
            </div>
          ))}
        </section>

        <br />

        <section className="card">
          <h2>🐶 Basic Plan</h2>

          <h1>$99.90/month</h1>

          <p className="muted">
            Everything you need to manage your dog's everyday
            health and care.
          </p>

          <p>
            <strong>$1,100/year</strong>
          </p>

          <p className="muted">
            Pay monthly for 12 months: $1,198.80
          </p>

          <p>
            <strong>Save $98.80 with annual billing.</strong>
          </p>

          <Link className="btn primary" href="/login">
            Get Basic
          </Link>
        </section>
      </main>
    </>
  );
}