import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { LegalLayout } from '../components/LegalLayout';

export const termsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/terms',
    component: TermsPage,
}) as any;

function TermsPage() {
    return (
        <LegalLayout title="Terms of Service" lastUpdated="February 8, 2026">
            <section>
                <h2>1. Acceptance of Terms</h2>
                <p>
                    By accessing or using Clawpute Command Center ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                </p>
            </section>

            <section>
                <h2>2. Description of Service</h2>
                <p>
                    Clawpute Command Center provides a SaaS dashboard for managing self-hosted AI agents running on the OpenClaw framework. The Service includes real-time monitoring, analytics, and multi-instance management.
                </p>
            </section>

            <section>
                <h2>3. User Responsibilities</h2>
                <p>
                    You are responsible for:
                </p>
                <ul>
                    <li>Maintaining the security of your self-hosted OpenClaw instances.</li>
                    <li>Ensuring your use of AI models complies with the respective providers' terms (e.g., OpenAI, Anthropic, Google).</li>
                    <li>All activities that occur under your account.</li>
                </ul>
            </section>

            <section>
                <h2>4. SaaS Subscription</h2>
                <p>
                    The Command Center tier is billed on a monthly basis at $69/month. We offer a 14-day free trial for new users. Failure to pay will result in the suspension of access to the hosted dashboard features. Self-hosted OpenClaw Core remains free under the MIT license independently of the SaaS subscription.
                </p>
            </section>

            <section>
                <h2>5. Data Privacy & Ownership</h2>
                <p>
                    Your AI agent conversations remain on your infrastructure. Clawpute Command Center only accesses your instances via API to provide monitoring and analytics services. We do not store your raw conversation logs unless you explicitly enable hosted history features.
                </p>
            </section>

            <section>
                <h2>6. Limitation of Liability</h2>
                <p>
                    Clawpute shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the Service or for cost of procurement of substitute goods and services.
                </p>
            </section>

            <section>
                <h2>7. Changes to Terms</h2>
                <p>
                    We reserve the right to modify these terms at any time. Your continued use of the Service following any changes constitutes your acceptance of the new terms.
                </p>
            </section>
        </LegalLayout>
    );
}
