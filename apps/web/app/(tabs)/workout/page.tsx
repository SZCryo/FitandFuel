"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import {
  WorkoutDay,
  completeWorkoutSession,
  getTodayIsoDate,
  logWorkoutSet,
  saveDemoSession,
  startWorkoutSession,
  useDemoSession,
} from "../../../lib/demo";

type WorkoutMode = "planned" | "custom";

function parseExercises(value: string): string[] {
  // Custom workouts are intentionally forgiving: paste a comma list or separate
  // lines, and we normalize it into the same array shape the planned split uses.
  return value
    .split(/[\n,]/)
    .map((exercise) => exercise.trim())
    .filter(Boolean);
}

export default function WorkoutPage() {
  const session = useDemoSession();
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>("planned");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedCustomIndex, setSelectedCustomIndex] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [workoutDate, setWorkoutDate] = useState(getTodayIsoDate());
  const [customFocus, setCustomFocus] = useState("Custom workout");
  const [customExercises, setCustomExercises] = useState("Bench Press\nRow\nSquat");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("135");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = session?.plan;
  const selectedDay = plan?.workout_days[selectedDayIndex] ?? null;
  const selectedCustomWorkout = session.customWorkouts[selectedCustomIndex] ?? null;
  const parsedCustomExercises = useMemo(() => parseExercises(customExercises), [customExercises]);
  const selectedWorkout: WorkoutDay | null =
    workoutMode === "custom"
      ? {
          day_label: "Custom",
          focus: customFocus.trim() || "Custom workout",
          exercises: parsedCustomExercises,
        }
      : selectedDay;
  const currentWorkout = session?.currentWorkout ?? null;
  const hasActiveWorkout = currentWorkout?.status === "active";
  const activeExercise = selectedExercise || currentWorkout?.exercises[0] || selectedWorkout?.exercises[0] || "";
  const canStartWorkout = Boolean(session?.profile && selectedWorkout && selectedWorkout.exercises.length > 0);

  const nextSetIndex = useMemo(() => {
    if (!currentWorkout || !activeExercise) {
      return 1;
    }

    return currentWorkout.sets.filter((setRecord) => setRecord.exercise_name === activeExercise).length + 1;
  }, [activeExercise, currentWorkout]);

  async function handleStartWorkout() {
    if (!session?.profile || !selectedWorkout) {
      return;
    }

    if (!selectedWorkout.exercises.length) {
      setError("Add at least one exercise before starting.");
      return;
    }

    if (hasActiveWorkout) {
      setError("Complete the active workout before starting another one.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const workout = await startWorkoutSession({
        user_id: session.profile.user_id,
        session_date: workoutDate,
        focus: selectedWorkout.focus,
        exercises: selectedWorkout.exercises,
      });

      const nextSession = { ...session, currentWorkout: workout };
      saveDemoSession(nextSession);
      setSelectedExercise(workout.exercises[0] ?? "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not start workout.");
    } finally {
      setBusy(false);
    }
  }

  function saveCustomWorkout() {
    if (!session) {
      return;
    }

    const focus = customFocus.trim();
    const exercises = parseExercises(customExercises);

    if (!focus || exercises.length === 0) {
      setError("Custom workout needs a name and at least one exercise.");
      return;
    }

    const nextWorkout: WorkoutDay = {
      day_label: `Custom ${session.customWorkouts.length + 1}`,
      focus,
      exercises,
    };

    saveDemoSession({
      ...session,
      customWorkouts: [...session.customWorkouts, nextWorkout],
    });
    setSelectedCustomIndex(session.customWorkouts.length);
    setWorkoutMode("custom");
    setSelectedExercise(exercises[0] ?? "");
    setError(null);
  }

  function deleteCustomWorkout(index: number) {
    if (!session) {
      return;
    }

    const customWorkouts = session.customWorkouts.filter((_, workoutIndex) => workoutIndex !== index);
    saveDemoSession({ ...session, customWorkouts });
    setSelectedCustomIndex(0);
    setSelectedExercise(customWorkouts[0]?.exercises[0] ?? "");
  }

  async function handleLogSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || !currentWorkout || currentWorkout.status !== "active") {
      return;
    }

    const nextReps = Number(reps);
    const nextWeight = Number(weight);

    if (!Number.isFinite(nextReps) || nextReps < 1 || !Number.isFinite(nextWeight) || nextWeight < 0) {
      setError("Reps and weight must be valid numbers.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const workout = await logWorkoutSet(currentWorkout, {
        exercise_name: activeExercise,
        set_index: nextSetIndex,
        reps: nextReps,
        weight: nextWeight,
      });

      const nextSession = { ...session, currentWorkout: workout };
      saveDemoSession(nextSession);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not log set.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteWorkout() {
    if (!session || !currentWorkout) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const startedAt = new Date(currentWorkout.started_at).getTime();
      const durationSeconds = Math.max(60, Math.round((Date.now() - startedAt) / 1000));
      const workout = await completeWorkoutSession(currentWorkout, { duration_seconds: durationSeconds });
      // Keep the completed session in both places. currentWorkout drives the
      // Workout/Diary status, while workoutHistory feeds the calendar.
      const workoutHistory = [
        ...session.workoutHistory.filter((savedWorkout) => savedWorkout.session_id !== workout.session_id),
        workout,
      ];
      const nextSession = { ...session, currentWorkout: workout, workoutHistory };
      saveDemoSession(nextSession);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not complete workout.");
    } finally {
      setBusy(false);
    }
  }

  if (!session?.profile) {
    return (
      <section className="page-card">
        <h1>Workout</h1>
        <p>No profile is loaded yet.</p>
        <div className="button-row">
          <Link href="/onboarding" className="button button--primary">
            Start onboarding
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card">
      <h1>Workout</h1>
      <p>Start a planned session or run your own workout.</p>

      <div className="choice-row">
        <button
          type="button"
          className={`choice-pill${workoutMode === "planned" ? " choice-pill--active" : ""}`}
          disabled={!plan || hasActiveWorkout}
          onClick={() => {
            setWorkoutMode("planned");
            setSelectedExercise(selectedDay?.exercises[0] ?? "");
          }}
        >
          Plan
        </button>
        <button
          type="button"
          className={`choice-pill${workoutMode === "custom" ? " choice-pill--active" : ""}`}
          disabled={hasActiveWorkout}
          onClick={() => {
            setWorkoutMode("custom");
            setSelectedExercise((selectedCustomWorkout ?? { exercises: parsedCustomExercises }).exercises[0] ?? "");
          }}
        >
          Custom
        </button>
      </div>

      <div className="stack-block">
        <h2>{workoutMode === "custom" ? "Custom workout" : "Planned days"}</h2>
        <label>
          <span>Workout date</span>
          <input type="date" value={workoutDate} onChange={(event) => setWorkoutDate(event.target.value)} disabled={hasActiveWorkout} />
        </label>
        {workoutMode === "planned" ? (
          plan ? (
            <>
              <div className="choice-row">
                {plan.workout_days.map((day, index) => (
                  <button
                    key={day.day_label}
                    type="button"
                    className={`day-pill${selectedDayIndex === index ? " day-pill--active" : ""}`}
                    disabled={hasActiveWorkout}
                    onClick={() => {
                      setSelectedDayIndex(index);
                      setSelectedExercise(day.exercises[0] ?? "");
                    }}
                  >
                    {day.day_label}
                  </button>
                ))}
              </div>
              {selectedDay ? <p>{selectedDay.focus}: {selectedDay.exercises.join(", ")}</p> : null}
            </>
          ) : (
            <p>No generated plan found. Switch to Custom to log your own workout.</p>
          )
        ) : (
          <div className="custom-workout-panel">
            {session.customWorkouts.length ? (
              <div className="stack-block">
                <span className="info-label">Saved customs</span>
                <div className="choice-row">
                  {session.customWorkouts.map((workout, index) => (
                    <button
                      key={`${workout.focus}-${index}`}
                      type="button"
                      className={`choice-pill${selectedCustomIndex === index && selectedCustomWorkout ? " choice-pill--active" : ""}`}
                      disabled={hasActiveWorkout}
                      onClick={() => {
                        setSelectedCustomIndex(index);
                        setCustomFocus(workout.focus);
                        setCustomExercises(workout.exercises.join("\n"));
                        setSelectedExercise(workout.exercises[0] ?? "");
                      }}
                    >
                      {workout.focus}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <label>
              <span>Workout name</span>
              <input value={customFocus} onChange={(event) => setCustomFocus(event.target.value)} disabled={hasActiveWorkout} />
            </label>
            <label>
              <span>Exercises</span>
              <textarea
                value={customExercises}
                onChange={(event) => setCustomExercises(event.target.value)}
                disabled={hasActiveWorkout}
                rows={5}
              />
            </label>
            <div className="button-row">
              <button type="button" className="button button--secondary meal-action-button" disabled={hasActiveWorkout} onClick={saveCustomWorkout}>
                Save custom
              </button>
              {selectedCustomWorkout ? (
                <button
                  type="button"
                  className="button button--secondary meal-action-button"
                  disabled={hasActiveWorkout}
                  onClick={() => deleteCustomWorkout(selectedCustomIndex)}
                >
                  Delete custom
                </button>
              ) : null}
            </div>
            <p>{selectedWorkout ? `${selectedWorkout.focus}: ${selectedWorkout.exercises.join(", ")}` : "Add exercises to start."}</p>
          </div>
        )}
      </div>

      <div className="button-row">
        <button type="button" className="button button--primary button--planner" onClick={handleStartWorkout} disabled={busy || !canStartWorkout || hasActiveWorkout}>
          {hasActiveWorkout ? "Workout active" : currentWorkout?.status === "completed" ? "Start another workout" : "Start workout"}
        </button>
        {currentWorkout ? (
          <button
            type="button"
            className="button button--secondary action-button"
            onClick={handleCompleteWorkout}
            disabled={busy || currentWorkout.status === "completed"}
          >
            {currentWorkout.status === "completed" ? "Workout completed" : "Complete workout"}
          </button>
        ) : null}
      </div>

      {currentWorkout ? (
        <div className="stack-block">
          <h2>Current session</h2>
          <p>
            {currentWorkout.focus} - {currentWorkout.status}
          </p>
          <form className="stack-block" onSubmit={handleLogSet}>
            <label>
              <span>Exercise</span>
              <select value={activeExercise} onChange={(event) => setSelectedExercise(event.target.value)}>
                {currentWorkout.exercises.map((exercise) => (
                  <option key={exercise} value={exercise}>
                    {exercise}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-grid">
              <label>
                <span>Reps</span>
                <input type="number" min="1" value={reps} onChange={(event) => setReps(event.target.value)} />
              </label>
              <label>
                <span>Weight</span>
                <input type="number" min="0" step="0.5" value={weight} onChange={(event) => setWeight(event.target.value)} />
              </label>
            </div>
            <button type="submit" className="button button--secondary action-button" disabled={busy || currentWorkout.status !== "active" || !activeExercise}>
              Log set #{nextSetIndex}
            </button>
          </form>

          <div className="stack-block">
            <h2>Logged sets</h2>
            {currentWorkout.sets.length ? (
              currentWorkout.sets.map((setRecord) => (
                <div key={`${setRecord.exercise_name}-${setRecord.set_index}-${setRecord.logged_at}`} className="line-item">
                  <span>
                    {setRecord.exercise_name} set {setRecord.set_index}
                  </span>
                  <span>
                    {setRecord.reps} reps @ {setRecord.weight}
                  </span>
                </div>
              ))
            ) : (
              <p>No sets logged yet.</p>
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="page-card page-card--error">
          <h2>Workout error</h2>
          <p>{error}</p>
        </div>
      ) : null}
    </section>
  );
}
