import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function Navbar() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/");
      alert("Logged out successfully");
    },
    onError: (error) => {
      alert("Logout failed: " + error.message);
    },
  });

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link href="/">
          <a className="navbar-brand fw-bold">CritNote</a>
        </Link>

        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {user && !isLoading && (
              <>
                <li className="nav-item">
                  <Link href="/dashboard">
                    <a className="nav-link">Dashboard</a>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/upload">
                    <a className="nav-link">Upload Files</a>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/notes">
                    <a className="nav-link">Notes</a>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link href="/payment">
                    <a className="nav-link">Payments</a>
                  </Link>
                </li>
              </>
            )}
          </ul>
          <div className="d-flex gap-2">
            {isLoading ? (
              <div className="text-light">Loading...</div>
            ) : user ? (
              <button 
                className="btn btn-outline-light"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </button>
            ) : (
              <>
                <Link href="/login">
                  <a className="btn btn-outline-light">Login</a>
                </Link>
                <Link href="/register">
                  <a className="btn btn-light">Register</a>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}