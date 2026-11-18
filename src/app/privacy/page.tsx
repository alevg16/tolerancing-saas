import type { Metadata } from "next";
import LegalChrome from "@/components/marketing/LegalChrome";

// NOTE: Starting template — fill in the [bracketed] operator details and have a
// lawyer review for Swiss revDSG / EU GDPR compliance before commercial launch.
export const metadata: Metadata = { title: "Privacy Policy · Tolerancing", robots: { index: false } };

export default function PrivacyPage() {
  return (
    <LegalChrome title="Privacy Policy" updated="June 2026">
      <p>
        This policy explains what personal data Tolerancing (&ldquo;we&rdquo;) processes, why, and the
        rights you have. We process data in accordance with the Swiss Federal Act on Data Protection
        (revDSG) and, where applicable, the EU General Data Protection Regulation (GDPR).
      </p>

      <h2>Controller</h2>
      <p>
        [Operator legal name], [address], Switzerland — [contact@your-domain]. See the{" "}
        <a href="/imprint">Imprint</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — your email address and name, to create and secure your account.</li>
        <li><strong>Workspace content</strong> — the projects, standards-library entries and report settings you create.</li>
        <li><strong>Billing data</strong> — handled by our payment processor (Stripe). We store only a customer/subscription identifier and plan status; we never see or store your full card details.</li>
        <li><strong>Technical data</strong> — essential session cookies and basic server logs needed to run the service securely.</li>
      </ul>

      <h2>Why we process it (legal basis)</h2>
      <ul>
        <li>To provide the service and your account — performance of our contract with you.</li>
        <li>To take payment and manage subscriptions — performance of contract.</li>
        <li>To keep the service secure and prevent abuse — our legitimate interest.</li>
        <li>To meet legal and accounting obligations.</li>
      </ul>

      <h2>Processors we use</h2>
      <ul>
        <li><strong>Supabase</strong> — database, authentication and hosting.</li>
        <li><strong>Stripe</strong> — payment processing and subscription management.</li>
      </ul>
      <p>
        These providers act on our instructions under data-processing agreements. Some processing may
        take place in the EU or the United States under appropriate safeguards (e.g. standard
        contractual clauses).
      </p>

      <h2>Cookies</h2>
      <p>
        We use only essential cookies required to keep you signed in. We do not use advertising or
        cross-site tracking cookies.
      </p>

      <h2>Retention</h2>
      <p>
        We keep your data for as long as your account is active. When you delete your account, or on
        request, we delete or anonymise your personal data except where we must retain it to meet
        legal obligations (e.g. invoicing records).
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access to, correction or deletion of your personal data, restrict or object to
        processing, and request portability. Contact us at [contact@your-domain]. You also have the
        right to lodge a complaint with the Swiss Federal Data Protection and Information Commissioner
        (FDPIC) or your local supervisory authority.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy; material changes will be posted here with a new &ldquo;last
        updated&rdquo; date.
      </p>
    </LegalChrome>
  );
}
