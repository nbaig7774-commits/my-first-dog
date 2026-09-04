import "./globals.css";

export const metadata = {
  title: "My First Dog",
  description: "Your dog's care, health and routines in one place.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}