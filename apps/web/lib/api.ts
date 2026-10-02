const fallback = "http://localhost:8000/api";

// The Vercel web project gets the API URL from env. Keeping a local fallback
// here lets the same frontend run against uvicorn without touching page code.
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? fallback).replace(/\/$/, "");

export function apiUrl(path: string): string {
  const normalized = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${API_BASE_URL}${normalized}`;
}
