"use client";

import { useState, useEffect } from "react";

// ── Message sets ───────────────────────────────────────────────────────────────

const SIGNUP_MESSAGES = [
  { emoji: "🧠", text: "Initialising your AI copilot…" },
  { emoji: "🔬", text: "Calibrating insurance rule engine…" },
  { emoji: "📋", text: "Fine-tuning claim detection…" },
  { emoji: "🏥", text: "Setting up your clinic workspace…" },
  { emoji: "✨", text: "Personalising your dashboard…" },
  { emoji: "🚀", text: "Almost ready — this is exciting!" },
];

const LOGIN_MESSAGES = [
  { emoji: "👋", text: "Welcome back!" },
  { emoji: "⚡", text: "Loading your workspace…" },
  { emoji: "📊", text: "Syncing latest activity…" },
  { emoji: "✅", text: "All set — heading in!" },
];

// ── Floating particle (pure CSS, no canvas) ────────────────────────────────────

function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        borderRadius: "50%",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface LaunchScreenProps {
  /** Called when the animation finishes — do your router.push here */
  onDone: () => void;
  /** "signup" shows a longer, more enthusiastic sequence; "login" is shorter */
  variant?: "signup" | "login";
  /** Optional clinic name shown beneath the logo */
  clinicName?: string;
}

export function LaunchScreen({
  onDone,
  variant = "login",
  clinicName,
}: LaunchScreenProps) {
  const messages = variant === "signup" ? SIGNUP_MESSAGES : LOGIN_MESSAGES;
  const totalMs = variant === "signup" ? 4200 : 2800;
  const perMsg = totalMs / messages.length;

  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const start = Date.now();

    // Smooth progress
    const progIv = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / totalMs) * 100, 100));
    }, 40);

    // Cycle messages
    const msgIv = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, messages.length - 1));
    }, perMsg);

    // Fade-out then call onDone
    const fadeTimer = setTimeout(() => setFadeOut(true), totalMs - 400);
    const doneTimer = setTimeout(() => {
      clearInterval(progIv);
      clearInterval(msgIv);
      onDone();
    }, totalMs);

    return () => {
      clearInterval(progIv);
      clearInterval(msgIv);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(145deg, #080e1c 0%, #0b1a2e 45%, #091f1c 100%)",
        opacity: fadeOut ? 0 : 1,
        transition: fadeOut ? "opacity 0.4s ease-out" : "none",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes ls-blob-a {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(40px,-30px) scale(1.08); }
        }
        @keyframes ls-blob-b {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-50px,45px) scale(1.06); }
        }
        @keyframes ls-logo-glow {
          0%,100% { box-shadow: 0 0 50px rgba(20,184,166,0.55), 0 0 100px rgba(15,118,110,0.3); }
          50%      { box-shadow: 0 0 80px rgba(20,184,166,0.75), 0 0 150px rgba(15,118,110,0.5); }
        }
        @keyframes ls-msg-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ls-float-1 {
          0%   { transform: translateY(0)    opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-120px); opacity: 0; }
        }
        @keyframes ls-float-2 {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          15%  { opacity: 0.8; }
          85%  { opacity: 0.4; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
        @keyframes ls-float-3 {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          20%  { opacity: 0.6; }
          80%  { opacity: 0.3; }
          100% { transform: translateY(-140px) translateX(-15px); opacity: 0; }
        }
        @keyframes ls-ring-1 {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes ls-ring-2 {
          0%   { transform: scale(1);   opacity: 0.35; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes ls-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Background blobs */}
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <div
          style={{
            position: "absolute",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(15,118,110,0.18) 0%, transparent 65%)",
            top: "-25%",
            left: "-18%",
            animation: "ls-blob-a 12s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 65%)",
            bottom: "-15%",
            right: "-15%",
            animation: "ls-blob-b 16s ease-in-out infinite",
          }}
        />
      </div>

      {/* Floating particles */}
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {[
          {
            size: 6,
            color: "rgba(20,184,166,0.6)",
            left: "35%",
            bottom: "30%",
            anim: "ls-float-1 3.2s ease-out infinite 0s",
          },
          {
            size: 4,
            color: "rgba(15,118,110,0.5)",
            left: "48%",
            bottom: "25%",
            anim: "ls-float-2 4.1s ease-out infinite 0.6s",
          },
          {
            size: 5,
            color: "rgba(20,184,166,0.4)",
            left: "60%",
            bottom: "35%",
            anim: "ls-float-3 3.7s ease-out infinite 1.1s",
          },
          {
            size: 3,
            color: "rgba(99,102,241,0.4)",
            left: "42%",
            bottom: "20%",
            anim: "ls-float-1 4.5s ease-out infinite 1.8s",
          },
          {
            size: 7,
            color: "rgba(14,165,233,0.3)",
            left: "55%",
            bottom: "28%",
            anim: "ls-float-2 3.9s ease-out infinite 0.3s",
          },
          {
            size: 4,
            color: "rgba(20,184,166,0.5)",
            left: "38%",
            bottom: "40%",
            anim: "ls-float-3 4.3s ease-out infinite 2.1s",
          },
        ].map((p, i) => (
          <Particle
            key={i}
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              left: p.left,
              bottom: p.bottom,
              animation: p.anim,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div style={{ position: "relative", marginBottom: 56, zIndex: 1 }}>
        {/* Pulse rings */}
        <div
          style={{
            position: "absolute",
            inset: -16,
            borderRadius: "50%",
            border: "1.5px solid rgba(20,184,166,0.3)",
            animation: "ls-ring-1 2.5s ease-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: -16,
            borderRadius: "50%",
            border: "1.5px solid rgba(20,184,166,0.2)",
            animation: "ls-ring-2 2.5s ease-out infinite 0.5s",
          }}
        />

        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 26,
            background:
              "linear-gradient(135deg, #0f766e 0%, #14b8a6 60%, #0ea5e9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 800,
            color: "#fff",
            animation: "ls-logo-glow 2.5s ease-in-out infinite",
            position: "relative",
          }}
        >
          +
        </div>
      </div>

      {/* Brand */}
      <div style={{ zIndex: 1, textAlign: "center", marginBottom: 48 }}>
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.05em",
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          DentalIQ
        </div>
        {clinicName && (
          <div
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.45)",
              fontWeight: 400,
            }}
          >
            {clinicName}
          </div>
        )}
      </div>

      {/* Animated message */}
      <div
        style={{ zIndex: 1, textAlign: "center", marginBottom: 44, height: 56 }}
      >
        <div
          key={msgIdx}
          style={{
            animation: "ls-msg-in 0.45s cubic-bezier(0.4,0,0.2,1) both",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>
            {messages[msgIdx]?.emoji}
          </div>
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {messages[msgIdx]?.text}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ zIndex: 1, width: 260, position: "relative" }}>
        <div
          style={{
            height: 3,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #0f766e, #14b8a6, #0ea5e9)",
              borderRadius: 2,
              transition: "width 0.08s linear",
              boxShadow: "0 0 12px rgba(20,184,166,0.8)",
            }}
          />
        </div>
        {/* Animated dots below bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginTop: 20,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "rgba(20,184,166,0.6)",
                animation: `ls-float-${i + 1} 1.2s ease-in-out infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
