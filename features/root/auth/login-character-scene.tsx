"use client";

import { motion, useReducedMotion } from "motion/react";

export type LoginCharacterMood = "idle" | "watching" | "hiding" | "peeking" | "error" | "loading";

export function LoginCharacterScene({ mood }: { mood: LoginCharacterMood }) {
  const reduceMotion = useReducedMotion();
  const isHiding = mood === "hiding";
  const isPeeking = mood === "peeking";
  const isError = mood === "error";
  const isLoading = mood === "loading";
  const eyeStyle = isHiding && !isPeeking ? "closed" : mood === "watching" ? "side" : "open";

  return (
    <div className="login-scene" aria-hidden="true">
      <div className="login-scene__glow" />
      <div className="login-scene__label">
        <span className="login-scene__dot" />
        {isError ? "Let’s try that again" : isLoading ? "Checking your details" : "Your workspace, in one place"}
      </div>

      <motion.div
        className="login-characters"
        animate={isError && !reduceMotion ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
      >
        <motion.div
          className="login-character login-character--blue"
          animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <CharacterFace eyeStyle={eyeStyle} mood={mood} />
        </motion.div>
        <motion.div
          className="login-character login-character--navy"
          animate={reduceMotion ? undefined : { y: [0, 5, 0] }}
          transition={{ duration: 3.7, repeat: Infinity, ease: "easeInOut", delay: 0.25 }}
        >
          <CharacterFace eyeStyle={isHiding && !isPeeking ? "closed" : "open"} mood={mood} />
        </motion.div>
        <motion.div
          className="login-character login-character--red"
          animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 3.3, repeat: Infinity, ease: "easeInOut", delay: 0.45 }}
        >
          <CharacterFace eyeStyle={isError ? "wide" : eyeStyle} mood={mood} />
        </motion.div>
        <div className="login-character login-character--yellow">
          <CharacterFace eyeStyle={isError ? "wide" : eyeStyle} mood={mood} />
        </div>
      </motion.div>

      <motion.div
        className="login-scene__note"
        animate={isError && !reduceMotion ? { rotate: [-2, 2, -2], scale: [1, 1.03, 1] } : { rotate: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <span>{isError ? "No worries. Check your details and try again." : "Sign in to keep your counter moving."}</span>
        <span className="login-scene__note-mark">*</span>
      </motion.div>
    </div>
  );
}

function CharacterFace({
  eyeStyle,
  mood,
}: {
  eyeStyle: "closed" | "open" | "side" | "wide";
  mood: LoginCharacterMood;
}) {
  return (
    <div className={`login-face login-face--${eyeStyle}`}>
      <span className="login-face__eye login-face__eye--left" />
      <span className="login-face__eye login-face__eye--right" />
      <span className={`login-face__mouth login-face__mouth--${mood === "error" ? "worried" : "smile"}`} />
    </div>
  );
}
