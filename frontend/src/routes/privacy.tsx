import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { LegalLayout } from '../components/LegalLayout';

export const privacyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/privacy',
    component: PrivacyPage,
}) as any;

function PrivacyPage() {
    return (
        <LegalLayout title="Privacy Policy" lastUpdated="February 8, 2026">
            <section>
                <h2>1. Information We Collect</h2>
                <p>
                    We collect minimal information to provide the Command Center service:
                </p>
                <ul>
                    <li><strong>Account Information:</strong> Name, email address, and billing details provided via Paddle.</li>
                    <li><strong>Usage Data:</strong> Aggregated, non-identifying information about how you use the dashboard.</li>
                    <li><strong>Connection Metadata:</strong> Instance status and basic performance metrics from your connected OpenClaw servers.</li>
                </ul>
            </section>

            <section>
                <h2>2. How We Use Your Information</h2>
                <p>
                    We use the collected information to:
                </p>
                <ul>
                    <li>Provide, maintain, and improve the Command Center dashboard.</li>
                    <li>Process your subscription payments via our payment processor.</li>
                    <li>Send important service updates or support communications.</li>
                </ul>
            </section>

            <section>
                <h2>3. Data Ownership & Self-Hosting</h2>
                <p>
                    Clawpute is built on a "Privacy First" philosophy. Your AI agents and their conversation logs are hosted on your own infrastructure. Our dashboard connects to your instances via secure API calls. We do not have access to your private infrastructure beyond the API endpoints you expose to us.
                </p>
            </section>

            <section>
                <h2>4. Third-Party Services</h2>
                <p>
                    We use Paddle as our merchant of record for payment processing. Their privacy policy governs the handling of your billing information. We also integrate with various AI model providers (OpenAI, Anthropic, etc.) based on the keys you provide to your self-hosted instances.
                </p>
            </section>

            <section>
                <h2>5. Cookies</h2>
                <p>
                    We use essential cookies to maintain your session and security. We do not use tracking cookies for advertising purposes.
                </p>
            </section>

            <section>
                <h2>6. Your Rights</h2>
                <p>
                    You have the right to access, correct, or delete your personal information stored on our servers. Since most of your data is self-hosted, you maintain primary control over your AI data directly.
                </p>
            </section>

            <section>
                <h2>7. Contact Us</h2>
                <p>
                    If you have questions about this Privacy Policy, please contact us at privacy@clawpute.com.
                </p>
            </section>
        </LegalLayout>
    );
}
