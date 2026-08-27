import Link from "next/link";

export default function Home() {
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

  const proFeatures = [
    ["🐶", "Everything in Premium", "All Premium features included"],
    ["👨‍👩‍👧", "Family & Caregiver Sharing", "Share care information with family members"],
    ["📄", "Unlimited Document Scanning", "Organize more veterinary documents"],
    ["💰", "Pet-Care Expense Tracking", "Keep track of important care expenses"],
    ["🛡️", "Insurance-Ready Reports", "Prepare organized records for insurance"],
    ["⚡", "Priority Support", "Get help when you need it"],
  ];

  return (
    <>
      {/* NAVIGATION */}

      <nav className="nav">
        <div className="brand">
          🐶 My First Dog
        </div>

        <div
          className="navlinks"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <Link href="/login">
            Log in
          </Link>

          <Link
            className="btn primary"
            href="/login"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="container">

        {/* HERO */}

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
            href="/login"
          >
            Get Started →
          </Link>
        </section>

        {/* FEATURES */}

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

        {/* PRICING */}

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

            {/* ================= BASIC ================= */}

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
                Save $30 with annual billing.
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
                Get Basic →
              </Link>
            </div>

            {/* ================= PREMIUM ================= */}

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
                Save $50 with annual billing.
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

            {/* ================= PRO ================= */}

            <div
              className="card"
              style={{
                border: "2px solid #ddd6fe",
                borderRadius: "24px",
                padding: "26px",
                background:
                  "linear-gradient(180deg, #f8f5ff 0%, #ffffff 38%)",
                boxShadow:
                  "0 14px 35px rgba(100, 70, 180, 0.12)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h2>🏆 Pro Family</h2>

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
                Save $70 with annual billing.
              </p>

              <h3>
                Family & Advanced Care
              </h3>

              {proFeatures.map((feature) => (
                <div
                  key={feature[1]}
                  style={{
                    marginTop: "16px",
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
                🏆 Get Pro →
              </Link>
            </div>

          </section>
        </section>

        <br />

        {/* TRUST */}

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
            <strong>Secure Payment</strong>

            <p className="muted">
              Your information is protected.
            </p>
          </div>

          <div>
            ❤️
            <br />
            <strong>Cancel Anytime</strong>

            <p className="muted">
              No long-term commitment.
            </p>
          </div>

          <div>
            🐾
            <br />
            <strong>Made for Dog Owners</strong>

            <p className="muted">
              One place for your dog's care.
            </p>
          </div>
        </section>

        <br />

        {/* FINAL CTA */}

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
            href="/login"
          >
            Get Started →
          </Link>
        </section>

      </main>
    </>
  );
}