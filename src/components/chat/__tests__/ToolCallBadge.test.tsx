import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
import { ToolCallBadge } from "../ToolCallBadge";

test("shows 'Creating <filename>' for str_replace_editor create", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/components/Button.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating Button.jsx")).toBeDefined();
});

test("shows 'Editing <filename>' for str_replace_editor str_replace", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Editing <filename>' for str_replace_editor insert", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Reading <filename>' for str_replace_editor view", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/utils/helpers.ts" }}
      state="call"
    />
  );
  expect(screen.getByText("Reading helpers.ts")).toBeDefined();
});

test("shows 'Renaming <old> → <new>' for file_manager rename", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/Button.jsx", new_path: "/components/Button.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Renaming Button.jsx → Button.jsx")).toBeDefined();
});

test("shows 'Deleting <filename>' for file_manager delete", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/old/OldComponent.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Deleting OldComponent.jsx")).toBeDefined();
});

test("falls back to toolName for unknown tool", () => {
  render(
    <ToolCallBadge
      toolName="unknown_tool"
      args={{}}
      state="call"
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("shows spinner when not done", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows green dot when done", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
