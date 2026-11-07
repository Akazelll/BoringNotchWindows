import React from "react";
import { BatteryInfo } from "../../../../shared/types";
import type { TodoListController } from "../../../todo";
import { ExpandedClockHeader, HeaderPageTitle } from "../../../../shared/components/ui/ExpandedHeaderParts";
import { TodoSummaryColumn } from "./TodoSummaryColumn";
import { TodoListColumn } from "./TodoListColumn";

interface PageTodoListProps {
  battery: BatteryInfo;
  dateStr: string;
  timeStr: string;
  todoList: TodoListController;
  isAddingTodo: boolean;
  setIsAddingTodo: (v: boolean) => void;
  newTodoTitle: string;
  setNewTodoTitle: (v: string) => void;
  newTodoSchedule: string;
  setNewTodoSchedule: (v: string) => void;
}

export const PageTodoList: React.FC<PageTodoListProps> = ({
  battery,
  dateStr,
  timeStr,
  todoList,
  isAddingTodo,
  setIsAddingTodo,
  newTodoTitle,
  setNewTodoTitle,
  newTodoSchedule,
  setNewTodoSchedule,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", flex: 1, minHeight: 0, justifyContent: "space-between" }} className="animate-in fade-in duration-200">
      {/* Header Row */}
      <ExpandedClockHeader
        battery={battery}
        dateStr={dateStr}
        timeStr={timeStr}
        left={<HeaderPageTitle text="To-do " accentText="List" />}
        right={
          <div style={{ padding: "3px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", fontSize: "11px", fontWeight: 600, color: "#d4d4d8" }}>
            {todoList.remainingCount} tersisa
          </div>
        }
      />

      {/* Middle Body */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: "16px", flex: 1, minHeight: 0 }}>
        <TodoSummaryColumn todoList={todoList} setIsAddingTodo={setIsAddingTodo} />

        <TodoListColumn
          todoList={todoList}
          isAddingTodo={isAddingTodo}
          setIsAddingTodo={setIsAddingTodo}
          newTodoTitle={newTodoTitle}
          setNewTodoTitle={setNewTodoTitle}
          newTodoSchedule={newTodoSchedule}
          setNewTodoSchedule={setNewTodoSchedule}
        />
      </div>
    </div>
  );
};
