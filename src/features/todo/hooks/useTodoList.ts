import { useState, useEffect, useCallback } from "react";
import { TodoItem } from "../../../shared/types";
import { getDb } from "../../../shared/lib/db";

interface TodoRow {
  id: string;
  title: string;
  time_schedule: string | null;
  completed: number;
  created_at: number;
}

function rowToItem(row: TodoRow): TodoItem {
  return {
    id: row.id,
    title: row.title,
    timeSchedule: row.time_schedule ?? undefined,
    completed: row.completed === 1,
    createdAt: row.created_at,
  };
}

export function useTodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  // Jumlah tugas selesai hari ini, termasuk yang sudah di-soft-delete,
  // supaya penyebut "x/y" tidak menyusut saat tugas ditandai selesai.
  const [completedToday, setCompletedToday] = useState<number>(0);

  const refreshCompleted = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) AS n FROM todos
         WHERE completed = 1
           AND deleted_at IS NOT NULL
           AND date(deleted_at / 1000, 'unixepoch', 'localtime') = date('now', 'localtime')`
      );
      setCompletedToday(rows[0]?.n ?? 0);
    } catch {
      // DB gagal: biarkan angka apa adanya.
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const db = await getDb();
        const rows = await db.select<TodoRow[]>(
          `SELECT id, title, time_schedule, completed, created_at
           FROM todos WHERE deleted_at IS NULL
           ORDER BY created_at DESC`
        );
        if (alive) setTodos(rows.map(rowToItem));
      } catch {
        // DB gagal: daftar tetap kosong, UI tidak pecah.
      }
      if (alive) void refreshCompleted();
    })();
    return () => {
      alive = false;
    };
  }, [refreshCompleted]);

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

    void (async () => {
      try {
        const db = await getDb();
        await db.execute(
          `INSERT INTO todos (id, title, time_schedule, completed, created_at, deleted_at)
           VALUES (?, ?, ?, 0, ?, NULL)`,
          [newItem.id, newItem.title, newItem.timeSchedule ?? null, newItem.createdAt]
        );
      } catch {
        // Gagal tulis: biarkan baris tampil untuk sesi ini.
      }
    })();
  }, []);

  /**
   * Tandai selesai = soft delete: baris hilang dari UI tapi tetap tersimpan
   * di DB dengan deleted_at terisi, sehingga riwayat tetap terhitung.
   */
  const toggleTodo = useCallback(
    (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id));

      void (async () => {
        try {
          const db = await getDb();
          await db.execute(
            "UPDATE todos SET completed = 1, deleted_at = ? WHERE id = ?",
            [Date.now(), id]
          );
          await refreshCompleted();
        } catch {
          // Gagal tulis: state React tetap jadi sumber tampilan sesi ini.
        }
      })();
    },
    [refreshCompleted]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      void (async () => {
        try {
          const db = await getDb();
          await db.execute("DELETE FROM todos WHERE id = ?", [id]);
        } catch {
          // Gagal hapus: baris tetap di DB, hilang dari UI sampai reload.
        }
      })();
    },
    []
  );

  const completedCount = completedToday;
  const totalCount = completedCount + todos.length;
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

export type TodoListController = ReturnType<typeof useTodoList>;