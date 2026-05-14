import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold text-foreground" data-testid="heading-privacy-policy">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-last-updated">Last updated: January 2026</p>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-6" data-testid="content-privacy-policy">
          <section data-testid="section-introduction">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Diolab ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our diagnostic center management platform.
            </p>
          </section>

          <section data-testid="section-information-collect">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect the following types of information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Personal Information:</strong> Name, email address, phone number, date of birth, gender, and address.</li>
              <li><strong>Medical Information:</strong> Lab test results, medical history, diagnostic reports, and health-related data.</li>
              <li><strong>Business Information:</strong> Organization details, billing information, and staff credentials.</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and usage patterns.</li>
            </ul>
          </section>

          <section data-testid="section-how-we-use">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use the collected information to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and maintain our diagnostic center management services</li>
              <li>Process and manage patient records and lab reports</li>
              <li>Generate invoices and manage billing operations</li>
              <li>Enable AI-powered features for test suggestions and report summaries</li>
              <li>Send notifications about appointments, reports, and important updates</li>
              <li>Improve our services and develop new features</li>
              <li>Comply with legal and regulatory requirements</li>
            </ul>
          </section>

          <section data-testid="section-data-security">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption, secure data storage, access controls, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section data-testid="section-data-sharing">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We may share your information with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Healthcare providers and diagnostic centers you authorize</li>
              <li>Third-party service providers who assist in our operations (under strict confidentiality agreements)</li>
              <li>Legal authorities when required by law or to protect our rights</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section data-testid="section-your-rights">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal requirements)</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section data-testid="section-cookies">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and remember your preferences. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section data-testid="section-childrens-privacy">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not intended for children under 13. We do not knowingly collect personal information from children. If we discover that a child under 13 has provided us with personal information, we will delete it promptly.
            </p>
          </section>

          <section data-testid="section-changes">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section data-testid="section-contact">
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
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
