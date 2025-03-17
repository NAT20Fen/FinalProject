import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card mx-auto" style={{ maxWidth: "400px" }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-3">
            <AlertCircle className="text-danger" size={32} />
            <h1 className="h4 mb-0">404 Page Not Found</h1>
          </div>

          <p className="text-muted mb-4">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link href="/">
            <button className="btn btn-primary w-100">
              Return to Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}