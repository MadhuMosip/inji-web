import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MatchingCredentials from "../../../components/Ovp/MatchingCredentials";
import { ROUTES } from "../../../utils/constants";
import { WalletCredential } from "../../../types/data";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
}));

jest.mock("../../../assets/checkCircleTwo.svg", () => "check-circle-two-mock.svg");

jest.mock("../../../modals/SDClaimsSelectionModal", () => ({
  __esModule: true,
  default: () => <div data-testid="sd-claims-selection-modal" />,
}));

const MockNoMatchingCredentialsModal = jest.fn();
jest.mock("../../../modals/NoMatchingCredentialsModal", () => ({
  NoMatchingCredentialsModal: (props: any) => {
    MockNoMatchingCredentialsModal(props);
    return (
      <div data-testid="no-matching-modal">
        <button type="button" data-testid="btn-go-home" onClick={props.onGoToHome}>
          GoHome
        </button>
      </div>
    );
  },
}));

const MockVCCardView = jest.fn();
jest.mock("../../../components/VC/VCCardView", () => ({
  VCCardView: (props: any) => {
    MockVCCardView(props);
    return (
      <div data-testid={`vc-card-${props.credential?.credentialId}`}>
        VC:{props.credential?.credentialId}
      </div>
    );
  },
}));

describe("MatchingCredentials", () => {
  const creds: WalletCredential[] = [
    {
      credentialId: "cred-1",
      issuerDisplayName: "Issuer 1",
      issuerLogo: "issuer-1.png",
      credentialTypeDisplayName: "Type 1",
      credentialTypeLogo: "type-1.png",
      format: "jwt",
    },
    {
      credentialId: "cred-2",
      issuerDisplayName: "Issuer 2",
      issuerLogo: "issuer-2.png",
      credentialTypeDisplayName: "Type 2",
      credentialTypeLogo: "type-2.png",
      format: "jwt",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards modal props when credentials is an empty array", () => {
    render(
      <MatchingCredentials
        credentials={[]}
        missingClaims={["name", "dob"]}
        redirectUri="https://example.com/cb"
        presentationId="pid-123"
      />
    );

    expect(screen.getByTestId("no-matching-modal")).toBeInTheDocument();
    expect(MockNoMatchingCredentialsModal).toHaveBeenCalledWith(
      expect.objectContaining({
        isVisible: true,
        missingClaims: ["name", "dob"],
        redirectUri: "https://example.com/cb",
        presentationId: "pid-123",
        onGoToHome: expect.any(Function),
      })
    );
  });

  it("wires onGoToHome to navigate(ROOT) when credentials is an empty array", () => {
    render(
      <MatchingCredentials
        credentials={[]}
        missingClaims={["name", "dob"]}
        presentationId="pid-123"
      />
    );

    fireEvent.click(screen.getByTestId("btn-go-home"));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ROOT);
  });

  it("renders tiles for credentials and shows selected/unselected labels", () => {
    render(<MatchingCredentials credentials={creds} selectedCredentialIds={["cred-2"]} />);

    expect(screen.getByTestId("matching-credentials-container")).toBeInTheDocument();
    expect(screen.getByTestId("matching-credentials-list")).toBeInTheDocument();
    expect(screen.getByTestId("matching-credentials-tile-cred-1")).toBeInTheDocument();
    expect(screen.getByTestId("matching-credentials-tile-cred-2")).toBeInTheDocument();
    expect(screen.getByTestId("vc-card-cred-1")).toBeInTheDocument();
    expect(screen.getByTestId("vc-card-cred-2")).toBeInTheDocument();

    // One selected, one unselected.
    expect(screen.getByText("credentialTile.selectedTitle")).toBeInTheDocument();
    expect(screen.getByText("credentialTile.unselectedTitle")).toBeInTheDocument();

    // Selected branch renders the check icon with alt="success".
    expect(screen.getByAltText("success")).toBeInTheDocument();
    expect(screen.getByTestId("matching-credentials-selected-icon-cred-2")).toBeInTheDocument();
  });

  it("calls onCredentialSelect(id, !isSelected) when clicking a tile header", () => {
    const onCredentialSelect = jest.fn();
    render(
      <MatchingCredentials
        credentials={creds}
        selectedCredentialIds={["cred-1"]}
        onCredentialSelect={onCredentialSelect}
      />
    );

    // Click the unselected label (belongs to cred-2): should select it.
    fireEvent.click(screen.getByText("credentialTile.unselectedTitle"));
    expect(onCredentialSelect).toHaveBeenCalledWith("cred-2", true);

    // Click the selected label (belongs to cred-1): should unselect it.
    fireEvent.click(screen.getByText("credentialTile.selectedTitle"));
    expect(onCredentialSelect).toHaveBeenCalledWith("cred-1", false);
  });

  it("does not throw when onCredentialSelect is not provided", () => {
    render(<MatchingCredentials credentials={creds} selectedCredentialIds={[]} />);
    expect(() => fireEvent.click(screen.getAllByText("credentialTile.unselectedTitle")[0])).not.toThrow();
  });

  it("renders VCCardView with a non-null refreshCredentials (falls back to noop)", () => {
    render(<MatchingCredentials credentials={creds} />);
    expect(MockVCCardView).toHaveBeenCalledTimes(2);
    expect(MockVCCardView).toHaveBeenCalledWith(
      expect.objectContaining({
        credential: expect.objectContaining({ credentialId: "cred-1" }),
        refreshCredentials: expect.any(Function),
      })
    );
  });
});

