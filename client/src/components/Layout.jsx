import { Navbar } from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="min-vh-100 bg-light">
      <Navbar />
      <main className="container py-4">
        {children}
      </main>
    </div>
  );
}