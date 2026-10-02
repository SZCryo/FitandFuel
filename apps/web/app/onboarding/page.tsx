"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, startTransition, useMemo, useState } from "react";

import {
  ActivityLevel,
  GoalMode,
  createMealProgress,
  createProfile,
  generatePlan,
  saveDemoSession,
} from "../../lib/demo";

const goalOptions: Array<{ value: GoalMode; label: string }> = [
  { value: "lose_fat", label: "Lose fat" },
  { value: "maintain", label: "Maintain" },
  { value: "build_muscle", label: "Build muscle" },
  { value: "stay_consistent", label: "Stay consistent" },
];

const activityOptions: Array<{ value: ActivityLevel; label: string }> = [
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "very_high", label: "Very high" },
];

const filterOptions = [
  { value: "high_protein", label: "High protein" },
  { value: "dairy_free", label: "Dairy free" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "no_shellfish", label: "No shellfish" },
];

const equipmentOptions = [
  { value: "full_gym", label: "Full gym" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "bands", label: "Bands" },
  { value: "bodyweight", label: "Bodyweight" },
];

function toggleChoice(current: string[], nextValue: string): string[] {
  return current.includes(nextValue)
    ? current.filter((value) => value !== nextValue)
    : [...current, nextValue];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goalMode, setGoalMode] = useState<GoalMode>("lose_fat");
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(["high_protein"]);
  const [equipment, setEquipment] = useState<string[]>(["full_gym"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(name.trim() && age && heightCm && weightKg && equipment.length > 0);
  }, [age, equipment.length, heightCm, name, weightKg]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Finish filling out your information");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const profile = await createProfile({
        name: name.trim(),
        age: Number(age),
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        activity_level: activityLevel,
        goal_mode: goalMode,
        dietary_preferences: dietaryPreferences,
        equipment,
      });

      const plan = await generatePlan(profile.user_id, profile);

      saveDemoSession({
        profile,
        plan,
        currentWorkout: null,
        workoutHistory: [],
        customWorkouts: [],
        mealProgress: createMealProgress(plan),
        mealHistory: {},
        tabsUnlocked: false,
      });

      startTransition(() => {
        router.push("/meal-plan");
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not create a plan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell shell--landing">
      <section className="page-card onboarding-header">
        <span className="eyebrow">Start plan</span>
        <div className="section-title">
          <h1>Build your profile</h1>
          <p className="section-copy">Set your baseline, choose your focus, and generate your first Lift &amp; Fuel plan.</p>
        </div>
      </section>

      <form className="onboarding-grid" onSubmit={handleSubmit}>
        <section className="form-card form-card--planner">
          <div className="planner-section-title">
            <h2>Basic info</h2>
          </div>
          <div className="planner-input-grid">
            <label>
              <span>Name</span>
              <input type="text" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter Name" />
            </label>
            <label>
              <span>Age</span>
              <input type="number" min="13" max="100" value={age} onChange={(event) => setAge(event.target.value)} placeholder="Enter Age" />
            </label>
            <label>
              <span>Height (cm)</span>
              <input type="number" min="100" max="260" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} placeholder="Enter height in cm" />
            </label>
            <label>
              <span>Weight (kg)</span>
              <input type="number" min="30" max="300" step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} placeholder="Enter weight in kg" />
            </label>
          </div>
        </section>

        <section className="form-card form-card--planner">
          <div className="planner-section-title">
            <h2>Your goal</h2>
          </div>
          <div className="planner-list">
            {goalOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`planner-option${goalMode === option.value ? " planner-option--active" : ""}`}
                aria-pressed={goalMode === option.value}
                onClick={() => setGoalMode(option.value)}
              >
                <span className="planner-option-marker" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="form-card form-card--planner">
          <div className="planner-section-title">
            <h2>Dietary restrictions</h2>
          </div>
          <div className="planner-list">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`planner-option${dietaryPreferences.includes(option.value) ? " planner-option--active" : ""}`}
                aria-pressed={dietaryPreferences.includes(option.value)}
                onClick={() => setDietaryPreferences((current) => toggleChoice(current, option.value))}
              >
                <span className="planner-option-marker planner-option-marker--square" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="form-card form-card--planner">
          <div className="planner-section-title">
            <h2>Available equipment</h2>
          </div>
          <div className="planner-list">
            {equipmentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`planner-option${equipment.includes(option.value) ? " planner-option--active" : ""}`}
                aria-pressed={equipment.includes(option.value)}
                onClick={() => setEquipment((current) => toggleChoice(current, option.value))}
              >
                <span className="planner-option-marker planner-option-marker--square" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="form-card form-card--planner">
          <div className="planner-section-title">
            <h2>Activity level</h2>
          </div>
          <p>We&apos;ll use this to scale your calories and workout suggestions.</p>
          <div className="field-grid field-grid--activity">
            <label>
              <span>Activity</span>
              <select value={activityLevel} onChange={(event) => setActivityLevel(event.target.value as ActivityLevel)}>
                {activityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {error ? (
          <section className="page-card page-card--error">
            <h2>Could not continue</h2>
            <p>{error}</p>
          </section>
        ) : null}

        <div className="button-row">
          <Link href="/" className="button button--secondary action-button">
            Back
          </Link>
          <button type="submit" className="button button--primary button--planner" disabled={submitting || !canSubmit}>
            {submitting ? "Generating..." : "Generate plan"}
          </button>
        </div>
      </form>
    </main>
  );
}
