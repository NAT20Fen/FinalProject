import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLISHABLE_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ amount, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        showAlert(error.message, 'danger');
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        showAlert("Payment successful! Thank you for your payment.");
        onSuccess();
      }
    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}
      <PaymentElement options={{
        layout: {
          type: 'tabs',
          defaultCollapsed: false
        },
        paymentMethodOrder: ['card'],
        defaultValues: {
          billingDetails: {
            name: '',
            email: '',
            phone: '',
            address: {
              country: 'US',
            },
          },
        },
      }} />
      <button
        type="submit"
        className="btn btn-primary w-100 mt-3"
        disabled={!stripe || isLoading}
      >
        {isLoading ? "Processing..." : `Pay $${amount}`}
      </button>
    </form>
  );
}

export default function Payment() {
  const [amount, setAmount] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const createPaymentIntent = async (amount) => {
    try {
      const response = await apiRequest("POST", "/api/create-payment-intent", { amount: parseFloat(amount) });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      showAlert(error.message, 'danger');
    }
  };

  const handleAmountSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showAlert("Please enter a valid amount greater than 0", 'danger');
      return;
    }
    createPaymentIntent(amount);
  };

  const handleSuccess = () => {
    setClientSecret("");
    setAmount("");
  };

  return (
    <div className="container py-4">
      <h2 className="display-6 mb-4">Make a Payment</h2>
      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                <CreditCard className="text-primary" size={20} />
                Card Payment
              </h5>
            </div>
            <div className="card-body">
              {!clientSecret ? (
                <form onSubmit={handleAmountSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Amount ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100">Continue to Payment</button>
                </form>
              ) : (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <CheckoutForm amount={amount} onSuccess={handleSuccess} />
                </Elements>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}