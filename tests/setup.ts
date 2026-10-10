// Global test setup for weeon-teachers (docs/testing.md §16.1).
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";

vi.mock("server-only", () => ({}));
