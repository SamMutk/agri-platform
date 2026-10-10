import { ArrowRight, CircleCheck, Tractor, Users, WalletCards } from "lucide-react";

export default function LandingPage({
  onGetStarted,
}: {
  onGetStarted: () => void;
}) {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-pattern" aria-hidden="true" />
        <div className="landing-hero-content">
          <div className="landing-copy">
            <span className="landing-eyebrow">
              <CircleCheck size={16} aria-hidden="true" />
              Farming equipment, made accessible
            </span>
            <h1>Grow more with the right machinery.</h1>
            <p>
              Find trusted agricultural equipment near you, or connect your
              machinery with farmers who need it. Simple bookings and secure
              M-Pesa escrow help every season run smoothly.
            </p>
            <button
              type="button"
              className="landing-cta"
              onClick={onGetStarted}
            >
              Get started
              <ArrowRight size={19} aria-hidden="true" />
            </button>
            <span className="landing-caption">
              Join as a farmer or equipment owner
            </span>
          </div>
          <div className="landing-visual" aria-hidden="true">
            <div className="landing-visual-orbit landing-visual-orbit-one" />
            <div className="landing-visual-orbit landing-visual-orbit-two" />
            <div className="landing-visual-icon">
              <Tractor />
            </div>
            <div className="landing-float-card landing-float-card-top">
              <span className="landing-float-icon">
                <Users size={19} />
              </span>
              <span>
                <strong>Built for local farms</strong>
                <small>Across counties in Kenya</small>
              </span>
            </div>
            <div className="landing-float-card landing-float-card-bottom">
              <span className="landing-float-icon">
                <WalletCards size={19} />
              </span>
              <span>
                <strong>Secure escrow</strong>
                <small>Protected M-Pesa payments</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-benefits" aria-label="How AgriShare helps">
        <article className="landing-benefit">
          <span className="landing-benefit-icon">
            <Tractor size={22} aria-hidden="true" />
          </span>
          <h2>Find the equipment you need</h2>
          <p>
            Farmers can explore available machinery and book it for their
            fields.
          </p>
        </article>
        <article className="landing-benefit">
          <span className="landing-benefit-icon">
            <Users size={22} aria-hidden="true" />
          </span>
          <h2>Put your machinery to work</h2>
          <p>
            Equipment owners can publish listings and connect with nearby
            farmers.
          </p>
        </article>
        <article className="landing-benefit">
          <span className="landing-benefit-icon">
            <WalletCards size={22} aria-hidden="true" />
          </span>
          <h2>Book with confidence</h2>
          <p>
            Keep bookings clear and payments protected with M-Pesa escrow.
          </p>
        </article>
      </section>
      <footer className="landing-footer">
        AgriShare Kenya <span>·</span> Better access for every growing season
      </footer>
    </div>
  );
}
