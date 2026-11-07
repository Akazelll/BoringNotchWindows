import React from "react";
import { Check, Trash2 } from "lucide-react";
import type { TodoListController } from "../../../todo";

interface TodoListColumnProps {
  todoList: TodoListController;
  isAddingTodo: boolean;
  setIsAddingTodo: (v: boolean) => void;
  newTodoTitle: string;
  setNewTodoTitle: (v: string) => void;
  newTodoSchedule: string;
  setNewTodoSchedule: (v: string) => void;
}

/** Kolom kanan To-Do: input tambah tugas, daftar tugas, scrollbar kustom. */
export const TodoListColumn: React.FC<TodoListColumnProps> = ({
  todoList,
  isAddingTodo,
  setIsAddingTodo,
  newTodoTitle,
  setNewTodoTitle,
  newTodoSchedule,
  setNewTodoSchedule,
}) => {
  return (
    <>
  {/* Right Task List Column */}
  <div style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", flexDirection: "row", gap: "8px" }}>
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "5px", overflowY: "auto", maxHeight: "115px" }}>
      {isAddingTodo && (
        <div style={{ padding: "6px 10px", borderRadius: "12px", background: "rgba(90,162,255,0.12)", border: "1px solid rgba(90,162,255,0.25)", display: "flex", flexDirection: "column", gap: "4px" }}>
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="Nama tugas..."
            autoFocus
            style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "#ffffff" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <input
              type="text"
              value={newTodoSchedule}
              onChange={(e) => setNewTodoSchedule(e.target.value)}
              placeholder="Jadwal (e.g. 19.00 - 20.00)"
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "10px", color: "#a1a1aa" }}
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (newTodoTitle.trim()) {
                    todoList.addTodo(newTodoTitle, newTodoSchedule || undefined);
                    setNewTodoTitle("");
                    setNewTodoSchedule("");
                    setIsAddingTodo(false);
                  }
                }}
                style={{ fontSize: "11px", fontWeight: 700, color: "#5AA2FF", padding: "1px 6px", background: "rgba(90,162,255,0.15)", borderRadius: "4px" }}
              >
                Simpan
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingTodo(false);
                }}
                style={{ fontSize: "11px", color: "#a1a1aa" }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {todoList.todos.map((todo) => (
        <div
          key={todo.id}
          onClick={(e) => {
            e.stopPropagation();
            todoList.toggleTodo(todo.id);
          }}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "10px",
            height: "36px",
            boxSizing: "border-box",
            padding: "0 10px",
            borderRadius: "10px",
            background: todo.completed ? "rgba(90,162,255,0.14)" : "rgba(255,255,255,0.04)",
            cursor: "pointer",
          }}
          className="hover:bg-white/10 transition"
        >
          <div
            style={{
              width: "18px",
              height: "18px",
              flexShrink: 0,
              borderRadius: "50%",
              background: todo.completed ? "#5AA2FF" : "transparent",
              border: todo.completed ? "none" : "1.8px solid rgba(255,255,255,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {todo.completed && <Check className="w-3 h-3 text-[#07101f] stroke-[3.2]" />}
          </div>

          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: todo.completed ? "#a1a1aa" : "#ffffff",
                textDecoration: todo.completed ? "line-through" : "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {todo.title}
            </div>
            {todo.timeSchedule && (
              <div style={{ fontSize: "10px", fontWeight: 500, color: "#a1a1aa", fontVariantNumeric: "tabular-nums" }}>
                {todo.timeSchedule}
              </div>
            )}
          </div>

          {todoList.isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                todoList.deleteTodo(todo.id);
              }}
              className="text-neutral-500 hover:text-rose-400 p-0.5"
              title="Hapus"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>

    {/* Custom Scrollbar */}
    <div style={{ width: "3px", alignSelf: "stretch", margin: "2px 0", borderRadius: "1.5px", background: "rgba(255,255,255,0.12)" }} aria-hidden="true">
      <div style={{ width: "3px", height: "62%", borderRadius: "1.5px", background: "rgba(255,255,255,0.7)" }} />
    </div>
  </div>
    </>
  );
};
