import React from "react";
import { Plus, Pencil } from "lucide-react";
import type { TodoListController } from "../../../todo";

interface TodoSummaryColumnProps {
  todoList: TodoListController;
  setIsAddingTodo: (v: boolean) => void;
}

/** Kolom kiri To-Do: judul halaman + hitungan selesai/total. */
export const TodoSummaryColumn: React.FC<TodoSummaryColumnProps> = ({ todoList, setIsAddingTodo }) => {
  return (
    <>
    {/* Left Column (140px) */}
  <div style={{ width: "140px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "3px", justifyContent: "center" }}>
    {/* Label "To-do" sudah pindah ke header halaman sebagai judul "To-do List";
        angkanya sudah dijelaskan oleh keterangan di bawahnya, jadi tidak diganti
        dengan label baru. */}
    <div style={{ fontSize: "40px", fontWeight: 600, lineHeight: 1.05, color: "#ffffff", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
      {todoList.completedCount}/{todoList.totalCount}
    </div>
    <div style={{ fontSize: "11px", fontWeight: 500, color: "#a1a1aa" }}>Tugas selesai hari ini</div>

    <div style={{ display: "flex", flexDirection: "row", gap: "6px", paddingTop: "6px" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsAddingTodo(true);
        }}
        style={{ height: "30px", boxSizing: "border-box", padding: "0 10px 0 8px", borderRadius: "999px", border: "none", background: "rgba(90,162,255,0.16)", display: "inline-flex", alignItems: "center", gap: "4px", color: "#ffffff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
        className="active:scale-95 transition"
        title="Tambah tugas"
      >
        <Plus className="w-3.5 h-3.5 text-[#5AA2FF]" />
        <span>Tambah</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          todoList.setIsEditing(!todoList.isEditing);
        }}
        style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", background: todoList.isEditing ? "rgba(90,162,255,0.25)" : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer", color: todoList.isEditing ? "#5AA2FF" : "#e4e4e7" }}
        className="active:scale-95 transition"
        title="Kelola tugas"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
    </>
  );
};
