import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import SDClaimsSelectionModal from "../../modals/SDClaimsSelectionModal";
import { WalletCredential } from "../../types/data";
import { getDirCurrentLanguage } from "../../utils/i18n";

jest.mock("../../modals/ModalWrapper", () => ({
  ModalWrapper: ({ content }: { content: React.ReactNode }) => (
    <div data-testid="mock-modal-wrapper">{content}</div>
  ),
}));

jest.mock("../../components/Common/Buttons/SolidButton", () => ({
  SolidButton: ({
    testId,
    onClick,
    title,
  }: {
    testId: string;
    onClick: () => void;
    title: string;
  }) => (
    <button data-testid={testId} type="button" onClick={onClick}>
      {title}
    </button>
  ),
}));

jest.mock("../../components/Common/Buttons/CustomButton", () => ({
  __esModule: true,
  default: ({
    testId,
    onClick,
    title,
  }: {
    testId: string;
    onClick: () => void;
    title: string;
  }) => (
    <button data-testid={testId} type="button" onClick={onClick}>
      {title}
    </button>
  ),
}));

jest.mock("../../utils/i18n", () => ({
  getDirCurrentLanguage: jest.fn(() => "ltr"),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { selected?: number; total?: number; count?: number }) => {
      const labels: Record<string, string> = {
        backToCredentials: "Back to Credentials",
        confirm: "Confirm",
        searchPlaceholder: "Search credentials by name, value, or category",
        selectAll: "Select All",
        clearSelection: "Clear selection",
        infoTitle: "Select Credentials to Share",
        infoDescription:
          "Choose which credentials you want to share with the requesting verifier.",
        expand: "Expand",
        collapse: "Collapse",
      };

      if (key === "selectedCount") {
        return `${opts?.selected ?? 0} to ${opts?.total ?? 0} selected`;
      }
      if (key === "fieldsCount") {
        return `${opts?.count ?? 0} fields`;
      }

      return labels[key] ?? key;
    },
    i18n: { language: "en" },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
}));

jest.mock("../../assets/ArrowNarrowLeftTwo.png", () => "arrow-back-mock.png");
jest.mock("../../assets/InfoRevIcon.svg", () => "info-rev-mock.svg");
jest.mock("../../assets/SelectedTickIcon.svg", () => "selected-tick-mock.svg");
jest.mock("../../assets/ArrowBack.svg", () => "arrow-back-mock.svg");
jest.mock("../../assets/ArrowOpen.svg", () => "arrow-open-mock.svg");

const mockGetDirCurrentLanguage = getDirCurrentLanguage as jest.Mock;

describe("SDClaimsSelectionModal", () => {
  const mockCloseModal = jest.fn();
  const mockOnConfirm = jest.fn();

  const mockCredential: WalletCredential = {
    credentialId: "cred-sd-1",
    credentialTypeDisplayName: "MOSIP ID",
    issuerDisplayName: "MOSIP",
    issuerLogo: "issuer.png",
    credentialTypeLogo: "type.png",
    format: "sd-jwt",
    claims: ["$.nationalId"],
    sdClaims: ["$.name", "$.address.city"],
  };

  const defaultProps = {
    seletedSDJWT: mockCredential,
    closeModal: mockCloseModal,
    onConfirm: mockOnConfirm,
  };

  const renderModal = (props: Partial<typeof defaultProps> = {}) =>
    render(<SDClaimsSelectionModal {...defaultProps} {...props} />);

  const getSearchInput = () => {
    const container = screen.getByTestId("serch-claims-container");
    return within(container).getByTestId("input-search");
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDirCurrentLanguage.mockReturnValue("ltr");
  });

  describe("rendering", () => {
    it("renders inside the modal wrapper with credential title and actions", () => {
      renderModal();

      expect(screen.getByTestId("mock-modal-wrapper")).toBeInTheDocument();
      expect(screen.getByText("MOSIP ID")).toBeInTheDocument();
      expect(screen.getByText("Back to Credentials")).toBeInTheDocument();
      expect(screen.getByTestId("show-consent-modal-button")).toHaveTextContent("Confirm");
      expect(screen.getByTestId("selectAllClaims")).toHaveTextContent("Select All");
      expect(screen.getByTestId("clearSelectionClaims")).toHaveTextContent("Clear selection");
    });

    it("renders info section and search placeholder", () => {
      renderModal();

      expect(screen.getByText("Select Credentials to Share")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Choose which credentials you want to share with the requesting verifier."
        )
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Search credentials by name, value, or category")
      ).toBeInTheDocument();
    });

    it("applies text direction from getDirCurrentLanguage", () => {
      mockGetDirCurrentLanguage.mockReturnValue("rtl");
      renderModal();

      const content = screen.getByText("MOSIP ID").closest(".p-6");

      expect(mockGetDirCurrentLanguage).toHaveBeenCalledWith("en");
      expect(content).toHaveAttribute("dir", "rtl");
    });

    it("renders claim tree leaves for sd and required claims", () => {
      renderModal();

      expect(screen.getByTestId("claim-leaf-$.name")).toBeInTheDocument();
      expect(screen.getByTestId("claim-leaf-$.address.city")).toBeInTheDocument();
      expect(screen.getByTestId("claim-leaf-$.nationalId")).toBeInTheDocument();
      expect(screen.getByTestId("claim-group-address")).toBeInTheDocument();
    });

    it("shows selected count as zero of total sd claims initially", () => {
      renderModal();

      expect(screen.getByText("0 to 2 selected")).toBeInTheDocument();
    });

    it("initializes selection from initialSelectedSdClaims", () => {
      renderModal({ initialSelectedSdClaims: ["$.name"] });

      expect(screen.getByText("1 to 2 selected")).toBeInTheDocument();
      expect(screen.getByTestId("claim-leaf-$.name")).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("close and confirm", () => {
    it("calls closeModal(false) when back is clicked", () => {
      renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Back to Credentials" }));

      expect(mockCloseModal).toHaveBeenCalledWith(false);
    });

    it("resets selection when closed after select all", () => {
      const { unmount } = renderModal();

      fireEvent.click(screen.getByTestId("selectAllClaims"));
      expect(screen.getByText("2 to 2 selected")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Back to Credentials" }));
      unmount();

      renderModal();
      expect(screen.getByText("0 to 2 selected")).toBeInTheDocument();
    });

    it("calls onConfirm with credential id and selected paths on confirm", () => {
      renderModal({ initialSelectedSdClaims: ["$.name", "$.address.city"] });

      fireEvent.click(screen.getByTestId("show-consent-modal-button"));

      expect(mockOnConfirm).toHaveBeenCalledWith("cred-sd-1", ["$.name", "$.address.city"]);
      expect(mockCloseModal).toHaveBeenCalledWith(false);
    });

    it("does not call onConfirm when credential is null", () => {
      renderModal({ seletedSDJWT: null });

      fireEvent.click(screen.getByTestId("show-consent-modal-button"));

      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockCloseModal).not.toHaveBeenCalled();
    });
  });

  describe("selection actions", () => {
    it("selects all sd claims when Select All is clicked", () => {
      renderModal();

      fireEvent.click(screen.getByTestId("selectAllClaims"));

      expect(screen.getByText("2 to 2 selected")).toBeInTheDocument();
      expect(screen.getByTestId("claim-leaf-$.name")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("claim-leaf-$.address.city")).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("clears sd claim selection when Clear selection is clicked", () => {
      renderModal({ initialSelectedSdClaims: ["$.name", "$.address.city"] });

      fireEvent.click(screen.getByTestId("clearSelectionClaims"));

      expect(screen.getByText("0 to 2 selected")).toBeInTheDocument();
      expect(screen.getByTestId("claim-leaf-$.name")).toHaveAttribute("aria-pressed", "false");
    });

    it("toggles an individual sd claim when its row is clicked", () => {
      renderModal();

      fireEvent.click(screen.getByTestId("claim-leaf-$.name"));
      expect(screen.getByText("1 to 2 selected")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("claim-leaf-$.name"));
      expect(screen.getByText("0 to 2 selected")).toBeInTheDocument();
    });

    it("does not change selection when a required claim row is clicked", () => {
      renderModal();

      fireEvent.click(screen.getByTestId("claim-leaf-$.nationalId"));

      expect(screen.getByText("0 to 2 selected")).toBeInTheDocument();
      expect(screen.getByTestId("claim-leaf-$.nationalId")).toBeDisabled();
    });
  });

  describe("search filtering", () => {
    it("filters visible claims when search text is entered", () => {
      renderModal();

      fireEvent.change(getSearchInput(), { target: { value: "name" } });

      expect(screen.getByTestId("claim-leaf-$.name")).toBeInTheDocument();
      expect(screen.queryByTestId("claim-leaf-$.address.city")).not.toBeInTheDocument();
      expect(screen.queryByTestId("claim-leaf-$.nationalId")).not.toBeInTheDocument();
    });

    it("shows all claims again when search is cleared", () => {
      renderModal();

      const input = getSearchInput();
      fireEvent.change(input, { target: { value: "name" } });
      fireEvent.change(input, { target: { value: "" } });

      expect(screen.getByTestId("claim-leaf-$.name")).toBeInTheDocument();
      expect(screen.getByTestId("claim-leaf-$.address.city")).toBeInTheDocument();
      expect(screen.getByTestId("claim-leaf-$.nationalId")).toBeInTheDocument();
    });
  });

  describe("group expand", () => {
    it("expands a group when its header is clicked", () => {
      renderModal();

      expect(screen.getByTestId("claim-group-address")).toHaveAttribute(
        "aria-expanded",
        "false"
      );

      fireEvent.click(screen.getByTestId("claim-group-address"));

      expect(screen.getByTestId("claim-group-address")).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("edge cases", () => {
    it("renders with empty claims and sdClaims arrays", () => {
      renderModal({
        seletedSDJWT: {
          ...mockCredential,
          claims: [],
          sdClaims: [],
        },
      });

      expect(screen.getByText("0 to 0 selected")).toBeInTheDocument();
      expect(screen.queryByTestId(/claim-leaf/)).not.toBeInTheDocument();
    });

    it("confirm passes an empty array when nothing is selected", () => {
      renderModal();

      fireEvent.click(screen.getByTestId("show-consent-modal-button"));

      expect(mockOnConfirm).toHaveBeenCalledWith("cred-sd-1", []);
    });
  });
});
