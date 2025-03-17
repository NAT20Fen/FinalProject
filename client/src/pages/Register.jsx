import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Register() {
  const [, navigate] = useLocation();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [alert, setAlert] = useState(null);

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const registerMutation = useMutation({
    mutationFn: async (data) => {
      const { confirmPassword, ...registerData } = data;
      const response = await apiRequest("POST", "/api/auth/register", registerData);
      return response.json();
    },
    onSuccess: (data) => {
      setRegisteredUsername(registerForm.getValues("username"));
      setShowConfirmation(true);
      setVerificationCode("");
      showAlert("Registration successful! Please check your email for the verification code");
    },
    onError: (error) => {
      showAlert(error.message, 'danger');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/confirm", {
        username: registeredUsername,
        code: verificationCode,
      });
      return response.json();
    },
    onSuccess: () => {
      navigate("/login");
      showAlert("Email verified! You can now log in with your credentials");
    },
    onError: (error) => {
      showAlert(error.message, 'danger');
    },
  });

  const onRegisterSubmit = (data) => {
    registerMutation.mutate(data);
  };

  const onConfirmSubmit = (e) => {
    e.preventDefault();
    if (verificationCode.length === 6) {
      confirmMutation.mutate();
    }
  };

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0">
                {showConfirmation ? "Verify Email" : "Register"}
              </h5>
            </div>
            <div className="card-body">
              {alert && (
                <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
                  {alert.message}
                  <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
                </div>
              )}
              {!showConfirmation ? (
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className={`form-control ${registerForm.formState.errors.username ? 'is-invalid' : ''}`}
                      {...registerForm.register("username")}
                    />
                    {registerForm.formState.errors.username && (
                      <div className="invalid-feedback">
                        {registerForm.formState.errors.username.message}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className={`form-control ${registerForm.formState.errors.email ? 'is-invalid' : ''}`}
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <div className="invalid-feedback">
                        {registerForm.formState.errors.email.message}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className={`form-control ${registerForm.formState.errors.password ? 'is-invalid' : ''}`}
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <div className="invalid-feedback">
                        {registerForm.formState.errors.password.message}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className={`form-control ${registerForm.formState.errors.confirmPassword ? 'is-invalid' : ''}`}
                      {...registerForm.register("confirmPassword")}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <div className="invalid-feedback">
                        {registerForm.formState.errors.confirmPassword.message}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Registering..." : "Register"}
                  </button>
                </form>
              ) : (
                <form onSubmit={onConfirmSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Verification Code</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setVerificationCode(value);
                      }}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                    {verificationCode.length > 0 && verificationCode.length < 6 && (
                      <div className="form-text text-danger">
                        Please enter all 6 digits
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={confirmMutation.isPending || verificationCode.length !== 6}
                  >
                    {confirmMutation.isPending ? "Verifying..." : "Verify Email"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}