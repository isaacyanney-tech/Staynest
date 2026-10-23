import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText } from "./rich-text";

describe("RichText", () => {
  it("renders headings, lists, bold text and safe links", () => {
    render(<RichText source={"## Safety\n\n- Visit **before** paying\n- Read [the guide](/safety)\n\nEmail [us](mailto:hi@example.com)."} />);
    expect(screen.getByRole("heading", { level: 2, name: "Safety" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("before").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "the guide" }).getAttribute("href")).toBe("/safety");
    expect(screen.getByRole("link", { name: "us" }).getAttribute("href")).toBe("mailto:hi@example.com");
  });

  it("never renders HTML or unsafe links from content", () => {
    const { container } = render(<RichText source={'<img src=x onerror="alert(1)"> [click](javascript:alert(1)) [x](//evil.example)'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });
});
