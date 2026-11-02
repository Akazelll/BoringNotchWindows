import { useState, useEffect, useCallback } from "react";
import { TodoItem } from "../types";

const STORAGE_KEY = "boring-notch-todos";

const DEFAULT_TODOS: TodoItem[] = [
  {
    id: "todo-1",
    title: "Selesaikan laporan praktikum",
    completed: true,
    createdAt: 1,
  },
  {
    id: "todo-2",
    title: "Push project ke GitHub",
    completed: false,
    createdAt: 2,
  },
  {
    id: "todo-3",
    title: "Belajar untuk kuis",
    timeSchedule: "19.00 - 20.00",
    completed: false,
    createdAt: 3,
  },
];

export function useTodoList() {
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_TODOS;
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {}
  }, [todos]);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const addTodo = useCallback((title: string, timeSchedule?: string) => {
    if (!title.trim()) return;
    const newItem: TodoItem = {
      id: "todo-" + Date.now(),
      title: title.trim(),
      timeSchedule: timeSchedule?.trim() || undefined,
      completed: false,
      createdAt: Date.now(),
    };
    setTodos((prev) => [newItem, ...prev]);
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const remainingCount = Math.max(0, totalCount - completedCount);

  return {
    todos,
    isEditing,
    setIsEditing,
    toggleTodo,
    addTodo,
    deleteTodo,
    completedCount,
    totalCount,
    remainingCount,
  };
}
