import "./globals.css";

export const metadata = {
  title: "Interior AI — Room Redesign",
  description: "Transform any room with AI-powered interior design",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
