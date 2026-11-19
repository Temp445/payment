import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata = { title: "Secure Checkout" };

export default function CheckoutPage({ params }: { params: { session: string } }) {
  return <CheckoutForm session={decodeURIComponent(params.session)} />;
}

