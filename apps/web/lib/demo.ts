import { apiUrl } from "./api";
import { useSyncExternalStore } from "react";

export type ActivityLevel = "light" | "moderate" | "high" | "very_high";
export type GoalMode = "lose_fat" | "maintain" | "build_muscle" | "stay_consistent";

export interface ProfileCreatePayload {
  name: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal_mode: GoalMode;
  dietary_preferences: string[];
  equipment: string[];
}

export interface ProfileRecord extends ProfileCreatePayload {
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MacroDelta {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealItem {
  meal_type: string;
  name: string;
  items: string[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealHistoryEntry extends MealItem {
  logged_at: string;
}

export interface MealUpdateRequest {
  name?: string;
  items?: string[];
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export interface WorkoutDay {
  day_label: string;
  focus: string;
  exercises: string[];
}

export interface PlanResponse {
  user_id: string;
  goal_mode: GoalMode;
  targets: MacroTargets;
  meals: MealItem[];
  workout_days: WorkoutDay[];
  actuals: MacroTargets;
  variance: MacroDelta;
}

export interface WorkoutSessionStartRequest {
  user_id: string;
  session_date: string;
  focus: string;
  exercises: string[];
}

export interface WorkoutSetInput {
  exercise_name: string;
  set_index: number;
  reps: number;
  weight: number;
}

export interface WorkoutCompleteRequest {
  duration_seconds: number;
}

export interface WorkoutSetRecord extends WorkoutSetInput {
  logged_at: string;
}

export interface WorkoutSessionRecord {
  session_id: string;
  user_id: string;
  session_date: string;
  focus: string;
  exercises: string[];
  status: "active" | "completed";
  duration_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  sets: WorkoutSetRecord[];
}

export interface HistoryCalendarMarker {
  date: string;
  has_workout_data: boolean;
  workout_count: number;
}

export interface HistoryCalendarResponse {
  user_id: string;
  month: string;
  markers: HistoryCalendarMarker[];
}

export interface NutritionSummary {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface HistoryDayResponse {
  user_id: string;
  date: string;
  nutrition: NutritionSummary;
  workouts: WorkoutSessionRecord[];
}

export interface DemoSession {
  profile: ProfileRecord | null;
  plan: PlanResponse | null;
  currentWorkout: WorkoutSessionRecord | null;
  workoutHistory: WorkoutSessionRecord[];
  customWorkouts: WorkoutDay[];
  mealProgress: Record<string, boolean>;
  mealHistory: Record<string, MealHistoryEntry[]>;
  tabsUnlocked: boolean;
}

const STORAGE_KEY = "liftfuel.demo-session";
const sessionListeners = new Set<() => void>();

// This is the demo-side source of truth. The API is still used when available,
// but local storage keeps the app usable on preview deploys without a database.
const emptySession: DemoSession = {
  profile: null,
  plan: null,
  currentWorkout: null,
  workoutHistory: [],
  customWorkouts: [],
  mealProgress: {},
  mealHistory: {},
  tabsUnlocked: false,
};

let cachedSession: DemoSession = emptySession;
let hasLoadedCachedSession = false;

class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const activityFactors: Record<ActivityLevel, number> = {
  light: 28,
  moderate: 31,
  high: 34,
  very_high: 37,
};

const goalAdjustments: Record<GoalMode, number> = {
  lose_fat: -350,
  maintain: 0,
  build_muscle: 250,
  stay_consistent: -100,
};

const proteinFactors: Record<GoalMode, number> = {
  lose_fat: 2.2,
  maintain: 1.9,
  build_muscle: 2.3,
  stay_consistent: 1.8,
};

const fatFactors: Record<GoalMode, number> = {
  lose_fat: 0.8,
  maintain: 0.9,
  build_muscle: 0.85,
  stay_consistent: 0.8,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function nowIso(): string {
  return new Date().toISOString();
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `lf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const rawText = await response.text();
    let message = rawText || response.statusText;

    try {
      const parsed = JSON.parse(rawText) as { detail?: string };
      message = parsed.detail ?? message;
    } catch {
      // Ignore parse errors and fall back to the raw response text.
    }

    throw new ApiRequestError(response.status, message);
  }

  return (await response.json()) as T;
}

export async function getApiStatus(): Promise<"live" | "offline"> {
  try {
    const payload = await requestJson<{ status?: string }>("/health");
    return payload.status === "ok" ? "live" : "offline";
  } catch {
    return "offline";
  }
}

export async function createProfile(payload: ProfileCreatePayload): Promise<ProfileRecord> {
  try {
    return await requestJson<ProfileRecord>("/profile", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // If the API is cold/offline, keep the demo moving with the same shape the
    // backend would return. The screens should not care where the record came from.
    const timestamp = nowIso();

    return {
      user_id: randomId(),
      created_at: timestamp,
      updated_at: timestamp,
      ...payload,
    };
  }
}

export async function generatePlan(userId: string, profileForFallback: ProfileRecord): Promise<PlanResponse> {
  try {
    return await requestJson<PlanResponse>("/plan/generate", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status < 500 && error.status !== 404) {
      throw error;
    }

    // Server errors and cold API starts should not block the MVP flow.
    return buildFallbackPlan(profileForFallback);
  }
}

export async function updateMealInPlan(
  session: DemoSession,
  mealType: string,
  payload: MealUpdateRequest,
): Promise<PlanResponse> {
  if (!session.profile || !session.plan) {
    throw new Error("No saved plan found.");
  }

  try {
    return await requestJson<PlanResponse>(`/plan/${session.profile.user_id}/meal/${mealType}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } catch {
    const meal = session.plan.meals.find((item) => item.meal_type === mealType);

    if (!meal) {
      throw new Error("Meal type not found.");
    }

    const updatedMeal: MealItem = {
      ...meal,
      ...payload,
      items: payload.items ?? meal.items,
      calories: payload.calories ?? meal.calories,
      protein_g: payload.protein_g ?? meal.protein_g,
      carbs_g: payload.carbs_g ?? meal.carbs_g,
      fat_g: payload.fat_g ?? meal.fat_g,
    };

    return replaceMealInPlan(session.plan, updatedMeal);
  }
}

export async function swapMealInPlan(session: DemoSession, mealType: string): Promise<PlanResponse> {
  if (!session.profile || !session.plan) {
    throw new Error("No saved plan found.");
  }

  try {
    return await requestJson<PlanResponse>(`/plan/${session.profile.user_id}/meal/${mealType}/swap`, {
      method: "POST",
    });
  } catch {
    const meal = session.plan.meals.find((item) => item.meal_type === mealType);

    if (!meal) {
      throw new Error("Meal type not found.");
    }

    return replaceMealInPlan(session.plan, buildFallbackSwappedMeal(session.profile, meal));
  }
}

export async function startWorkoutSession(
  payload: WorkoutSessionStartRequest,
): Promise<WorkoutSessionRecord> {
  try {
    return await requestJson<WorkoutSessionRecord>("/workout/session/start", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return {
      session_id: randomId(),
      user_id: payload.user_id,
      session_date: payload.session_date,
      focus: payload.focus,
      exercises: payload.exercises,
      status: "active",
      duration_seconds: null,
      started_at: nowIso(),
      completed_at: null,
      sets: [],
    };
  }
}

export async function logWorkoutSet(
  session: WorkoutSessionRecord,
  payload: WorkoutSetInput,
): Promise<WorkoutSessionRecord> {
  try {
    return await requestJson<WorkoutSessionRecord>(`/workout/session/${session.session_id}/set`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return {
      ...session,
      sets: [...session.sets, { ...payload, logged_at: nowIso() }],
    };
  }
}

export async function completeWorkoutSession(
  session: WorkoutSessionRecord,
  payload: WorkoutCompleteRequest,
): Promise<WorkoutSessionRecord> {
  try {
    return await requestJson<WorkoutSessionRecord>(`/workout/session/${session.session_id}/complete`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return {
      ...session,
      status: "completed",
      duration_seconds: payload.duration_seconds,
      completed_at: nowIso(),
    };
  }
}

export async function getHistoryCalendar(
  userId: string,
  month: string,
  workoutFallback: WorkoutSessionRecord | WorkoutSessionRecord[] | null,
): Promise<HistoryCalendarResponse> {
  try {
    return await requestJson<HistoryCalendarResponse>(
      `/history/calendar?user_id=${encodeURIComponent(userId)}&month=${encodeURIComponent(month)}`,
    );
  } catch {
    const completedWorkouts = normalizeWorkoutFallback(workoutFallback).filter(
      (workout) => workout.status === "completed" && workout.session_date.startsWith(month),
    );
    const workoutsByDate = completedWorkouts.reduce<Record<string, number>>((dates, workout) => {
      dates[workout.session_date] = (dates[workout.session_date] ?? 0) + 1;
      return dates;
    }, {});
    const markers: HistoryCalendarMarker[] = Object.entries(workoutsByDate).map(([date, workout_count]) => ({
      date,
      has_workout_data: workout_count > 0,
      workout_count,
    }));

    return {
      user_id: userId,
      month,
      markers,
    };
  }
}

export async function getHistoryDay(
  userId: string,
  date: string,
  workoutFallback: WorkoutSessionRecord | WorkoutSessionRecord[] | null,
): Promise<HistoryDayResponse> {
  try {
    return await requestJson<HistoryDayResponse>(
      `/history/day?user_id=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`,
    );
  } catch {
    return {
      user_id: userId,
      date,
      nutrition: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      workouts: normalizeWorkoutFallback(workoutFallback).filter(
        (workout) => workout.session_date === date && workout.status === "completed",
      ),
    };
  }
}

function normalizeWorkoutFallback(
  workoutFallback: WorkoutSessionRecord | WorkoutSessionRecord[] | null,
): WorkoutSessionRecord[] {
  if (!workoutFallback) {
    return [];
  }

  return Array.isArray(workoutFallback) ? workoutFallback : [workoutFallback];
}

export function loadDemoSession(): DemoSession {
  if (!isBrowser()) {
    return emptySession;
  }

  if (!hasLoadedCachedSession) {
    cachedSession = readDemoSessionFromStorage();
    hasLoadedCachedSession = true;
  }

  return cachedSession;
}

export function saveDemoSession(session: DemoSession): void {
  if (!isBrowser()) {
    return;
  }

  cachedSession = session;
  hasLoadedCachedSession = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Keep the in-memory session usable if browser storage is blocked.
  }
  sessionListeners.forEach((listener) => listener());
}

export function clearDemoSession(): void {
  if (!isBrowser()) {
    return;
  }

  cachedSession = emptySession;
  hasLoadedCachedSession = true;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Keep clearing the in-memory session even if browser storage is blocked.
  }
  sessionListeners.forEach((listener) => listener());
}

export function normalizeDemoSession(value: unknown): DemoSession {
  const parsed = typeof value === "object" && value !== null ? (value as Partial<DemoSession>) : {};

  // Add defaults here whenever the session shape changes. Old browser state was
  // the source of a few "works on my machine" bugs before this was centralized.
  return {
    profile: parsed.profile ?? null,
    plan: parsed.plan ?? null,
    currentWorkout: parsed.currentWorkout ?? null,
    workoutHistory: parsed.workoutHistory ?? completedWorkoutFallback(parsed.currentWorkout),
    customWorkouts: parsed.customWorkouts ?? [],
    mealProgress: parsed.mealProgress ?? {},
    mealHistory: parsed.mealHistory ?? {},
    tabsUnlocked: parsed.tabsUnlocked ?? false,
  };
}

function completedWorkoutFallback(workout: WorkoutSessionRecord | null | undefined): WorkoutSessionRecord[] {
  return workout?.status === "completed" ? [workout] : [];
}

export function useDemoSession(): DemoSession {
  // useSyncExternalStore keeps every tab page looking at the same local session.
  // Without it, Profile/Diary/Workout could get stale after another screen saved.
  return useSyncExternalStore(subscribeToDemoSession, getDemoSessionSnapshot, () => emptySession);
}

function subscribeToDemoSession(callback: () => void): () => void {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedSession = readDemoSessionFromStorage();
      hasLoadedCachedSession = true;
      callback();
    }
  };

  sessionListeners.add(callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    sessionListeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function getDemoSessionSnapshot(): DemoSession {
  return loadDemoSession();
}

function readDemoSessionFromStorage(): DemoSession {
  if (!isBrowser()) {
    return emptySession;
  }

  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedSession;
  }

  if (!raw) {
    return emptySession;
  }

  try {
    return normalizeDemoSession(JSON.parse(raw));
  } catch {
    return emptySession;
  }
}

export function createMealProgress(
  plan: PlanResponse,
  existingProgress: Record<string, boolean> = {},
): Record<string, boolean> {
  return Object.fromEntries(plan.meals.map((meal) => [meal.meal_type, existingProgress[meal.meal_type] ?? false]));
}

export function syncMealHistoryForDate(
  history: Record<string, MealHistoryEntry[]>,
  date: string,
  meals: MealItem[],
): Record<string, MealHistoryEntry[]> {
  const nextHistory = { ...history };

  // Empty means "clear this day", not "save an empty list forever".
  if (meals.length === 0) {
    delete nextHistory[date];
    return nextHistory;
  }

  const timestamp = nowIso();
  nextHistory[date] = meals.map((meal) => ({
    ...meal,
    items: [...meal.items],
    logged_at: timestamp,
  }));

  return nextHistory;
}

export function getTodayIsoDate(): string {
  return formatLocalDate(new Date());
}

export function getCurrentMonth(): string {
  return getTodayIsoDate().slice(0, 7);
}

export function formatGoal(goal: GoalMode): string {
  return goal.replaceAll("_", " ");
}

export function calculateMealTotals(meals: ReadonlyArray<MealItem>): MacroTargets {
  return {
    calories: meals.reduce((sum, meal) => sum + meal.calories, 0),
    protein_g: meals.reduce((sum, meal) => sum + meal.protein_g, 0),
    carbs_g: meals.reduce((sum, meal) => sum + meal.carbs_g, 0),
    fat_g: meals.reduce((sum, meal) => sum + meal.fat_g, 0),
  };
}

function calculateVariance(targets: MacroTargets, actuals: MacroTargets): MacroDelta {
  return {
    calories: actuals.calories - targets.calories,
    protein_g: actuals.protein_g - targets.protein_g,
    carbs_g: actuals.carbs_g - targets.carbs_g,
    fat_g: actuals.fat_g - targets.fat_g,
  };
}

function replaceMealInPlan(plan: PlanResponse, updatedMeal: MealItem): PlanResponse {
  const meals = plan.meals.map((meal) => (meal.meal_type === updatedMeal.meal_type ? updatedMeal : meal));
  const actuals = calculateMealTotals(meals);

  return {
    ...plan,
    meals,
    actuals,
    variance: calculateVariance(plan.targets, actuals),
  };
}

export function buildFallbackPlan(profile: ProfileRecord): PlanResponse {
  if (profile.equipment.length === 0) {
    throw new Error("Pick at least one equipment option to generate a plan.");
  }

  const maintenance = Math.round(profile.weight_kg * activityFactors[profile.activity_level]);
  const calories = Math.max(1400, maintenance + goalAdjustments[profile.goal_mode]);
  const protein_g = Math.round(profile.weight_kg * proteinFactors[profile.goal_mode]);
  const fat_g = Math.round(profile.weight_kg * fatFactors[profile.goal_mode]);
  const carbs_g = Math.max(60, Math.round((calories - (protein_g * 4 + fat_g * 9)) / 4));
  const targets: MacroTargets = { calories, protein_g, carbs_g, fat_g };
  const vegetarian = profile.dietary_preferences.some((value) => value.toLowerCase() === "vegetarian");
  const mealOptions = vegetarian
    ? [
        ["breakfast", "Protein oats and berries"],
        ["lunch", "Tofu rice bowl"],
        ["dinner", "Lentil pasta and vegetables"],
      ]
    : [
        ["breakfast", "Greek yogurt, oats, and berries"],
        ["lunch", "Chicken rice bowl"],
        ["dinner", "Salmon, potatoes, and greens"],
      ];
  const mealShares = [0.28, 0.34, 0.38];
  const meals = mealOptions.map(([meal_type, name], index) => ({
    meal_type,
    name,
    items: fallbackItemsForMeal(name),
    calories: Math.round(targets.calories * mealShares[index]),
    protein_g: Math.round(targets.protein_g * mealShares[index]),
    carbs_g: Math.round(targets.carbs_g * mealShares[index]),
    fat_g: Math.round(targets.fat_g * mealShares[index]),
  }));

  const bodyweightOnly = profile.equipment.every((item) => item.toLowerCase() === "bodyweight");

  const workoutDays =
    profile.goal_mode === "build_muscle"
      ? [
          { day_label: "Day 1", focus: "Upper A", exercises: ["Bench Press", "Chest Supported Row", "Lateral Raise"] },
          { day_label: "Day 2", focus: "Lower A", exercises: ["Back Squat", "Romanian Deadlift", "Walking Lunge"] },
          { day_label: "Day 3", focus: "Upper B", exercises: ["Incline Press", "Pull-Up", "Cable Pressdown"] },
          { day_label: "Day 4", focus: "Lower B", exercises: ["Leg Press", "Hamstring Curl", "Calf Raise"] },
        ]
      : profile.goal_mode === "maintain"
        ? [
            { day_label: "Day 1", focus: "Push", exercises: ["Bench Press", "Overhead Press", "Cable Fly"] },
            { day_label: "Day 2", focus: "Pull", exercises: ["Row", "Pulldown", "Hammer Curl"] },
            { day_label: "Day 3", focus: "Legs", exercises: ["Squat", "Split Squat", "Leg Curl"] },
          ]
        : [
            { day_label: "Day 1", focus: "Full Body A", exercises: ["Goblet Squat", "Push-Up", "Row"] },
            { day_label: "Day 2", focus: "Full Body B", exercises: ["Romanian Deadlift", "Overhead Press", "Lat Pulldown"] },
            { day_label: "Day 3", focus: "Conditioning", exercises: ["Bike Intervals", "Sled Push", "Core Circuit"] },
          ];

  const actuals = calculateMealTotals(meals);

  return {
    user_id: profile.user_id,
    goal_mode: profile.goal_mode,
    targets,
    meals,
    actuals,
    variance: calculateVariance(targets, actuals),
    workout_days: bodyweightOnly
      ? workoutDays.map((day) => ({
          ...day,
          exercises: ["Bodyweight Squat", "Push-Up", "Walking Lunge", "Plank"],
        }))
      : workoutDays,
  };
}

function fallbackItemsForMeal(name: string): string[] {
  const lookup: Record<string, string[]> = {
    "Greek yogurt, oats, and berries": ["Greek yogurt", "Oats", "Berries"],
    "Chicken rice bowl": ["Chicken", "Rice", "Mixed vegetables"],
    "Salmon, potatoes, and greens": ["Salmon", "Potatoes", "Greens"],
    "Protein oats and berries": ["Protein oats", "Berries", "Almond butter"],
    "Tofu rice bowl": ["Tofu", "Rice", "Vegetables"],
    "Lentil pasta and vegetables": ["Lentil pasta", "Tomato sauce", "Vegetables"],
  };

  return lookup[name] ?? ["Custom item 1", "Custom item 2", "Custom item 3"];
}

function buildFallbackSwappedMeal(profile: ProfileRecord, meal: MealItem): MealItem {
  const vegetarian = profile.dietary_preferences.some((value) => value.toLowerCase() === "vegetarian");
  const templates: Record<string, Array<{ name: string; items: string[] }>> = vegetarian
    ? {
        breakfast: [
          { name: "Protein oats and berries", items: ["Protein oats", "Berries", "Almond butter"] },
          { name: "Egg scramble plate", items: ["Eggs", "Toast", "Fruit"] },
          { name: "Yogurt parfait", items: ["Greek yogurt", "Granola", "Strawberries"] },
        ],
        lunch: [
          { name: "Tofu rice bowl", items: ["Tofu", "Rice", "Vegetables"] },
          { name: "Lentil grain bowl", items: ["Lentils", "Quinoa", "Roasted vegetables"] },
          { name: "Paneer wrap plate", items: ["Paneer wrap", "Potatoes", "Cucumber salad"] },
        ],
        dinner: [
          { name: "Lentil pasta and vegetables", items: ["Lentil pasta", "Tomato sauce", "Vegetables"] },
          { name: "Tempeh stir fry", items: ["Tempeh", "Rice", "Broccoli"] },
          { name: "Bean chili bowl", items: ["Bean chili", "Rice", "Avocado"] },
        ],
      }
    : {
        breakfast: [
          { name: "Greek yogurt, oats, and berries", items: ["Greek yogurt", "Oats", "Berries"] },
          { name: "Eggs and oats", items: ["Eggs", "Oatmeal", "Banana"] },
          { name: "Protein smoothie", items: ["Whey isolate", "Oats", "Peanut butter"] },
        ],
        lunch: [
          { name: "Chicken rice bowl", items: ["Chicken", "Rice", "Mixed vegetables"] },
          { name: "Turkey wrap plate", items: ["Turkey wrap", "Roasted potatoes", "Fruit"] },
          { name: "Steak and rice", items: ["Steak", "Rice", "Green beans"] },
        ],
        dinner: [
          { name: "Salmon, potatoes, and greens", items: ["Salmon", "Potatoes", "Greens"] },
          { name: "Chicken pasta", items: ["Chicken", "Pasta", "Spinach"] },
          { name: "Beef and sweet potato", items: ["Beef", "Sweet potato", "Asparagus"] },
        ],
      };

  const options = templates[meal.meal_type] ?? [];
  const currentIndex = options.findIndex((option) => option.name === meal.name);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % options.length : 0;
  const nextMeal = options[nextIndex];

  return nextMeal
    ? {
        ...meal,
        name: nextMeal.name,
        items: nextMeal.items,
      }
    : meal;
}
