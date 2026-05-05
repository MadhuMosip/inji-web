import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import VerifierCredentialsRequestCard, {
  Verifier,
} from "../../../components/Ovp/VerifierCredentialRequestCard";
import { WalletCredential } from "../../../types/data";
import { rejectVerifierRequest } from "../../../utils/verifierUtils";

const mockFetchData = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("../../../hooks/useApi", () => ({
  useApi: () => ({
    fetchData: mockFetchData,
  }),
}));

jest.mock("../../../utils/verifierUtils", () => ({
  rejectVerifierRequest: jest.fn(),
}));

jest.mock("../../../assets/unknown_verifier_logo.png", () => "unknown-verifier-mock.png");
jest.mock("../../../assets/Sheild.svg", () => "shield-mock.svg");
jest.mock("../../../assets/arrowRight.svg", () => "arrow-right-mock.svg");

const MockSolidButton = jest.fn();
jest.mock("../../../components/Common/Buttons/SolidButton", () => ({
  SolidButton: (props: any) => {
    MockSolidButton(props);
    return (
      <button
        type="button"
        data-testid={props.testId}
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {props.title}
      </button>
    );
  },
}));

const MockSharedCredentialInfoTile = jest.fn();
jest.mock("../../../components/Ovp/SharedCredentialInfoTile", () => ({
  SharedCredentialInfoTile: (props: any) => {
    MockSharedCredentialInfoTile(props);
    return (
      <div data-testid="shared-cred-tile">
        {props.title}:{String(!!props.isSelected)}
      </div>
    );
  },
}));

const setupWindowLocationMock = (initialHref: string = "") => {
  let href = initialHref;
  delete (window as any).location;
  const mockLocation = {
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  };
  Object.defineProperty(mockLocation, "href", {
    configurable: true,
    get() {
      return href;
    },
    set(next: string) {
      href = next;
    },
  });
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: mockLocation,
  });
};

describe("VerifierCredentialsRequestCard", () => {
  const credentials: WalletCredential[] = [
    {
      credentialId: "cred-1",
      issuerDisplayName: "Issuer 1",
      issuerLogo: "issuer-1.png",
      credentialTypeDisplayName: "Type 1",
      credentialTypeLogo: "type-1.png",
    },
    {
      credentialId: "cred-2",
      issuerDisplayName: "Issuer 2",
      issuerLogo: "issuer-2.png",
      credentialTypeDisplayName: "Type 2",
      credentialTypeLogo: "type-2.png",
    },
  ];

  const baseVerifier: Verifier = {
    id: "verifier-1",
    name: "Verifier One",
    logo: "verifier-logo.png",
    redirectUri: null,
    trusted: true,
    preregisteredWithWallet: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders verifier name and uses verifier logo when present", () => {
    render(
      <VerifierCredentialsRequestCard
        verifier={baseVerifier}
        presentationId="pid-123"
        credentials={credentials}
        selectedCredentialIds={[]}
      />
    );

    expect(screen.getByTestId("verifier-credentials-request-card")).toBeInTheDocument();
    expect(screen.getByTestId("verifier-name")).toHaveTextContent("Verifier One");
    const img = screen.getByTestId("verifier-logo");
    expect(img).toHaveAttribute("src", "verifier-logo.png");
  });

  it("falls back to unknown verifier label when verifier is null", () => {
    render(
      <VerifierCredentialsRequestCard
        verifier={null}
        presentationId="pid-123"
        credentials={credentials}
        selectedCredentialIds={[]}
      />
    );

    expect(screen.getByTestId("verifier-name")).toHaveTextContent("mainPage.unknownVerifier");
  });

  it("renders shared credential tiles and sets selection based on selectedCredentialIds", () => {
    render(
      <VerifierCredentialsRequestCard
        verifier={baseVerifier}
        presentationId="pid-123"
        credentials={credentials}
        selectedCredentialIds={["cred-2"]}
      />
    );

    expect(MockSharedCredentialInfoTile).toHaveBeenCalledTimes(2);
    expect(MockSharedCredentialInfoTile).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Type 1",
        isSelected: false,
      })
    );
    expect(MockSharedCredentialInfoTile).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Type 2",
        isSelected: true,
      })
    );
  });

  it("disables Share button when no credentials are selected", () => {
    render(
      <VerifierCredentialsRequestCard
        verifier={baseVerifier}
        presentationId="pid-123"
        credentials={credentials}
        selectedCredentialIds={[]}
      />
    );

    expect(screen.getByTestId("show-consent-modal-button")).toBeDisabled();
  });

  it("opens consent modal and calls onShareCredentials on confirm", () => {
    const onShareCredentials = jest.fn();
    render(
      <VerifierCredentialsRequestCard
        verifier={baseVerifier}
        presentationId="pid-123"
        credentials={credentials}
        selectedCredentialIds={["cred-1"]}
        onShareCredentials={onShareCredentials}
      />
    );

    fireEvent.click(screen.getByTestId("show-consent-modal-button"));
    fireEvent.click(screen.getByTestId("CredentialShareCard-ShareButton"));
    expect(onShareCredentials).toHaveBeenCalledTimes(1);
  });

  it("decline: redirects via window.location.href when verifier.redirectUri exists (and does not call rejectVerifierRequest)", async () => {
    setupWindowLocationMock("");
    const verifierWithRedirect: Verifier = {
      ...baseVerifier,
      redirectUri: "https://verifier.example/callback",
    };

    render(
      <VerifierCredentialsRequestCard
        verifier={verifierWithRedirect}
        presentationId="pid-123"
        credentials={credentials}
        selectedCredentialIds={["cred-1"]}
      />
    );

    fireEvent.click(
      screen.getByTestId("verifier-decline-button")
    );

    await waitFor(() => {
      expect(window.location.href).toBe("https://verifier.example/callback");
    });
    expect(rejectVerifierRequest).not.toHaveBeenCalled();
  });

  it("decline: calls rejectVerifierRequest when verifier.redirectUri is missing", async () => {
    (rejectVerifierRequest as jest.Mock).mockResolvedValueOnce(undefined);

    render(
      <VerifierCredentialsRequestCard
        verifier={{ ...baseVerifier, redirectUri: null }}
        presentationId="pid-123"
        credentials={credentials}
        selectedCredentialIds={["cred-1"]}
      />
    );

    fireEvent.click(
      screen.getByTestId("verifier-decline-button")
    );

    await waitFor(() => {
      expect(rejectVerifierRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          presentationId: "pid-123",
          fetchData: mockFetchData,
          redirectUri: null,
        })
      );
    });
  });

  it("decline: prevents multiple calls on rapid clicks (multi-click guard)", async () => {
    (rejectVerifierRequest as jest.Mock).mockResolvedValue(undefined);

    render(
      <VerifierCredentialsRequestCard
        verifier={{ ...baseVerifier, redirectUri: null }}
        presentationId="pid-123"
        credentials={credentials}
        selectedCredentialIds={["cred-1"]}
      />
    );

    const decline = screen.getByRole("button", {
      name: "credentialTile.shareCredentialsDeclineButton",
    });
    expect(decline).toBe(screen.getByTestId("verifier-decline-button"));
    fireEvent.click(decline);
    fireEvent.click(decline);
    fireEvent.click(decline);

    await waitFor(() => {
      expect(rejectVerifierRequest).toHaveBeenCalledTimes(1);
    });
  });

  it("decline: does nothing when presentationId is null", () => {
    render(
      <VerifierCredentialsRequestCard
        verifier={{ ...baseVerifier, redirectUri: null }}
        presentationId={null}
        credentials={credentials}
        selectedCredentialIds={["cred-1"]}
      />
    );

    fireEvent.click(
      screen.getByTestId("verifier-decline-button")
    );
    expect(rejectVerifierRequest).not.toHaveBeenCalled();
  });
});

