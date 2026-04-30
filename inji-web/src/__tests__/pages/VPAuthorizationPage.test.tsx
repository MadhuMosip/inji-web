import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { VPAuthorizationPage } from "../../pages/VPAuthorizationPage";
import { api, ContentTypes } from "../../utils/api";
import { ROUTES } from "../../utils/constants";
import { useUser } from "../../hooks/User/useUser";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";
import { rejectVerifierRequest } from "../../utils/verifierUtils";

const mockFetchData = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../../hooks/useApi", () => ({
  useApi: () => ({
    fetchData: mockFetchData,
  }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../utils/errorHandling", () => ({
  withErrorHandling: (fn) => fn(),
  ERROR_TYPES: {},
  standardizeError: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("../../hooks/User/useUser");
jest.mock("../../hooks/useApiErrorHandler");

const mockStore = {
  getState: () => ({
    common: {
      language: "en",
      wallet: { walletId: "mock-wallet-id" },
    },
  }),
  subscribe: jest.fn(),
  dispatch: jest.fn(),
  replaceReducer: jest.fn(),
  [Symbol.observable]: () => ({}),
};

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useSelector: jest.fn((selector) => selector(mockStore.getState())),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

jest.mock("../../utils/AppStorage", () => ({
  AppStorage: {
    getItem: (key) => {
      if (key === "WALLET_ID") return "mock-wallet-id";
      return null;
    },
  },
}));

jest.mock("../../components/User/Sidebar", () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

jest.mock("../../components/Common/SearchBar/SearchBar", () => ({
  SearchBar: (props: any) => (
    <input data-testid="mock-search-bar" onChange={(e) => props.filter(e.target.value)} />
  ),
}));

jest.mock("../../components/Common/Buttons/NavBackArrowButton", () => ({
  NavBackArrowButton: (props: any) => (
    <button data-testid="mock-nav-back" onClick={props.onBackClick}>Back</button>
  ),
}));

jest.mock("../../components/Issuers/TrustRejectionModal", () => ({
  TrustRejectionModal: (props: any) => {
    if (!props.isOpen) return null;
    return (
      <div data-testid="mock-trust-rejection-modal">
        <button data-testid="btn-rejection-confirm" onClick={props.onConfirm}>Confirm</button>
        <button data-testid="btn-rejection-close" onClick={props.onClose}>Close</button>
      </div>
    );
  },
}));

jest.mock("../../modals/LoaderModal", () => ({
  LoaderModal: ({ isOpen, title, testId }: any) =>
    isOpen ? <div data-testid={testId}>{title}</div> : null,
}));

jest.mock("../../modals/ErrorCard", () => ({
  ErrorCard: ({ isOpen, title, description }: any) =>
    isOpen ? (
      <div data-testid="modal-error-card">
        {title}:{description}
      </div>
    ) : null,
}));

jest.mock("../../components/Issuers/TrustVerifierModal", () => ({
  TrustVerifierModal: (props: any) => {
    if (!props.isOpen) return null;
    return (
      <div data-testid="modal-trust-verifier">
        <span>{props.verifierName}</span>
        <button data-testid="btn-trust-verifier" onClick={props.onTrust}>
          Trust
        </button>
        <button data-testid="btn-not-trust-verifier" onClick={props.onNotTrust}>
          Not Trust
        </button>
        <button data-testid="btn-cancel-trust-modal" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    );
  },
}));

// New OVP UI mocks (replaces old CredentialRequestModal-based tests)
const MockVerifierCredentialsRequestCard = jest.fn();
jest.mock("../../components/Ovp/VerifierCredentialRequestCard", () => ({
  __esModule: true,
  default: (props: any) => {
    MockVerifierCredentialsRequestCard(props);
    return (
      <div data-testid="mock-verifier-credentials-request-card">
        <span>{props.verifier?.name}</span>
        <button
          type="button"
          data-testid="btn-share-from-card"
          onClick={props.onShareCredentials}
          disabled={!props.selectedCredentialIds || props.selectedCredentialIds.length === 0}
        >
          Share
        </button>
      </div>
    );
  },
}));

const MockMatchingCredentials = jest.fn();
jest.mock("../../components/Ovp/MatchingCredentials", () => ({
  __esModule: true,
  default: (props: any) => {
    MockMatchingCredentials(props);
    return (
      <div data-testid="mock-matching-credentials">
        <button
          type="button"
          data-testid="btn-select-cred-1"
          onClick={() => props.onCredentialSelect?.("mock-cred-id", true)}
        >
          SelectCred1
        </button>
        <button
          type="button"
          data-testid="btn-unselect-cred-1"
          onClick={() => props.onCredentialSelect?.("mock-cred-id", false)}
        >
          UnselectCred1
        </button>
      </div>
    );
  },
}));

const MockCredentialShareHandler = jest.fn();
jest.mock("../../handlers/CredentialShareHandler", () => ({
  CredentialShareHandler: (props: any) => {
    MockCredentialShareHandler(props);
    if (!props.selectedCredentials?.length) return null;
    return (
      <div data-testid="mock-credential-share-handler">
        Sharing {props.selectedCredentials.length} for {props.verifierName}
        <button data-testid="btn-share-handler-close" onClick={props.onClose}>
          Close Share
        </button>
      </div>
    );
  },
}));

jest.mock("../../utils/verifierUtils", () => ({
  rejectVerifierRequest: jest.fn(),
}));

const mockUseUser = useUser as jest.Mock;
const mockUseApiErrorHandler = useApiErrorHandler as jest.Mock;
const mockRejectVerifierRequest = rejectVerifierRequest as jest.Mock;

api.validateVerifierRequest = {
  url: () => "/wallets/mock-wallet-id/presentations",
  methodType: 1,
  headers: () => ({ "Content-Type": ContentTypes.JSON, Accept: ContentTypes.JSON }),
  credentials: "include",
};
api.addTrustedVerifier = {
  url: () => "/wallets/mock-wallet-id/trusted-verifiers",
  methodType: 1,
  headers: () => ({ "Content-Type": ContentTypes.JSON, Accept: ContentTypes.JSON }),
  credentials: "include",
};
api.fetchPresentationCredentials = {
  url: (presentationId: string) => `/wallets/mock-wallet-id/presentations/${presentationId}/credentials`,
  methodType: 0,
  headers: () => ({ "Content-Type": ContentTypes.JSON, Accept: ContentTypes.JSON }),
  credentials: "include",
} as any;

const mockVerifierTrusted = {
  presentationId: "pid-trusted-123",
  verifier: {
    id: "trusted-verifier.com",
    name: "Trusted Verifier",
    logo: "logo.png",
    trusted: true,
    redirectUri: "https://trusted-verifier.com/callback",
  },
};

const mockVerifierUntrusted = {
  presentationId: "pid-untrusted-456",
  verifier: {
    id: "untrusted-verifier.com",
    name: "Untrusted Verifier",
    logo: "logo.png",
    trusted: false,
    redirectUri: "https://untrusted-verifier.com/callback",
  },
};

const mockPresentationCredsResponse = {
  availableCredentials: [
    {
      credentialId: "mock-cred-id",
      credentialTypeDisplayName: "Mock Credential",
      credentialTypeLogo: "",
      format: "vc",
    },
  ],
  missingClaims: [],
};

const renderComponent = (
  route = "/user/authorize?client_id=mock-client&presentation_definition_uri=https%3A%2F%2Fverifier.com%2Frequest%3Fdata%3D123"
) => {
  const queryString = route.split("?")[1] || "";
  Object.defineProperty(window, "location", {
    value: { search: `?${queryString}`, href: route },
    writable: true,
  });

  return render(
    <Provider store={mockStore as any}>
      <MemoryRouter initialEntries={[route]}>
        <VPAuthorizationPage />
      </MemoryRouter>
    </Provider>
  );
};

describe("VPAuthorizationPage", () => {
  const mockHandleApiError = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockRejectVerifierRequest.mockResolvedValue(true);

    mockUseUser.mockReturnValue({
      user: { displayName: "Test User" },
      walletId: "mock-wallet-id",
      isLoading: false,
      isUserLoggedIn: () => true,
    });

    mockUseApiErrorHandler.mockReturnValue({
      showError: false,
      isRetrying: false,
      errorTitle: undefined,
      errorDescription: undefined,
      onRetry: mockOnRetry,
      onClose: mockOnClose,
      handleApiError: mockHandleApiError,
      clearError: jest.fn(),
    });

    // Default: validation ok (trusted) + presentation-credentials ok
    mockFetchData.mockResolvedValueOnce({
      ok: () => true,
      data: mockVerifierTrusted,
      error: null,
      status: 200,
      state: 1,
      headers: {},
    });
    mockFetchData.mockResolvedValueOnce({
      ok: () => true,
      data: mockPresentationCredsResponse,
      error: null,
      status: 200,
      state: 1,
      headers: {},
    });
  });

  test("does not call loadInitialData if user is not logged in", async () => {
    mockUseUser.mockReturnValue({
      user: null,
      walletId: null,
      isLoading: false,
      isUserLoggedIn: () => false,
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.queryByTestId("modal-loader")).not.toBeInTheDocument();
    });
    expect(mockFetchData).not.toHaveBeenCalled();
  });

  test('shows error when URL search is empty', async () => {
    Object.defineProperty(window, "location", {
      value: { search: "", href: "/user/authorize" },
      writable: true,
    });

    renderComponent("/user/authorize");
    await waitFor(() => {
      expect(mockHandleApiError).toHaveBeenCalledWith(expect.any(Error), "validateVerifierRequest");
    });
  });

  test("trusted verifier flow: renders request card + matching credentials and allows share after selecting a credential", async () => {
    renderComponent();

    // 1st call: validate request. 2nd call: fetch presentation credentials.
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledTimes(2);
    });

    // Wait for credentials fetch to complete (loader closes) so the OVP content renders.
    await waitFor(() => {
      expect(screen.queryByTestId("modal-loader")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("mock-verifier-credentials-request-card")).toBeInTheDocument();
    expect(screen.getByTestId("mock-matching-credentials")).toBeInTheDocument();

    // Selecting a credential updates selectedCredentialIds via onCredentialSelect wiring.
    fireEvent.click(screen.getByTestId("btn-select-cred-1"));

    // Now share should be enabled and render CredentialShareHandler.
    fireEvent.click(screen.getByTestId("btn-share-from-card"));

    await waitFor(() => {
      expect(screen.getByTestId("mock-credential-share-handler")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-share-handler-close"));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.ROOT);
  });

  test("untrusted verifier flow: shows TrustVerifierModal and proceeds on Trust click", async () => {
    mockFetchData.mockReset();
    mockFetchData
      .mockResolvedValueOnce({
        ok: () => true,
        data: mockVerifierUntrusted,
        error: null,
        status: 200,
        state: 1,
        headers: {},
      })
      .mockResolvedValueOnce({
        ok: () => true,
        data: { message: "Added" },
        error: null,
        status: 200,
        state: 1,
        headers: {},
      })
      .mockResolvedValueOnce({
        ok: () => true,
        data: mockPresentationCredsResponse,
        error: null,
        status: 200,
        state: 1,
        headers: {},
      });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId("modal-trust-verifier")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-trust-verifier"));
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledWith(
        expect.objectContaining({
          apiConfig: api.addTrustedVerifier,
          body: { verifierId: mockVerifierUntrusted.verifier.id },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("mock-verifier-credentials-request-card")).toBeInTheDocument();
    });
  });

  test('untrusted verifier flow: proceeds on "Not Trust" click', async () => {
    mockFetchData.mockReset();
    mockFetchData
      .mockResolvedValueOnce({
        ok: () => true,
        data: mockVerifierUntrusted,
        error: null,
        status: 200,
        state: 1,
        headers: {},
      })
      .mockResolvedValueOnce({
        ok: () => true,
        data: mockPresentationCredsResponse,
        error: null,
        status: 200,
        state: 1,
        headers: {},
      });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId("modal-trust-verifier")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("btn-not-trust-verifier"));
    await waitFor(() => {
      expect(screen.getByTestId("mock-verifier-credentials-request-card")).toBeInTheDocument();
    });
  });

  test("handles error during addTrustedVerifierCallback", async () => {
    mockFetchData.mockReset();
    mockFetchData
      .mockResolvedValueOnce({
        ok: () => true,
        data: mockVerifierUntrusted,
        error: null,
      })
      .mockResolvedValueOnce({
        ok: () => false, // fails to add
        error: new Error("Failed to add verifier"),
      });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId("modal-trust-verifier")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-trust-verifier"));

    await waitFor(() => {
      expect(mockHandleApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "addTrustedVerifier",
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  test("handles fetch credentials failing with ok() false", async () => {
    mockFetchData.mockReset();
    mockFetchData
      .mockResolvedValueOnce({
        ok: () => true,
        data: mockVerifierTrusted,
      })
      .mockResolvedValueOnce({
        ok: () => false, // fetch credentials failed
        error: new Error("Fetch failed"),
      });

    renderComponent();

    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledTimes(2);
    });
    
    await waitFor(() => {
        expect(screen.getByTestId("mock-verifier-credentials-request-card")).toBeInTheDocument();
    });
  });

  test("handles fetch credentials throwing an error", async () => {
    mockFetchData.mockReset();
    mockFetchData
      .mockResolvedValueOnce({
        ok: () => true,
        data: mockVerifierTrusted,
      })
      .mockRejectedValueOnce(new Error("Network error")); // fetch credentials threw error

    renderComponent();

    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledTimes(2);
    });
    
    await waitFor(() => {
        expect(screen.getByTestId("mock-verifier-credentials-request-card")).toBeInTheDocument();
    });
  });

  test("filters credentials using search bar", async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("modal-loader")).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId("mock-matching-credentials")).toBeInTheDocument();

    const searchInput = screen.getByTestId("mock-search-bar");
    fireEvent.change(searchInput, { target: { value: "Mock" } });
    
    await waitFor(() => {
      expect(MockMatchingCredentials).toHaveBeenCalled();
    });
  });

  test("handles back button click", async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("modal-loader")).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId("mock-verifier-credentials-request-card")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("mock-nav-back"));
    await waitFor(() => {
      expect(mockRejectVerifierRequest).toHaveBeenCalled();
    });
  });

  test("handles back button click when presentationId is null", async () => {
    mockFetchData.mockReset();
    mockFetchData.mockRejectedValueOnce(new Error("validation error"));
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByTestId("mock-nav-back")).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId("mock-nav-back"));
    expect(mockRejectVerifierRequest).not.toHaveBeenCalled();
  });

  test("unselects a credential in MatchingCredentials", async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockFetchData).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByTestId("modal-loader")).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId("mock-matching-credentials")).toBeInTheDocument();

    // Select
    fireEvent.click(screen.getByTestId("btn-select-cred-1"));
    // Unselect
    fireEvent.click(screen.getByTestId("btn-unselect-cred-1"));
    
    // The share button should be disabled again
    const shareBtn = screen.getByTestId("btn-share-from-card");
    expect(shareBtn).toBeDisabled();
  });

  test("TrustVerifierModal cancel flow", async () => {
    mockFetchData.mockReset();
    mockFetchData.mockResolvedValueOnce({
        ok: () => true,
        data: mockVerifierUntrusted,
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId("modal-trust-verifier")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-cancel-trust-modal"));

    await waitFor(() => {
      expect(screen.getByTestId("mock-trust-rejection-modal")).toBeInTheDocument();
    });

    // Close rejection modal
    fireEvent.click(screen.getByTestId("btn-rejection-close"));
    await waitFor(() => {
      expect(screen.getByTestId("modal-trust-verifier")).toBeInTheDocument();
    });

    // Cancel again
    fireEvent.click(screen.getByTestId("btn-cancel-trust-modal"));
    await waitFor(() => {
      expect(screen.getByTestId("mock-trust-rejection-modal")).toBeInTheDocument();
    });

    // Confirm rejection modal
    fireEvent.click(screen.getByTestId("btn-rejection-confirm"));
    await waitFor(() => {
        expect(screen.queryByTestId("mock-trust-rejection-modal")).not.toBeInTheDocument();
    });
  });
});