import type { Metadata } from "next";
import LegalChrome from "@/components/marketing/LegalChrome";

// NOTE: Starting template — fill in the [bracketed] details and have a lawyer
// review (especially the disclaimer, liability cap and governing law) before
// commercial launch. The engineering disclaimer is load-bearing for this product.
export const metadata: Metadata = { title: "Terms of Service · Tolerancing", robots: { index: false } };

export default function TermsPage() {
  return (
    <LegalChrome title="Terms of Service" updated="June 2026">
      <p>
        These terms govern your use of the Tolerancing service operated by [Operator legal name]
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the service you agree to them.
      </p>

      <div className="callout">
        <strong>Engineering disclaimer — please read.</strong> The calculators provide derived and, in
        some cases, estimated values as an <strong>engineering aid only</strong>. They are not a
        substitute for the governing standards (e.g. ISO 286, ISO 965, VDI 2230, ISO 6336, ASME Y14.5)
        or for qualified engineering judgement. You must independently verify every result against the
        applicable standard before relying on it. You are solely responsible for your designs,
        specifications and decisions. The service is provided &ldquo;as is&rdquo;, without warranty of
        accuracy, fitness for a particular purpose, or non-infringement.
      </div>

      <h2>Accounts</h2>
      <p>
        You must provide accurate information and keep your credentials secure. If you invite others
        into your workspace, you are responsible for their use of the service. You must be authorised to
        act for the organisation you represent.
      </p>

      <h2>Subscriptions and billing</h2>
      <ul>
        <li>We offer a free tier and paid plans. Paid plans are billed through Stripe.</li>
        <li>Paid subscriptions renew automatically each period until cancelled.</li>
        <li>You can cancel at any time from the customer portal; access continues until the end of the paid period.</li>
        <li>Except where required by law, fees are non-refundable.</li>
        <li>We may change prices with reasonable advance notice; changes take effect on your next renewal.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        You agree not to misuse the service — including unlawful use, attempting to breach security or
        access other tenants&rsquo; data, reverse-engineering, reselling access, or overloading the
        service.
      </p>

      <h2>Your content</h2>
      <p>
        You retain ownership of the data and content you create. You grant us the limited rights needed
        to host and operate the service for you. We retain ownership of the software and underlying IP.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for any indirect, incidental or
        consequential damages, or for any loss arising from reliance on calculation results. Our total
        aggregate liability is limited to the fees you paid for the service in the twelve months before
        the event giving rise to the claim.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the service and delete your account at any time. We may suspend or terminate
        access for breach of these terms or to protect the service.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of Switzerland. The exclusive place of jurisdiction is
        [your canton/city], Switzerland, subject to any mandatory consumer-protection rules.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms; material changes will be posted here with a new &ldquo;last
        updated&rdquo; date. Continued use after changes means you accept them.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms: [contact@your-domain]. See also the <a href="/privacy">Privacy Policy</a>.</p>
    </LegalChrome>
  );
}
