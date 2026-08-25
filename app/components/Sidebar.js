import Link from "next/link";

export default function Sidebar() {
  return (
    <nav className="nav">
      <div className="brand">🐶 My First Dog</div>

      <div className="navlinks">
        <Link href="/dashboard">
          Dashboard
        </Link>

        <Link href="/health">
          Health
        </Link>

        <Link href="/medications">
          Medications
        </Link>

        <Link href="/vaccinations">
          Vaccinations
        </Link>

        <Link href="/routines">
          Routines
        </Link>

        <Link href="/appointments">
          Appointments
        </Link>

        <Link className="btn primary" href="/ai-assistant">
          🤖 AI Assistant
        </Link>
      </div>
    </nav>
  );
}