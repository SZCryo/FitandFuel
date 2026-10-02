"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  MealItem,
  WorkoutSessionRecord,
  calculateMealTotals,
  getCurrentMonth,
  getTodayIsoDate,
  useDemoSession,
} from "../../../lib/demo";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarDay = {
  date: string;
  dayNumber: number;
  inMonth: boolean;
};

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  // Build dates locally instead of using new Date("YYYY-MM-DD"). The string
  // constructor reads as UTC in some browsers and can shift the calendar day.
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthLabel(month: string): string {
  return parseDate(`${month}-01`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function dayLabel(date: string): string {
  return parseDate(date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function shiftMonth(month: string, offset: number): string {
  const date = parseDate(`${month}-01`);
  date.setMonth(date.getMonth() + offset);

  return formatDate(date).slice(0, 7);
}

function clampDateToMonth(month: string, sourceDate: string): string {
  const date = parseDate(`${month}-01`);
  const requestedDay = Number(sourceDate.slice(8, 10));
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(requestedDay, lastDay));

  return formatDate(date);
}

function buildCalendarDays(month: string): CalendarDay[] {
  const firstDay = parseDate(`${month}-01`);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  // Fixed six-row grid keeps the month from jumping around as the user flips
  // between months.
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const value = formatDate(date);

    return {
      date: value,
      dayNumber: date.getDate(),
      inMonth: value.startsWith(month),
    };
  });
}

function uniqueCompletedWorkouts(sessionWorkouts: WorkoutSessionRecord[]): WorkoutSessionRecord[] {
  const workoutsById = new Map<string, WorkoutSessionRecord>();

  sessionWorkouts.forEach((workout) => {
    if (workout.status === "completed") {
      workoutsById.set(workout.session_id, workout);
    }
  });

  return Array.from(workoutsById.values()).sort((a, b) => b.session_date.localeCompare(a.session_date));
}

function groupSets(workout: WorkoutSessionRecord): Array<{ exercise: string; sets: typeof workout.sets }> {
  const grouped = workout.sets.reduce<Record<string, typeof workout.sets>>((groups, setRecord) => {
    groups[setRecord.exercise_name] = groups[setRecord.exercise_name] ?? [];
    groups[setRecord.exercise_name].push(setRecord);
    return groups;
  }, {});

  return Object.entries(grouped).map(([exercise, sets]) => ({ exercise, sets }));
}

function totalVolume(workouts: WorkoutSessionRecord[]): number {
  return workouts.reduce(
    (workoutTotal, workout) =>
      workoutTotal + workout.sets.reduce((setTotal, setRecord) => setTotal + setRecord.reps * setRecord.weight, 0),
    0,
  );
}

function totalDuration(workouts: WorkoutSessionRecord[]): number {
  return workouts.reduce((sum, workout) => sum + (workout.duration_seconds ?? 0), 0);
}

function formatDuration(seconds: number): string {
  if (!seconds) {
    return "0 min";
  }

  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return hours ? `${hours}h ${remainingMinutes}m` : `${minutes} min`;
}

function mealSummary(meals: MealItem[]): string {
  if (meals.length === 0) {
    return "No food logged.";
  }

  const totals = calculateMealTotals(meals);
  return `${meals.length} meal${meals.length === 1 ? "" : "s"}, ${totals.calories} calories`;
}

export default function HistoryPage() {
  const session = useDemoSession();
  const today = getTodayIsoDate();
  const [visibleMonth, setVisibleMonth] = useState(getCurrentMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  const completedWorkouts = useMemo(() => {
    return uniqueCompletedWorkouts([
      ...session.workoutHistory,
      ...(session.currentWorkout ? [session.currentWorkout] : []),
    ]);
  }, [session.currentWorkout, session.workoutHistory]);

  const workoutsByDate = useMemo(() => {
    return completedWorkouts.reduce<Record<string, WorkoutSessionRecord[]>>((dates, workout) => {
      dates[workout.session_date] = dates[workout.session_date] ?? [];
      dates[workout.session_date].push(workout);
      return dates;
    }, {});
  }, [completedWorkouts]);

  const mealsByDate = useMemo(() => {
    const dates: Record<string, MealItem[]> = { ...session.mealHistory };

    if (session.plan) {
      const todayMeals = session.plan.meals.filter((meal) => session.mealProgress[meal.meal_type]);

      // Today stays live from mealProgress so History updates immediately when
      // the user taps Diary, even before a refresh.
      if (todayMeals.length) {
        dates[today] = todayMeals;
      } else {
        delete dates[today];
      }
    }

    return dates;
  }, [session.mealHistory, session.mealProgress, session.plan, today]);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const selectedWorkouts = workoutsByDate[selectedDate] ?? [];
  const selectedMeals = mealsByDate[selectedDate] ?? [];
  const selectedNutrition = calculateMealTotals(selectedMeals);
  const selectedSetCount = selectedWorkouts.reduce((sum, workout) => sum + workout.sets.length, 0);
  const selectedVolume = totalVolume(selectedWorkouts);
  const selectedDuration = totalDuration(selectedWorkouts);
  const totalMealLogs = Object.values(mealsByDate).reduce((sum, meals) => sum + meals.length, 0);

  function moveMonth(offset: number) {
    const nextMonth = shiftMonth(visibleMonth, offset);
    setVisibleMonth(nextMonth);
    setSelectedDate(clampDateToMonth(nextMonth, selectedDate));
  }

  if (!session?.profile) {
    return (
      <section className="page-card">
        <h1>History</h1>
        <p>No profile loaded yet.</p>
        <div className="button-row">
          <Link href="/onboarding" className="button button--primary">
            Start onboarding
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card history-screen">
      <div className="section-head">
        <div>
          <h1>History</h1>
          <p>Food, calories, and completed workouts by day.</p>
        </div>
        <span className="status-pill status-pill--live">
          {completedWorkouts.length} workouts / {totalMealLogs} meals
        </span>
      </div>

      <div className="calendar-toolbar">
        <button type="button" className="button button--secondary meal-action-button" onClick={() => moveMonth(-1)}>
          Prev
        </button>
        <strong>{monthLabel(visibleMonth)}</strong>
        <button type="button" className="button button--secondary meal-action-button" onClick={() => moveMonth(1)}>
          Next
        </button>
        <button
          type="button"
          className="button button--secondary meal-action-button"
          onClick={() => {
            setVisibleMonth(getCurrentMonth());
            setSelectedDate(today);
          }}
        >
          Today
        </button>
      </div>

      <div className="calendar-grid" aria-label="History calendar">
        {weekdayLabels.map((label) => (
          <span key={label} className="calendar-weekday">
            {label}
          </span>
        ))}
        {calendarDays.map((day) => {
          const workouts = workoutsByDate[day.date] ?? [];
          const meals = mealsByDate[day.date] ?? [];
          const selected = day.date === selectedDate;
          const logged = workouts.length > 0 || meals.length > 0;

          return (
            <button
              key={day.date}
              type="button"
              className={`calendar-day${day.inMonth ? "" : " calendar-day--muted"}${selected ? " calendar-day--selected" : ""}${logged ? " calendar-day--logged" : ""}`}
              onClick={() => {
                setSelectedDate(day.date);
                setVisibleMonth(day.date.slice(0, 7));
              }}
            >
              <span>{day.dayNumber}</span>
              {logged ? (
                <span className="calendar-day-badges">
                  {workouts.length ? <small className="calendar-badge">W{workouts.length}</small> : null}
                  {meals.length ? <small className="calendar-badge calendar-badge--food">F{meals.length}</small> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="stack-block">
        <div className="section-head">
          <div>
            <h2>{dayLabel(selectedDate)}</h2>
            <p>
              {selectedWorkouts.length || selectedMeals.length
                ? `${mealSummary(selectedMeals)} ${selectedWorkouts.length} workout${selectedWorkouts.length === 1 ? "" : "s"} logged.`
                : "No food or workout history for this day."}
            </p>
          </div>
          <div className="button-row">
            <Link href="/diary" className="button button--secondary meal-action-button">
              Open diary
            </Link>
            <Link href="/workout" className="button button--secondary meal-action-button">
              Log workout
            </Link>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-block">
            <span className="info-label">Workouts</span>
            <span>{selectedWorkouts.length}</span>
          </div>
          <div className="info-block">
            <span className="info-label">Sets</span>
            <span>{selectedSetCount}</span>
          </div>
          <div className="info-block">
            <span className="info-label">Meals</span>
            <span>{selectedMeals.length}</span>
          </div>
          <div className="info-block">
            <span className="info-label">Calories</span>
            <span>{selectedNutrition.calories}</span>
          </div>
          <div className="info-block">
            <span className="info-label">Protein</span>
            <span>{selectedNutrition.protein_g} g</span>
          </div>
          <div className="info-block">
            <span className="info-label">Volume</span>
            <span>{Math.round(selectedVolume)} lb</span>
          </div>
          <div className="info-block">
            <span className="info-label">Duration</span>
            <span>{formatDuration(selectedDuration)}</span>
          </div>
        </div>

        <div className="stack-block">
          <h2>Food</h2>
          {selectedMeals.length ? (
            selectedMeals.map((meal) => (
              <div key={meal.meal_type} className="line-item">
                <div>
                  <strong>{meal.meal_type}</strong>
                  <p>{meal.name}</p>
                  <p>{meal.items.join(", ")}</p>
                </div>
                <span>
                  {meal.calories} cal / {meal.protein_g}p {meal.carbs_g}c {meal.fat_g}f
                </span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>Mark meals done from the Diary tab and they will show up here.</p>
            </div>
          )}
        </div>

        <div className="stack-block">
          <h2>Workouts</h2>
          {selectedWorkouts.length ? (
            selectedWorkouts.map((workout) => (
              <article key={workout.session_id} className="workout-history-card">
                <div className="section-head">
                  <div>
                    <span className="info-label">{workout.session_date}</span>
                    <h2>{workout.focus}</h2>
                    <p>{formatDuration(workout.duration_seconds ?? 0)}</p>
                  </div>
                  <span className="status-pill status-pill--live">{workout.sets.length} sets</span>
                </div>

                {workout.sets.length ? (
                  <div className="stack-block">
                    {groupSets(workout).map((group) => (
                      <div key={group.exercise} className="line-item">
                        <div>
                          <strong>{group.exercise}</strong>
                          <p>
                            {group.sets
                              .map((setRecord) => `${setRecord.reps} reps @ ${setRecord.weight}`)
                              .join(" / ")}
                          </p>
                        </div>
                        <span>{group.sets.length} sets</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{workout.exercises.join(", ")}</p>
                )}
              </article>
            ))
          ) : (
            <div className="empty-state">
              <p>Complete a workout from the Workout tab and it will show up here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
