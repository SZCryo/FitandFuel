"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  calculateMealTotals,
  getTodayIsoDate,
  saveDemoSession,
  syncMealHistoryForDate,
  useDemoSession,
} from "../../../lib/demo";

export default function DiaryPage() {
  const session = useDemoSession();
  const plan = session?.plan;
  const currentWorkout = session?.currentWorkout;

  const completedMeals = useMemo(() => {
    if (!plan || !session) {
      return 0;
    }

    return plan.meals.filter((meal) => session.mealProgress[meal.meal_type]).length;
  }, [plan, session]);
  const consumedTotals = useMemo(() => {
    if (!plan || !session) {
      return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    }

    return calculateMealTotals(plan.meals.filter((meal) => session.mealProgress[meal.meal_type]));
  }, [plan, session]);
  const completionPercent = plan ? Math.round((completedMeals / plan.meals.length) * 100) : 0;

  function saveMealProgress(nextProgress: Record<string, boolean>) {
    if (!session || !plan) {
      return;
    }

    const completedMealsForToday = plan.meals.filter((meal) => nextProgress[meal.meal_type]);

    // Meal checkmarks also write the food history for today. That way History is
    // based on what the user actually marked done, not just the generated plan.
    saveDemoSession({
      ...session,
      mealProgress: nextProgress,
      mealHistory: syncMealHistoryForDate(session.mealHistory, getTodayIsoDate(), completedMealsForToday),
    });
  }

  function toggleMeal(mealType: string) {
    if (!session) {
      return;
    }

    saveMealProgress({
      ...session.mealProgress,
      [mealType]: !session.mealProgress[mealType],
    });
  }

  function setAllMeals(done: boolean) {
    if (!session || !plan) {
      return;
    }

    saveMealProgress(Object.fromEntries(plan.meals.map((meal) => [meal.meal_type, done])));
  }

  if (!plan) {
    return (
      <section className="page-card">
        <h1>Diary</h1>
        <p>No generated plan found for today.</p>
        <div className="button-row">
          <Link href="/onboarding" className="button button--primary">
            Build first plan
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card">
      <h1>Diary</h1>
      <p>
        Meals completed: {completedMeals}/{plan.meals.length}
      </p>
      <div className="progress-bar" aria-label="Meal completion">
        <span style={{ width: `${completionPercent}%` }} />
      </div>

      <div className="info-grid">
        <div className="info-block">
          <span className="info-label">Calories</span>
          <span>
            {consumedTotals.calories} / {plan.targets.calories}
          </span>
        </div>
        <div className="info-block">
          <span className="info-label">Protein</span>
          <span>
            {consumedTotals.protein_g} g / {plan.targets.protein_g} g
          </span>
        </div>
        <div className="info-block">
          <span className="info-label">Carbs</span>
          <span>
            {consumedTotals.carbs_g} g / {plan.targets.carbs_g} g
          </span>
        </div>
        <div className="info-block">
          <span className="info-label">Fat</span>
          <span>
            {consumedTotals.fat_g} g / {plan.targets.fat_g} g
          </span>
        </div>
      </div>

      <div className="stack-block">
        <div className="section-head">
          <h2>Meals</h2>
          <div className="button-row">
            <button type="button" className="button button--secondary meal-action-button" onClick={() => setAllMeals(true)}>
              Mark all
            </button>
            <button type="button" className="button button--secondary meal-action-button" onClick={() => setAllMeals(false)}>
              Clear
            </button>
          </div>
        </div>
        {plan.meals.map((meal) => {
          const done = Boolean(session?.mealProgress[meal.meal_type]);

          return (
            <div key={meal.meal_type} className="line-item">
              <div>
                <strong>{meal.meal_type}</strong>
                <p>{meal.name}</p>
              </div>
              <button type="button" className={`button ${done ? "button--primary" : "button--secondary"}`} onClick={() => toggleMeal(meal.meal_type)}>
                {done ? "Done" : "Mark done"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="stack-block">
        <h2>Workout</h2>
        <p>
          {currentWorkout
            ? `${currentWorkout.focus} - ${currentWorkout.status === "completed" ? "completed" : "active"}`
            : "No workout started yet."}
        </p>
        <div className="button-row">
          <Link href="/workout" className="button button--secondary action-button">
            Open workout
          </Link>
        </div>
      </div>
    </section>
  );
}
