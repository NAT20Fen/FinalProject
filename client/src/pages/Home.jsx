import { Link } from "wouter";
import { FileText, CreditCard, Upload } from "lucide-react";

export default function Home() {
  return (
    <div className="container py-5">
      <header className="text-center mb-5">
        <h1 className="display-4 fw-bold mb-3">
          Welcome to <span className="text-primary border-bottom border-primary pb-1">CritNote</span>
        </h1>
        <p className="lead text-muted">
          Your all-in-one solution for file management and payments
        </p>
      </header>

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title d-flex align-items-center gap-2 mb-3">
                <FileText size={20} className="text-primary" />
                File Management
              </h5>
              <p className="card-text text-muted flex-grow-1 mb-4">
                Securely store and manage your files in the cloud
              </p>
              <Link href="/upload">
                <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2 w-100">
                  <Upload size={16} />
                  Start Uploading
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title d-flex align-items-center gap-2 mb-3">
                <CreditCard size={20} className="text-primary" />
                Payments
              </h5>
              <p className="card-text text-muted flex-grow-1 mb-4">
                Process payments securely and efficiently
              </p>
              <Link href="/payment">
                <button className="btn btn-outline-primary w-100">
                  View Payments
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-grid-1x2-fill text-primary"></i>
                Dashboard
              </h5>
              <p className="card-text text-muted flex-grow-1 mb-4">
                Get an overview of all your activities
              </p>
              <Link href="/dashboard">
                <button className="btn btn-outline-secondary w-100">
                  Go to Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}