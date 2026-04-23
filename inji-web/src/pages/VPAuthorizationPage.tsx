import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../utils/api";
import { LoaderModal } from "../modals/LoaderModal";
import { useTranslation } from "react-i18next";
import { TrustVerifierModal } from "../components/Issuers/TrustVerifierModal";
import { ErrorCard } from "../modals/ErrorCard";
import { TrustRejectionModal } from "../components/Issuers/TrustRejectionModal";
import { CredentialRequestModal } from "../modals/CredentialRequestModal";
import { useApi } from "../hooks/useApi";
import { useNavigate } from 'react-router-dom';
import {OPENID4VP_AUTHORIZE_PREFIX, ROUTES} from "../utils/constants";
import { Sidebar } from "../components/User/Sidebar";
import { PresentationCredential } from "../types/components";
import { CredentialShareHandler } from "../handlers/CredentialShareHandler";
import { useApiErrorHandler } from "../hooks/useApiErrorHandler";
import { useUser } from '../hooks/User/useUser';
import CredentialShareCard from "../components/Ovp/CredentialShareCard";
import {PageTitleStyles} from "../components/Common/PageTitle/PageTitleStyles";
import DashboardBgTop from "../assets/Background.svg";
import DashboardBgBottom from "../assets/DashboardBgBottom.svg";
import MatchingCredentials from "../components/Ovp/MatchingCredentials";

/** Local layout/background for this page only (do not share with Layout / other screens). */
const VpAuthPageBackgroundStyles = {
    mainWithBackgrounds: "relative flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300",
    backgroundTop: "pointer-events-none absolute top-0 left-0 z-0 w-full",
    backgroundBottom: "pointer-events-none absolute bottom-0 left-0 z-0 w-full",
    // No overflow-y here: Router wrapElement already provides the page scroll. Nested overflow-y caused an extra bar.
    contentOverlay: "relative z-10 flex w-full min-h-0 flex-1 flex-col overflow-x-hidden",
} as const;

export const VPAuthorizationPage: React.FC = () => {
    const { t } = useTranslation(["VerifierTrustPage", "CredentialRequestModal"]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isCancelConfirmation, setIsCancelConfirmation] = useState<boolean>(false);
    const [showTrustVerifier, setShowTrustVerifier] = useState<boolean>(false);
    const [showCredentialRequest, setShowCredentialRequest] = useState<boolean>(false);
    const [verifierData, setVerifierData] = useState<any>(null);
    const [presentationIdData, setPresentationIdData] = useState<string | null>(null);
    const [selectedCredentialsData, setSelectedCredentialsData] = useState<PresentationCredential[] | null>(null);
    const [credentialsData, setCredentialsData] = useState<any[] | null>(null);
    const fetchingRef = useRef<boolean>(false);
    const fetchedCredentialsRef = useRef<Set<string>>(new Set());

    const apiService = useApi();
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
        const response = await apiService.fetchData({
            apiConfig: api.validateVerifierRequest,
            body: { authorizationRequestUrl: `${OPENID4VP_AUTHORIZE_PREFIX}${cleanParams}` },
        });
        return response;
    }, [apiService]);

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
        const response = await apiService.fetchData({
            apiConfig: api.addTrustedVerifier,
            body: { verifierId: verifierData.id },
        });

        return response;
    }, [apiService, verifierData?.id]);

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

    const handleNoTrustButton = () => {
        setShowTrustVerifier(false);
        setShowCredentialRequest(true);
    };

    useEffect(() => {
        if (!presentationIdData || !showCredentialRequest) return;
        
        // Skip if already fetched for this presentationId
        if (fetchedCredentialsRef.current.has(presentationIdData)) return;
        
        const loadCredentials = async () => {
            setIsLoading(true);
            try {
                const response = await apiService.fetchData({
                    url: api.fetchPresentationCredentials.url(presentationIdData),
                    apiConfig: api.fetchPresentationCredentials
                });
                console.log("Fetched credentials response:");
                console.log(response);
                
                if (response && response.ok()) {
                    setCredentialsData(response.data.availableCredentials);
                } else {
                    console.error("Failed to fetch credentials:", response?.error);
                    setCredentialsData([]);
                }
                setIsLoading(false);
            } catch (err) {
                setIsLoading(false);
                console.error("Error fetching credentials:", err);
                setCredentialsData([]);
            }
        };
        
        // Mark as fetched
        fetchedCredentialsRef.current.add(presentationIdData);
        loadCredentials();
    }, [presentationIdData, showCredentialRequest, apiService]);

    const handleCredentialRequestCancel = () => {
        setShowCredentialRequest(false);
        navigate(ROUTES.ROOT);
    };

    const handleCredentialRequestConsent = (selectedCredentials: PresentationCredential[]) => {
        setSelectedCredentialsData(selectedCredentials);
        setShowCredentialRequest(false);
    };

    useEffect(() => {
        if (!isUserLoggedIn() || fetchingRef.current) {
            return;
        }

        fetchingRef.current = true;
        void loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isUserLoggedIn]);

    const isErrorActive = showError;

    return (
        <div className="bg-iw-background box-border flex w-full min-h-full max-w-full overflow-x-hidden">
            <div className="flex-shrink-0">
                <Sidebar disabled={true} forceLeftPosition={true} />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div
                    className={`h-full min-h-0 flex-1 ${VpAuthPageBackgroundStyles.mainWithBackgrounds}`}
                >
                    <img
                        src={DashboardBgTop}
                        alt="Gradient Top Background"
                        className={VpAuthPageBackgroundStyles.backgroundTop}
                    />
                    <img
                        src={DashboardBgBottom}
                        alt="Gardient Bottom Background"
                        className={VpAuthPageBackgroundStyles.backgroundBottom}
                    />

                    <div className={VpAuthPageBackgroundStyles.contentOverlay}>
                        <div className="mx-auto ml-2 flex min-h-0 w-full max-w-full flex-1 flex-col sm:ml-7 sm:px-2 md:px-4 lg:px-6 pb-1 sm:pb-0 sm:pt-2 md:pt-4 lg:pt-6 ml-3 sm:ml-0">
                <div className="flex flex-col sm:flex-row justify-between  sm:items-center items-start mb-4 sm:mb-6 gap-4 sm:gap-0 px-4 sm:items-start sm:mr-0" data-testid={"page-title-container"}>
                    <div className="flex items-start">
                        <div className="flex flex-col items-start">
                            <h1 className={PageTitleStyles.title}>{t('mainPage.title')}</h1>
                        </div>
                    </div>
                </div>

                <div
                    className="relative mx-auto flex w-full max-w-full min-h-0 flex-col sm:px-4"
                    data-testid="vp-authorization-content"
                >
                {showCredentialRequest && presentationIdData && verifierData && !isErrorActive && !isLoading && (
                    <>
                    <CredentialShareCard verifier={verifierData} presentationId={presentationIdData} />
                    <MatchingCredentials credentials={credentialsData} refreshCredentials={() => {}} />
                    </>
                )}
                
                {/* {showCredentialRequest && presentationIdData && (
                    <CredentialRequestModal
                        isVisible={showCredentialRequest && !isErrorActive}
                        verifierName={verifierData?.name || 'Verifier'}
                        presentationId={presentationIdData}
                        verifier={{ redirectUri: verifierData?.redirectUri || null }}
                        onCancel={handleCredentialRequestCancel}
                        onConsentAndShare={handleCredentialRequestConsent}
                    />
                )}

                {selectedCredentialsData && verifierData && presentationIdData && !isErrorActive && (
                    <CredentialShareHandler
                        verifierName={verifierData.name}
                        returnUrl={verifierData.redirectUri || ROUTES.ROOT}
                        selectedCredentials={selectedCredentialsData}
                        presentationId={presentationIdData}
                        onClose={() => { setSelectedCredentialsData(null); navigate(ROUTES.ROOT); }}
                    />
                )} */}

                </div>

                <LoaderModal
                    isOpen={isLoading || isRetrying }
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
                    onNotTrust={handleNoTrustButton}
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

