import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground" data-testid="heading-terms-conditions">Terms and Conditions</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-last-updated">Last updated: January 2026</p>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-6" data-testid="content-terms-conditions">
          <section data-testid="section-acceptance">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Diolab's diagnostic center management platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section data-testid="section-description">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Diolab provides a comprehensive SaaS platform for diagnostic and pathology centers, including patient management, lab test tracking, billing, reporting, inventory management, and multi-branch operations with AI-powered features.
            </p>
          </section>

          <section data-testid="section-user-accounts">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">When you create an account with us, you must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate, complete, and current information</li>
              <li>Maintain the security of your password and accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access or security breaches</li>
              <li>Not share your account credentials with others</li>
            </ul>
          </section>

          <section data-testid="section-acceptable-use">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload or transmit viruses, malware, or malicious code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with other users' use of the Service</li>
              <li>Copy, modify, or distribute our content without permission</li>
              <li>Use the Service to store or process information that violates any laws or regulations</li>
            </ul>
          </section>

          <section data-testid="section-medical-disclaimer">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">5. Medical Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              Diolab is a management tool and does not provide medical advice, diagnosis, or treatment. AI-generated suggestions and summaries are for informational purposes only and should be reviewed by qualified healthcare professionals. Always consult with a licensed physician for medical decisions.
            </p>
          </section>

          <section data-testid="section-payment-billing">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">6. Payment and Billing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">For paid subscriptions:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable unless otherwise stated</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
              <li>Failure to pay may result in service suspension or termination</li>
            </ul>
          </section>

          <section data-testid="section-data-ownership">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">7. Data Ownership and Responsibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all data you input into the Service. You are responsible for the accuracy and legality of the data you upload. We are not liable for data loss due to user error, and we recommend regular backups of critical information.
            </p>
          </section>

          <section data-testid="section-intellectual-property">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of the Service are owned by Diolab and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section data-testid="section-limitation-liability">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Diolab shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section data-testid="section-service-availability">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">10. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. We may perform maintenance or updates that temporarily affect availability. We are not liable for any interruptions beyond our reasonable control.
            </p>
          </section>

          <section data-testid="section-termination">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account at any time for violations of these Terms. You may cancel your account at any time. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section data-testid="section-changes-terms">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes. Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section data-testid="section-governing-law">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of India.
            </p>
          </section>

          <section data-testid="section-contact">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us at:
            </p>
            <ul className="list-none text-muted-foreground mt-3 space-y-1">
              <li>Email: <a href="mailto:connect@diolab.in">connect@diolab.in</a></li>
              <li>Address: Diolab Technologies, India</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
