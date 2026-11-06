import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("shows the main headline", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Simplify employee scheduling and business operations with one intuitive platform." }),
    ).toBeInTheDocument();
  });
});
