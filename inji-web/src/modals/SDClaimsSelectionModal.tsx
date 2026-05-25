import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDirCurrentLanguage } from "../utils/i18n";
import { ModalWrapper } from "./ModalWrapper";
import { WalletCredential } from "../types/data";
import ArrowNarrowLeftTwo from "../assets/ArrowNarrowLeftTwo.png";
import { SolidButton } from "../components/Common/Buttons/SolidButton";
import { SearchBar } from "../components/Common/SearchBar/SearchBar";
import CustomButton from "../components/Common/Buttons/CustomButton";
import InfoRevIcon from "../assets/InfoRevIcon.svg";
import { ClaimTreeItem } from "../components/Common/Input/SdClaims/sdClaimInputs";
import {
    buildClaimTree,
    collectSdClaimPaths,
    filterClaimTree,
} from "../utils/sdClaimsTree";

interface SDClaimsSelectionModalProps {
    seletedSDJWT: WalletCredential | null;
    closeModal: (isOpen: boolean) => void;
    onConfirm: (credentialId: string, selectedClaimPaths: string[]) => void;
    initialSelectedSdClaims?: string[];
}

const emptySelectionState = () => ({
    selectedSdClaims: new Set<string>(),
    expandedGroups: new Set<string>(),
    searchQuery: "",
});

function SDClaimsSelectionModal({
    seletedSDJWT,
    closeModal,
    onConfirm,
    initialSelectedSdClaims = [],
}: SDClaimsSelectionModalProps) {
    const { t, i18n } = useTranslation("SDClaimsSelectionModal");
    const dir = getDirCurrentLanguage(i18n.language);
    const claims = seletedSDJWT?.claims ?? [];
    const sdClaims = seletedSDJWT?.sdClaims ?? [];
    const claimTree = useMemo(() => buildClaimTree(claims, sdClaims), [claims, sdClaims]);
    const allSdClaimPaths = useMemo(() => collectSdClaimPaths(claimTree), [claimTree]);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSdClaims, setSelectedSdClaims] = useState<Set<string>>(
        () => new Set(initialSelectedSdClaims)
    );
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

    const resetSelectionState = () => {
        const cleared = emptySelectionState();
        setSelectedSdClaims(cleared.selectedSdClaims);
        setExpandedGroups(cleared.expandedGroups);
        setSearchQuery(cleared.searchQuery);
    };

    const handleClose = () => {
        resetSelectionState();
        closeModal(false);
    };

    const filteredTree = useMemo(
        () => filterClaimTree(claimTree, searchQuery),
        [claimTree, searchQuery]
    );

    const selectedSdCount = allSdClaimPaths.filter((path) => selectedSdClaims.has(path)).length;

    const toggleSdClaim = (path: string) => {
        setSelectedSdClaims((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        setSelectedSdClaims(new Set(allSdClaimPaths));
    };

    const handleClearSelection = () => {
        setSelectedSdClaims(new Set());
    };

    const handleConfirm = () => {
        if (!seletedSDJWT) {
            return;
        }
        onConfirm(seletedSDJWT.credentialId, Array.from(selectedSdClaims));
        closeModal(false);
    };

    return (
        <div>
            <ModalWrapper
                zIndex={50}
                size={"6xl"}
                header={<></>}
                footer={<></>}
                content={
                    <div className="p-6" dir={dir}>
                        <div className="flex justify-between items-center w-full gap-4">
                            <div className="text-start min-w-0 flex-1">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex items-center gap-2 text-[#7C0195] text-[14px] font-medium mb-2"
                                >
                                    <img
                                        src={ArrowNarrowLeftTwo}
                                        alt=""
                                        className="rtl:rotate-180 shrink-0"
                                    />
                                    <span>{t("backToCredentials")}</span>
                                </button>
                                <h1 className="text-[20px] text-[#101828] font-medium text-start break-words leading-snug">
                                    {seletedSDJWT?.credentialTypeDisplayName}
                                </h1>
                            </div>
                            <SolidButton
                                testId="show-consent-modal-button"
                                onClick={handleConfirm}
                                title={t("confirm")}
                                className="h-10 py-0 break-words min-w-0 w-[126px] shrink-0"
                            />
                        </div>
                        <div className="-ms-2 mt-2">
                            <SearchBar
                                testId="serch-claims"
                                placeholder={t("searchPlaceholder")}
                                filter={(value) => setSearchQuery(value)}
                            />
                        </div>
                        <div className="text-end my-4 flex flex-wrap justify-end gap-2">
                            <CustomButton
                                testId="selectAllClaims"
                                onClick={handleSelectAll}
                                title={t("selectAll")}
                                styles="h-[38px] text-[14px] font-medium w-[147px] text-[#ffffff] bg-[#7C1389] rounded-md"
                            />
                            <CustomButton
                                testId="clearSelectionClaims"
                                onClick={handleClearSelection}
                                title={t("clearSelection")}
                                styles="h-[38px] text-[14px] font-medium w-[147px] text-[#ffffff] bg-[#7C1389] rounded-md"
                            />
                        </div>
                        <div className="border-2 border-[#7C1389] rounded-lg p-4 flex items-start gap-2 text-start">
                            <div className="min-h-[28px] min-w-[28px] mt-[2px] bg-[#F8C0FF] rounded-full flex items-center justify-center shrink-0">
                                <img src={InfoRevIcon} className="h-[16px] w-[16px]" alt="" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[#101828] text-[15px] font-medium text-start">
                                    {t("infoTitle")}
                                </p>
                                <p className="text-[#4A5565] text-[13px] text-start">
                                    {t("infoDescription")}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 border border-[#E5E7EB] shadow-sm rounded-md p-4 text-start">
                            <p className="text-[#101828] text-[14px] font-[500] text-start">
                                {t("selectedCount", {
                                    selected: selectedSdCount,
                                    total: allSdClaimPaths.length,
                                })}
                            </p>
                        </div>
                        <div>
                            {filteredTree.map((node) => (
                                <ClaimTreeItem
                                    key={node.kind === "group" ? node.key : node.path}
                                    node={node}
                                    expandedGroups={expandedGroups}
                                    selectedSdClaims={selectedSdClaims}
                                    groupPathPrefix=""
                                    onToggleGroup={toggleGroup}
                                    onToggleSdClaim={toggleSdClaim}
                                />
                            ))}
                        </div>
                    </div>
                }
            />
        </div>
    );
}

export default SDClaimsSelectionModal;
