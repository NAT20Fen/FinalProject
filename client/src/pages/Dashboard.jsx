import { useQuery } from "@tanstack/react-query";
import { FileText, CreditCard } from "lucide-react";

export default function Dashboard() {
  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["/api/files"],
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/payments"],
  });

  return (
    <div className="container py-4">
      <h2 className="display-6 mb-4">Dashboard</h2>
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                <FileText size={20} className="text-primary" />
                Recent Files
              </h5>
            </div>
            <div className="card-body">
              {filesLoading ? (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: "300px" }}>
                  {files?.length === 0 ? (
                    <p className="text-muted text-center py-4">No files uploaded yet</p>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {files?.map((file) => (
                        <li key={file.id} className="list-group-item d-flex align-items-center gap-2">
                          <FileText size={16} className="text-primary" />
                          <span className="text-truncate">{file.filename}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                Recent Payments
              </h5>
            </div>
            <div className="card-body">
              {paymentsLoading ? (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: "300px" }}>
                  {payments?.length === 0 ? (
                    <p className="text-muted text-center py-4">No payments made yet</p>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {payments?.map((payment) => (
                        <li key={payment.id} className="list-group-item d-flex align-items-center justify-content-between">
                          <span className="fw-medium">${payment.amount}</span>
                          <span className={`badge ${payment.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                            {payment.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}