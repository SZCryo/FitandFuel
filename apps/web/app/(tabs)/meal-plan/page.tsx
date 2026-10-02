"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  MealItem,
  PlanResponse,
  createMealProgress,
  formatGoal,
  generatePlan,
  getTodayIsoDate,
  saveDemoSession,
  swapMealInPlan,
  syncMealHistoryForDate,
  updateMealInPlan,
  useDemoSession,
} from "../../../lib/demo";

type MealDraft = {
  name: string;
  items: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
};

function createDraft(meal: MealItem): MealDraft {
  return {
    name: meal.name,
    items: meal.items.join(", "),
    calories: String(meal.calories),
    protein_g: String(meal.protein_g),
    carbs_g: String(meal.carbs_g),
    fat_g: String(meal.fat_g),
  };
}

export default function MealPlanPage() {
  const router = useRouter();
  const session = useDemoSession();
  const plan = session?.plan;
  const [editingMealType, setEditingMealType] = useState<string | null>(null);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [busyMealType, setBusyMealType] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [attemptedGenerate, setAttemptedGenerate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.profile || session.plan || regenerating || attemptedGenerate) {
      return;
    }

    const run = async () => {
      setAttemptedGenerate(true);
      setRegenerating(true);
      setError(null);

      try {
        const nextPlan = await generatePlan(session.profile!.user_id, session.profile!);
        saveDemoSession({
          ...session,
          plan: nextPlan,
          mealProgress: createMealProgress(nextPlan),
          mealHistory: syncMealHistoryForDate(session.mealHistory, getTodayIsoDate(), []),
        });
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not generate plan.");
      } finally {
        setRegenerating(false);
      }
    };

    void run();
  }, [attemptedGenerate, regenerating, session]);

  const varianceLabel = useMemo(() => {
    if (!plan) {
      return "";
    }

    const calorieVariance = plan.variance.calories;
    if (calorieVariance === 0) {
      return "On target";
    }

    return calorieVariance > 0 ? `${calorieVariance} over target` : `${Math.abs(calorieVariance)} under target`;
  }, [plan]);

  function savePlanSnapshot(nextPlan: PlanResponse, nextProgress: Record<string, boolean>) {
    const completedMealsForToday = nextPlan.meals.filter((meal) => nextProgress[meal.meal_type]);

    // Edits and swaps can happen after a meal is already checked off. Saving the
    // plan and today's completed meal history together keeps Diary and History in sync.
    saveDemoSession({
      ...session,
      plan: nextPlan,
      mealProgress: nextProgress,
      mealHistory: syncMealHistoryForDate(session.mealHistory, getTodayIsoDate(), completedMealsForToday),
    });
  }

  if (!session.profile) {
    return (
      <section className="page-card plan-summary-card">
        <h1>Meal plan</h1>
        <p>No profile found yet.</p>
        <div className="button-row">
          <Link href="/onboarding" className="button button--primary">
            Build first plan
          </Link>
        </div>
      </section>
    );
  }

  if (!plan) {
    return (
      <section className="page-card plan-summary-card">
        <h1>Meal plan</h1>
        <p>{regenerating ? "Preparing your plan..." : error ?? "No plan found for this profile."}</p>
        <div className="button-row">
          <button
            type="button"
            className="button button--primary"
            disabled={regenerating}
            onClick={async () => {
              if (!session.profile) {
                return;
              }

              setAttemptedGenerate(true);
              setRegenerating(true);
              setError(null);

              try {
                const nextPlan = await generatePlan(session.profile.user_id, session.profile);
                saveDemoSession({
                  ...session,
                  plan: nextPlan,
                  mealProgress: createMealProgress(nextPlan),
                  mealHistory: syncMealHistoryForDate(session.mealHistory, getTodayIsoDate(), []),
                });
              } catch (caughtError) {
                setError(caughtError instanceof Error ? caughtError.message : "Could not generate plan.");
              } finally {
                setRegenerating(false);
              }
            }}
          >
            {regenerating ? "Generating..." : "Generate plan"}
          </button>
        </div>
      </section>
    );
  }

  async function handleSwap(mealType: string) {
    setBusyMealType(mealType);
    setError(null);

    try {
      const nextPlan = await swapMealInPlan(session, mealType);
      savePlanSnapshot(nextPlan, createMealProgress(nextPlan, session.mealProgress));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not swap meal.");
    } finally {
      setBusyMealType(null);
    }
  }

  async function handleSave(mealType: string) {
    if (!draft) {
      return;
    }

    const nextCalories = Number(draft.calories);
    const nextProtein = Number(draft.protein_g);
    const nextCarbs = Number(draft.carbs_g);
    const nextFat = Number(draft.fat_g);

    if (
      !draft.name.trim() ||
      [nextCalories, nextProtein, nextCarbs, nextFat].some((value) => !Number.isFinite(value) || value < 0)
    ) {
      setError("Meal name and macros must be valid.");
      return;
    }

    setBusyMealType(mealType);
    setError(null);

    try {
      const nextPlan = await updateMealInPlan(session, mealType, {
        name: draft.name.trim(),
        items: draft.items
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        calories: nextCalories,
        protein_g: nextProtein,
        carbs_g: nextCarbs,
        fat_g: nextFat,
      });

      savePlanSnapshot(nextPlan, createMealProgress(nextPlan, session.mealProgress));
      setEditingMealType(null);
      setDraft(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save meal.");
    } finally {
      setBusyMealType(null);
    }
  }

  return (
    <section className="page-card meal-plan-screen">
      <div className="section-head">
        <div>
          <h1>Meal Plan</h1>
          <p>{formatGoal(plan.goal_mode)} plan with editable meals and live day totals.</p>
        </div>
        <span className="status-pill status-pill--live">{varianceLabel}</span>
      </div>

      <div className="info-grid">
        <div className="info-block">
          <span className="info-label">Target calories</span>
          <span>{plan.targets.calories}</span>
        </div>
        <div className="info-block">
          <span className="info-label">Actual calories</span>
          <span>{plan.actuals.calories}</span>
        </div>
        <div className="info-block">
          <span className="info-label">Protein</span>
          <span>
            {plan.actuals.protein_g} g / {plan.targets.protein_g} g
          </span>
        </div>
        <div className="info-block">
          <span className="info-label">Carbs</span>
          <span>
            {plan.actuals.carbs_g} g / {plan.targets.carbs_g} g
          </span>
        </div>
      </div>

      <div className="stack-block">
        {plan.meals.map((meal) => {
          const editing = editingMealType === meal.meal_type;
          const mealBusy = busyMealType === meal.meal_type;

          return (
            <article key={meal.meal_type} className="meal-editor-card">
              <div className="section-head">
                <div>
                  <span className="info-label">{meal.meal_type}</span>
                  <h2>{meal.name}</h2>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="button button--secondary meal-action-button"
                    disabled={Boolean(busyMealType)}
                    onClick={() => {
                      setEditingMealType(meal.meal_type);
                      setDraft(createDraft(meal));
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button button--secondary meal-action-button"
                    disabled={Boolean(busyMealType)}
                    onClick={() => void handleSwap(meal.meal_type)}
                  >
                    {mealBusy ? "Swapping..." : "Swap"}
                  </button>
                </div>
              </div>

              {editing && draft ? (
                <div className="stack-block">
                  <label>
                    <span>Name</span>
                    <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                  </label>
                  <label>
                    <span>Items (comma separated)</span>
                    <input value={draft.items} onChange={(event) => setDraft({ ...draft, items: event.target.value })} />
                  </label>
                  <div className="field-grid">
                    <label>
                      <span>Calories</span>
                      <input type="number" min="0" value={draft.calories} onChange={(event) => setDraft({ ...draft, calories: event.target.value })} />
                    </label>
                    <label>
                      <span>Protein (g)</span>
                      <input type="number" min="0" value={draft.protein_g} onChange={(event) => setDraft({ ...draft, protein_g: event.target.value })} />
                    </label>
                    <label>
                      <span>Carbs (g)</span>
                      <input type="number" min="0" value={draft.carbs_g} onChange={(event) => setDraft({ ...draft, carbs_g: event.target.value })} />
                    </label>
                    <label>
                      <span>Fat (g)</span>
                      <input type="number" min="0" value={draft.fat_g} onChange={(event) => setDraft({ ...draft, fat_g: event.target.value })} />
                    </label>
                  </div>
                  <div className="button-row">
                    <button
                      type="button"
                      className="button button--primary meal-action-button"
                      disabled={mealBusy}
                      onClick={() => void handleSave(meal.meal_type)}
                    >
                      {mealBusy ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="button button--secondary meal-action-button"
                      disabled={mealBusy}
                      onClick={() => {
                        setEditingMealType(null);
                        setDraft(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{meal.items.join(" / ")}</p>
                  <div className="meal-macro-row">
                    <span>{meal.calories} cal</span>
                    <span>{meal.protein_g}p</span>
                    <span>{meal.carbs_g}c</span>
                    <span>{meal.fat_g}f</span>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>

      {error ? (
        <div className="page-card page-card--error">
          <h2>Meal plan error</h2>
          <p>{error}</p>
        </div>
      ) : null}

      <div className="button-row button-row--center">
        <button
          type="button"
          className="button button--secondary button--planner"
          disabled={regenerating || Boolean(busyMealType)}
          onClick={async () => {
            if (!session.profile) {
              return;
            }

            setRegenerating(true);
            setError(null);

            try {
              const nextPlan = await generatePlan(session.profile.user_id, session.profile);
              // A regenerated plan is treated like a fresh day plan, so old meal
              // checkmarks/history are cleared instead of being carried over.
              saveDemoSession({
                ...session,
                plan: nextPlan,
                mealProgress: createMealProgress(nextPlan),
                mealHistory: syncMealHistoryForDate(session.mealHistory, getTodayIsoDate(), []),
              });
              setEditingMealType(null);
              setDraft(null);
            } catch (caughtError) {
              setError(caughtError instanceof Error ? caughtError.message : "Could not regenerate plan.");
            } finally {
              setRegenerating(false);
            }
          }}
        >
          {regenerating ? "Regenerating..." : "Regenerate plan"}
        </button>
        <button
          type="button"
          className="button button--primary button--planner"
          onClick={() => {
            saveDemoSession({ ...session, tabsUnlocked: true });
            router.push("/diary");
          }}
        >
          Go to Diary
        </button>
      </div>
    </section>
  );
}

