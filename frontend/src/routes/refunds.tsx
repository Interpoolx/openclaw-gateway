import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { LegalLayout } from '../components/LegalLayout';

export const refundsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/refunds',
    component: RefundsPage,
}) as any;

function RefundsPage() {
    return (
        <LegalLayout title="Refund Policy" lastUpdated="February 8, 2026">
            <section>
                <h2>1. 14-Day Free Trial</h2>
                <p>
                    We offer a full 14-day free trial for the Command Center SaaS tier. No credit card is required to start the trial. This allows you to fully test the dashboard features with your self-hosted OpenClaw instances before committing to a subscription.
                </p>
            </section>

            <section>
                <h2>2. Subscription Billing</h2>
                <p>
                    Clawpute Command Center is billed on a monthly basis. You can cancel your subscription at any time through your account settings or via Paddle's customer portal.
                </p>
            </section>

            <section>
                <h2>3. Refund Eligibility</h2>
                <p>
                    Given the 14-day free trial period, we generally do not offer refunds after a subscription payment has been processed. We encourage all users to utilize the trial period to ensure the service meets their needs.
                </p>
            </section>

            <section>
                <h2>4. Exceptional Circumstances</h2>
                <p>
                    We may consider refund requests on a case-by-case basis in exceptional circumstances (e.g., technical issues on our end that prevented you from using the service during a billed period). Please contact support@clawpute.com within 7 days of the charge to initiate a request.
                </p>
            </section>

            <section>
                <h2>5. Cancellation</h2>
                <p>
                    When you cancel your subscription, you will continue to have access to the Command Center dashboard features until the end of your current billing period. No further charges will be made.
                </p>
            </section>

            <section>
                <h2>6. Self-Hosted Core</h2>
                <p>
                    Please note that OpenClaw Core is open-source and free to use. This refund policy only applies to the paid "Command Center" hosted dashboard service.
                </p>
            </section>
        </LegalLayout>
    );
}
