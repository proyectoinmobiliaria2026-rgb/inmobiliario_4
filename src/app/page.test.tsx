import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("shows project title", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "CF Digital" })).toBeInTheDocument();
  });
});
