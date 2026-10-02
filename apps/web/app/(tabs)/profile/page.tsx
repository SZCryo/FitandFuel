"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  clearDemoSession,
  formatGoal,
  getApiStatus,
  loadDemoSession,
  normalizeDemoSession,
  saveDemoSession,
  useDemoSession,
} from "../../../lib/demo";

export default function ProfilePage() {
  const [apiStatus, setApiStatus] = useState<"live" | "offline">("offline");
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const session = useDemoSession();

  useEffect(() => {
    getApiStatus().then(setApiStatus);
  }, []);

  const profile = session?.profile;

  function exportSession() {
    const payload = JSON.stringify(loadDemoSession(), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "liftfuel-session.json";
    link.click();
    URL.revokeObjectURL(url);
    setSessionMessage("Session exported.");
  }

  function importSession() {
    const raw = window.prompt("Paste exported session JSON");

    if (!raw) {
      return;
    }

    try {
      saveDemoSession(normalizeDemoSession(JSON.parse(raw)));
      setSessionMessage("Session imported.");
    } catch {
      setSessionMessage("Could not import that session.");
    }
  }

  function resetSession() {
    clearDemoSession();
    setSessionMessage("Session cleared.");
  }

  return (
    <section className="page-card">
      <div className="section-head">
        <div>
          <h1>Profile</h1>
          <p>Your saved Lift &amp; Fuel profile and current API connection state.</p>
        </div>
        <span className={`status-pill status-pill--${apiStatus}`}>{apiStatus === "live" ? "API connected" : "API offline"}</span>
      </div>

      {profile ? (
        <>
          <div className="info-grid">
            <div className="info-block">
              <span className="info-label">Name</span>
              <span>{profile.name}</span>
            </div>
            <div className="info-block">
              <span className="info-label">User ID</span>
              <span>{profile.user_id}</span>
            </div>
            <div className="info-block">
              <span className="info-label">Age</span>
              <span>{profile.age}</span>
            </div>
            <div className="info-block">
              <span className="info-label">Height</span>
              <span>{profile.height_cm} cm</span>
            </div>
            <div className="info-block">
              <span className="info-label">Weight</span>
              <span>{profile.weight_kg} kg</span>
            </div>
            <div className="info-block">
              <span className="info-label">Goal</span>
              <span>{formatGoal(profile.goal_mode)}</span>
            </div>
            <div className="info-block">
              <span className="info-label">Activity</span>
              <span>{profile.activity_level.replaceAll("_", " ")}</span>
            </div>
            <div className="info-block">
              <span className="info-label">Food filters</span>
              <span>{profile.dietary_preferences.length ? profile.dietary_preferences.join(", ") : "None"}</span>
            </div>
            <div className="info-block">
              <span className="info-label">Equipment</span>
              <span>{profile.equipment.join(", ")}</span>
            </div>
          </div>
          <div className="stack-block">
            <h2>Session tools</h2>
            <div className="button-row">
              <button type="button" className="button button--secondary action-button" onClick={exportSession}>
                Export
              </button>
              <button type="button" className="button button--secondary action-button" onClick={importSession}>
                Import
              </button>
              <button type="button" className="button button--secondary action-button" onClick={resetSession}>
                Reset
              </button>
            </div>
            {sessionMessage ? <p>{sessionMessage}</p> : null}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>No profile saved yet.</p>
          <Link href="/onboarding" className="button button--primary">
            Start onboarding
          </Link>
        </div>
      )}
    </section>
  );
}
