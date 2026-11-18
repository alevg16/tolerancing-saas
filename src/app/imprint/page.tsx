import type { Metadata } from "next";
import LegalChrome from "@/components/marketing/LegalChrome";

// NOTE: Starting template — replace the [bracketed] operator details with your
// real legal name, address and contact before commercial launch, and have a
// lawyer review. Swiss sites operating commercially need an accurate Impressum.
export const metadata: Metadata = { title: "Imprint · Tolerancing", robots: { index: false } };

export default function ImprintPage() {
  return (
    <LegalChrome title="Imprint" updated="June 2026">
      <h2>Operator</h2>
      <p>
        This website and the Tolerancing service are operated by:
      </p>
      <p>
        <strong>[Operator legal name]</strong><br />
        [Street and number]<br />
        [Postal code and city]<br />
        Switzerland
      </p>

      <h2>Contact</h2>
      <p>
        Email: [contact@your-domain]<br />
        [Phone, optional]
      </p>

      <h2>Responsible for content</h2>
      <p>[Name of the person responsible for the content], at the address above.</p>

      <h2>Disclaimer</h2>
      <p>
        The calculators and analyses provided are engineering aids. Despite careful preparation,
        no guarantee is given for the accuracy, completeness or timeliness of the content. All
        results must be independently verified against the governing standards and sound
        engineering judgement before use. See the <a href="/terms">Terms of Service</a>.
      </p>
    </LegalChrome>
  );
}
