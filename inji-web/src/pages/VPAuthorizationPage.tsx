import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../utils/api";
import { LoaderModal } from "../modals/LoaderModal";
import { useTranslation } from "react-i18next";
import { TrustVerifierModal } from "../components/Issuers/TrustVerifierModal";
import { ErrorCard } from "../modals/ErrorCard";
import { TrustRejectionModal } from "../components/Issuers/TrustRejectionModal";
import { useApi } from "../hooks/useApi";
import { useNavigate } from 'react-router-dom';
import {OPENID4VP_AUTHORIZE_PREFIX, ROUTES} from "../utils/constants";
import { PresentationCredential } from "../types/components";
import { CredentialShareHandler } from "../handlers/CredentialShareHandler";
import { useApiErrorHandler } from "../hooks/useApiErrorHandler";
import { useUser } from '../hooks/User/useUser';
import VerifierCredentialsRequestCard from "../components/Ovp/VerifierCredentialRequestCard";
import MatchingCredentials from "../components/Ovp/MatchingCredentials";
import { StoredCardsPageStyles } from "./User/StoredCards/StoredCardsPageStyles";
import { NavBackArrowButton } from "../components/Common/Buttons/NavBackArrowButton";
import { PageTitle } from "../components/Common/PageTitle/PageTitle";
import { SearchBar } from "../components/Common/SearchBar/SearchBar";
import { VpAuthPageBackgroundStyles } from "../components/Ovp/OvpPageStyles";
import { rejectVerifierRequest } from "../utils/verifierUtils";
import { Pages } from "../utils/constants";
import LeaveConfirmationModal from "../modals/LeaveConfirmationModal";
import { createPopstateLeaveGuard } from "../utils/navigationUtils";

export const VPAuthorizationPage: React.FC = () => {
    const { t } = useTranslation(["VerifierTrustPage", "CredentialRequestModal"]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isCancelConfirmation, setIsCancelConfirmation] = useState<boolean>(false);
    const [showTrustVerifier, setShowTrustVerifier] = useState<boolean>(false);
    const [showCredentialRequest, setShowCredentialRequest] = useState<boolean>(false);
    const [verifierData, setVerifierData] = useState<any>(null);
    const [presentationIdData, setPresentationIdData] = useState<string | null>(null);
    const [selectedCredentialsData, setSelectedCredentialsData] = useState<PresentationCredential[] | null>(null);
    const [selectedCredentialIds, setSelectedCredentialIds] = useState<string[]>([]);
    const [credentialsData, setCredentialsData] = useState<any[] | null>(null);
    const [missingClaimsData, setMissingClaimsData] = useState<string[]>([]);
    const fetchingRef = useRef<boolean>(false);
    const isRejectingRef = useRef<boolean>(false);
    const fetchedCredentialsRef = useRef<Set<string>>(new Set());
    const [filteredCredentials, setFilteredCredentials] = useState<any[] | null>([]);
    const [showLeaveWarnPopup, setShowLeaveWarnPopup] = useState(false);
    const showLeaveWarnPopupRef = useRef(false);
    const removePopstateGuardRef = useRef<(() => void) | null>(null);

    const { fetchData } = useApi();
    const navigate = useNavigate();

    const { isUserLoggedIn } = useUser();
    const {
        showError,
        errorDescription,
        errorTitle,
        isRetrying,
        handleApiError,
        onClose,
        onRetry
    } = useApiErrorHandler({ onClose: () => navigate(ROUTES.ROOT) });

    const validateVerifierRequestCallback = useCallback(async (cleanParams: string) => {
        const response = await fetchData({
            apiConfig: api.validateVerifierRequest,
            body: { authorizationRequestUrl: `${OPENID4VP_AUTHORIZE_PREFIX}${cleanParams}` },
        });
        return response;
    }, [fetchData]);

    const handleValidationSuccess = useCallback((response: any) => {
        const data = response.data;
        const presentationId = data?.presentationId;
        const verifier = data?.verifier;
        if (!verifier) {
            throw new Error("Invalid verifier response received.");
        }
        setPresentationIdData(presentationId);
        setVerifierData(verifier);
        if (!verifier.trusted) {
            setShowTrustVerifier(true);
        } else {
            setShowTrustVerifier(false);
            setShowCredentialRequest(true);
        }
    }, [setPresentationIdData, setVerifierData, setShowTrustVerifier, setShowCredentialRequest]);

    const loadInitialData = useCallback(async () => {
        let cleanParams = window.location.search;

        try {
            if (!cleanParams || cleanParams === '?') {
                throw new Error("No query parameters found in URL");
            }
        } catch (parseError) {
            setIsLoading(false);
            handleApiError(new Error("Invalid authorization request URL."), "validateVerifierRequest");
            return;
        }

        setIsLoading(true);
        try {
            const response = await validateVerifierRequestCallback(cleanParams);

            if (response.ok()) {
                handleValidationSuccess(response);
            } else {
                throw response.error || new Error("Failed to validate verifier request. Please try again.");
            }
            setIsLoading(false);
        } catch (err) {
            setIsLoading(false);

            handleApiError(err,
                "validateVerifierRequest",
                () => validateVerifierRequestCallback(cleanParams),
                handleValidationSuccess
            );
        }
    }, [
        validateVerifierRequestCallback,
        handleApiError,
        handleValidationSuccess
    ]);

    const addTrustedVerifierCallback = useCallback(async () => {
        if (!verifierData?.id) return;
        const response = await fetchData({
            apiConfig: api.addTrustedVerifier,
            body: { verifierId: verifierData.id },
        });

        return response;
    }, [fetchData, verifierData?.id]);

    const handleTrustSuccess = useCallback(() => {
        setShowTrustVerifier(false);
        setShowCredentialRequest(true);
    }, [setShowTrustVerifier, setShowCredentialRequest]);

    const handleTrustButton = useCallback(async () => {
        try {
            const response = await addTrustedVerifierCallback();

            if (response && response.ok()) {
                handleTrustSuccess();
            } else {
                throw response?.error || new Error("Failed to add verifier to trusted list.");
            }
        } catch (err) {

            handleApiError(
                err,
                "addTrustedVerifier",
                addTrustedVerifierCallback,
                handleTrustSuccess
            );
        }
    }, [addTrustedVerifierCallback, handleApiError, handleTrustSuccess]);

    useEffect(() => {
        if (!presentationIdData || !showCredentialRequest) return;

        // Skip if already fetched for this presentationId
        if (fetchedCredentialsRef.current.has(presentationIdData)) return;

        const loadCredentials = async () => {
            setIsLoading(true);
            try {
                const response = await fetchData({
                    url: api.fetchPresentationCredentials.url(presentationIdData),
                    apiConfig: api.fetchPresentationCredentials
                });

                if (response && response.ok()) {
                    const data = response.data;
                    setCredentialsData(data?.availableCredentials ?? []);
                    setFilteredCredentials(data?.availableCredentials ?? []);
                    const raw = data?.missingClaims;
                    setMissingClaimsData(
                        Array.isArray(raw) ? raw.map((c: unknown) => String(c)) : []
                    );
                    fetchedCredentialsRef.current.add(presentationIdData);
                } else {
                    fetchedCredentialsRef.current.delete(presentationIdData);
                    setCredentialsData([]);
                    setFilteredCredentials([]);
                    setMissingClaimsData([]);
                    handleApiError(
                        response?.error ?? new Error("Failed to fetch credentials."),
                        "fetchPresentationCredentials"
                    );
                }
                setIsLoading(false);
            } catch (err) {
                setIsLoading(false);
                fetchedCredentialsRef.current.delete(presentationIdData);
                setCredentialsData([]);
                setMissingClaimsData([]);
                setFilteredCredentials([]);
                handleApiError(err, "fetchPresentationCredentials");
            }
        };

        void loadCredentials();
    }, [presentationIdData, showCredentialRequest, fetchData, handleApiError]);

    const handleShareCredentialsFromCard = useCallback(() => {
        if (!credentialsData?.length || selectedCredentialIds.length === 0) return;

        const selected: PresentationCredential[] = selectedCredentialIds
            .map((id) => credentialsData.find((c) => c.credentialId === id))
            .filter((c): c is PresentationCredential => Boolean(c))
            .map((c) => ({
                credentialId: c.credentialId,
                credentialTypeDisplayName: c.credentialTypeDisplayName,
                credentialTypeLogo: c.credentialTypeLogo,
                format: typeof c.format === "string" ? c.format : "",
            }));

        if (selected.length === 0) return;
        setSelectedCredentialsData(selected);
        setShowCredentialRequest(false);
    }, [credentialsData, selectedCredentialIds]);

    useEffect(() => {
        if (!isUserLoggedIn() || fetchingRef.current) {
            return;
        }

        fetchingRef.current = true;
        void loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isUserLoggedIn]);

    useEffect(() => {
        showLeaveWarnPopupRef.current = showLeaveWarnPopup;
    }, [showLeaveWarnPopup]);

    useEffect(() => {
        // Intercept browser back/forward (POP) on this page:
        // - Show LeaveConfirmationModal
        // - Keep user on this URL until they confirm
        const guard = createPopstateLeaveGuard({
            isModalOpen: () => showLeaveWarnPopupRef.current,
            onOpenModal: () => setShowLeaveWarnPopup(true),
        });
        removePopstateGuardRef.current = guard.remove;
        return () => {
            guard.remove();
            removePopstateGuardRef.current = null;
        };
    }, []);

    const isErrorActive = showError;

    const filterCredentials = (searchText: string) => {
        if (!credentialsData) return;
        const query = searchText.toLowerCase();
        const filtered = credentialsData.filter((credential) =>
            (credential?.credentialTypeDisplayName ?? "").toLowerCase().includes(query)
        );
        setFilteredCredentials(filtered);
    };

    const handleBackBtn = async () => {
        if (!presentationIdData || isRejectingRef.current) return;
        isRejectingRef.current = true;

        // We're leaving (likely full-page redirect). Remove the popstate handler to avoid loops.
        if (removePopstateGuardRef.current) {
            removePopstateGuardRef.current();
            removePopstateGuardRef.current = null;
        }

        const ok = await rejectVerifierRequest({
            presentationId: presentationIdData,
            fetchData,
            redirectUri: verifierData?.redirectUri || null
        });
        if (!ok) {
            isRejectingRef.current = false;
            handleApiError(new Error("Failed to reject verifier request."), "rejectVerifierRequest");
        }
    };

    return (
        <div className={VpAuthPageBackgroundStyles.contentOverlay}>
            <div>
                <div className={VpAuthPageBackgroundStyles.mainContainerTitle} data-testid={"page-title-container"}>
                    <div className={StoredCardsPageStyles.navContainer}>
                        <div className={StoredCardsPageStyles.navContainer}>
                            <NavBackArrowButton onBackClick={() => setShowLeaveWarnPopup(true)} />
                        </div>
                        <div className={StoredCardsPageStyles.titleContainer}>
                            <PageTitle value={t('mainPage.title')} testId={"stored-credentials"} />
                        </div>
                    </div>
                </div>
                <div className={StoredCardsPageStyles.searchContainer}>
                    <SearchBar
                        testId={"search-credentials"}
                        placeholder={t('mainPage.searchPlaceholder')}
                        filter={filterCredentials}
                    />
                </div>

                <div
                    className={VpAuthPageBackgroundStyles.credentialDetailsCard}
                    data-testid="vp-authorization-content"
                >
                    {showCredentialRequest && presentationIdData && verifierData && !isErrorActive && !isLoading && (
                        <>
                            <VerifierCredentialsRequestCard
                                verifier={verifierData}
                                presentationId={presentationIdData}
                                credentials={credentialsData}
                                selectedCredentialIds={selectedCredentialIds}
                                onShareCredentials={handleShareCredentialsFromCard}
                            />
                            <MatchingCredentials
                                credentials={filteredCredentials}
                                refreshCredentials={() => { }}
                                selectedCredentialIds={selectedCredentialIds}
                                onCredentialSelect={(id, isSelected) => {
                                    setSelectedCredentialIds(prev =>
                                        isSelected
                                            ? [...prev, id]
                                            : prev.filter(cId => cId !== id)
                                    );
                                }}
                                presentationId={presentationIdData}
                                redirectUri={verifierData?.redirectUri ?? null}
                                missingClaims={missingClaimsData}
                            />
                        </>
                    )}

                                {selectedCredentialsData && verifierData && presentationIdData && !isErrorActive && (
                                    <CredentialShareHandler
                                        verifierName={verifierData.name}
                                        returnUrl={verifierData.redirectUri || ROUTES.ROOT}
                                        selectedCredentials={selectedCredentialsData}
                                        presentationId={presentationIdData}
                                        onClose={() => { setSelectedCredentialsData(null); navigate(ROUTES.ROOT); }}
                                    />
                                )}

                </div>

                <LoaderModal
                                isOpen={isLoading || isRetrying}
                                title={!showCredentialRequest ? t("loadingCard.title") : ''}
                                subtitle={!showCredentialRequest ? t("loadingCard.subtitle") : ''}
                                message={showCredentialRequest ? t('CredentialRequestModal:loading.message') : ''}
                                size="xl-loading"
                                testId="modal-loader"
                />

                            <TrustVerifierModal
                                isOpen={showTrustVerifier && !isErrorActive}
                                logo={verifierData?.logo}
                                verifierName={verifierData?.name}
                                onTrust={handleTrustButton}
                                onCancel={() => {
                                    setShowTrustVerifier(false);
                                    setIsCancelConfirmation(true);
                                }}
                                testId="modal-trust-verifier"
                            />

                            <ErrorCard
                                isOpen={showError}
                                onClose={onClose}
                                onRetry={onRetry}
                                isRetrying={isRetrying}
                                title={errorTitle}
                                description={errorDescription}
                                testId="modal-error-card"
                            />

                            {isCancelConfirmation && presentationIdData && (
                                <TrustRejectionModal
                                    isOpen={isCancelConfirmation && !isErrorActive}
                                    presentationId={presentationIdData}
                                    redirectUri={verifierData?.redirectUri || null}
                                    onConfirm={() => {
                                        setIsCancelConfirmation(false);
                                    }}
                                    onClose={() => {
                                        setIsCancelConfirmation(false);
                                        setShowTrustVerifier(true);
                                    }}
                                    testId="modal-trust-rejection-modal"
                                />
                            )}

                {showLeaveWarnPopup && (
                    <LeaveConfirmationModal
                        confirmLeave={handleBackBtn}
                        cancelLeave={() => setShowLeaveWarnPopup(false)}
                        title={t("leaveConfirmation.title")}
                        description={t("leaveConfirmation.description")}
                        confirmBtnTitle={t("leaveConfirmation.confirmButton")}
                        cancelBtnTitle={t("leaveConfirmation.cancelButton")}
                    />
                )}
            </div>
        </div>
    );
};

