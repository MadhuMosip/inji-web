import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CancelActionButton } from "../../../../components/Common/Buttons/CancelActionButton";
import { CancelActionButtonStyles } from "../../../../components/Common/Buttons/CancelActionButtonStyles";

describe("CancelActionButton", () => {
  it("renders the title", () => {
    render(<CancelActionButton title="Decline" />);
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  it("calls onClick when clicked (enabled)", () => {
    const onClick = jest.fn();
    render(<CancelActionButton title="Decline" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled=true", () => {
    const onClick = jest.fn();
    render(<CancelActionButton title="Decline" onClick={onClick} disabled />);
    const button = screen.getByRole("button", { name: "Decline" });
    expect(button).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const onClick = jest.fn();
    render(<CancelActionButton title="Decline" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("adds disabled styles only when disabled", () => {
    const { rerender } = render(<CancelActionButton title="Decline" disabled={false} />);
    const enabled = screen.getByRole("button", { name: "Decline" });
    expect(enabled).toHaveClass(CancelActionButtonStyles.baseStyles);
    expect(enabled.className).not.toContain(CancelActionButtonStyles.disabled);

    rerender(<CancelActionButton title="Decline" disabled />);
    const disabled = screen.getByRole("button", { name: "Decline" });
    expect(disabled.className).toContain(CancelActionButtonStyles.disabled);
  });
});

