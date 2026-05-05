import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConsentRequiredModal from "../../modals/ConsentRequiredModal";

jest.mock("../../modals/ModalWrapper", () => ({
  ModalWrapper: ({ content }: any) => <div data-testid="mock-modal-wrapper">{content}</div>,
}));

jest.mock("../../components/Common/Buttons/SolidButton", () => ({
  SolidButton: ({ testId, onClick, title }: any) => (
    <button data-testid={testId} onClick={onClick}>
      {title}
    </button>
  ),
}));

jest.mock("../../assets/Shield-gray.svg", () => "shield-gray-mock.svg");

describe("ConsentRequiredModal", () => {
  const baseProps = {
    title: "Consent Required",
    description: "Make sure you recognize or trust Verifier.\nOnce you share:",
    credentialsTitle: "Credentials Being Shared (2)",
    credentialsDescription:
      "They will be able to view your selected credentials, including all associated information and verification data.",
    consentButtonTitle: "Yes, I Consent to Share",
    backButtonTitle: "No, Take Me Back",
  };

  it("renders all labels and content", () => {
    render(<ConsentRequiredModal {...baseProps} />);

    expect(screen.getByTestId("mock-modal-wrapper")).toBeInTheDocument();
    expect(screen.getByText(baseProps.title)).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === baseProps.description)
    ).toBeInTheDocument();
    expect(screen.getByText(baseProps.credentialsTitle)).toBeInTheDocument();
    expect(screen.getByText(baseProps.credentialsDescription)).toBeInTheDocument();
    expect(screen.getByTestId("CredentialShareCard-ShareButton")).toHaveTextContent(
      baseProps.consentButtonTitle
    );
    expect(screen.getByRole("button", { name: baseProps.backButtonTitle })).toBeInTheDocument();
    expect(screen.getByAltText("Shield icon")).toHaveAttribute("src", "shield-gray-mock.svg");
  });

  it("calls onConfirm when consent button is clicked", () => {
    const onConfirm = jest.fn();
    render(<ConsentRequiredModal {...baseProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId("CredentialShareCard-ShareButton"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = jest.fn();
    render(<ConsentRequiredModal {...baseProps} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: baseProps.backButtonTitle }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
