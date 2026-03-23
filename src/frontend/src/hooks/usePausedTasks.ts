import { useCallback, useState } from "react";

const STORAGE_KEY = "pausedTasks";

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysToStr(dateStr: string, n: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  date.setDate(date.getDate() + n);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function loadStored(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // ignore
  }
  return {};
}

function saveStored(data: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function usePausedTasks() {
  const [stored, setStored] = useState<Record<string, string>>(loadStored);

  const pauseTask = useCallback((taskId: string) => {
    const today = getTodayStr();
    const until = addDaysToStr(today, 5);
    setStored((prev) => {
      const next = { ...prev, [taskId]: until };
      saveStored(next);
      return next;
    });
  }, []);

  const unpauseTask = useCallback((taskId: string) => {
    setStored((prev) => {
      const next = { ...prev };
      delete next[taskId];
      saveStored(next);
      return next;
    });
  }, []);

  const isPaused = useCallback(
    (taskId: string): boolean => {
      const until = stored[taskId];
      if (!until) return false;
      const today = getTodayStr();
      // paused if today < pausedUntil (hides from tomorrow)
      return today < until;
    },
    [stored],
  );

  const pausedUntil = useCallback(
    (taskId: string): string | null => {
      return stored[taskId] ?? null;
    },
    [stored],
  );

  const pausedTaskIds = new Set(
    Object.entries(stored)
      .filter(([id]) => isPaused(id))
      .map(([id]) => id),
  );

  return { pauseTask, unpauseTask, isPaused, pausedUntil, pausedTaskIds };
}
