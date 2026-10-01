"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { createClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "failed"; message: string };

export default function SignInForm({ linkFailed }: { linkFailed: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const address = email.trim();

  async function sendLink(event: FormEvent) {
    event.preventDefault();

    if (status.kind === "sending") {
      return;
    }

    setStatus({ kind: "sending" });

    // Signs up new addresses too, so one link serves both.
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
    });

    setStatus(
      error ? { kind: "failed", message: error.message } : { kind: "sent" },
    );
  }

  return (
    <main className="sign-in">
      <Image
        src="/icons/idea_design_logo.svg"
        alt="Idea Design"
        width={39.0132}
        height={6.50147}
        loading="eager"
        className="sign-in-logo"
      />

      <div className="sign-in-content">
        <ThinkingOrb
          state="composing"
          size={64}
          theme="dark"
          aria-hidden="true"
          className="sign-in-orb"
        />

        {/* Keyed so each step plays its entrance. */}
        {status.kind === "sent" ? (
          <div key="sent" className="sign-in-step" aria-live="polite">
            <h1 className="eyebrow">Check Your Email</h1>
            <p className="sign-in-text">{address}</p>
            <div className="sign-in-footer">
              <p className="sign-in-hint">
                Open the link we sent to sign in. It works once and expires in
                an hour.
              </p>
              <button
                type="button"
                className="menu-item -mr-2 shrink-0"
                onClick={() => setStatus({ kind: "idle" })}
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <form key="form" className="sign-in-step" onSubmit={sendLink}>
            <h1 className="eyebrow">Sign In</h1>
            <label className="sign-in-field sign-in-text">
              <span className="sr-only">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="What’s your email?"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <div className="sign-in-footer">
              <p
                className="sign-in-hint"
                role={status.kind === "failed" ? "alert" : undefined}
              >
                {status.kind === "failed"
                  ? status.message
                  : linkFailed
                    ? "That link has expired or was already used. Send a new one."
                    : "We’ll email you a link to sign in or create your account."}
              </p>
              <button
                type="submit"
                className="sign-in-submit"
                disabled={!/^\S+@\S+\.\S+$/.test(address)}
              >
                {status.kind === "sending" ? "Sending…" : "Send Link"}
                <ArrowRight aria-hidden="true" size={11} strokeWidth={1.5} />
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
