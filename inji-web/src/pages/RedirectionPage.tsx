import React, {useEffect, useState} from 'react';
import {getActiveSession, removeActiveSession} from '../utils/sessions';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {NavBar} from '../components/Common/NavBar';
import {DownloadResult} from '../components/Redirection/DownloadResult';
import {api} from '../utils/api';
import {ApiResult, CredentialRequestBody, SessionObject, TokenRequestBody, TokenResponse} from '../types/data';
import {useTranslation} from 'react-i18next';
import {downloadCredentialPDF, getCredentialRequestBody, getErrorObject, getTokenRequestBody} from '../utils/misc';
import {getIssuerDisplayObjectForCurrentLanguage} from '../utils/i18n';
import {useUser} from '../hooks/User/useUser';
import {RequestStatus, ROUTES} from "../utils/constants";
import {useDownloadSessionDetails} from "../hooks/User/useDownloadSession";
import {useApi} from "../hooks/useApi";
import {useSelector} from "react-redux";
import {RootState} from "../types/redux";
import {generateDpopProof, isUseDpopNonceError, removeDpopSession} from "../utils/dpop";
import {AxiosError} from "axios";

export const RedirectionPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const redirectedSessionId = searchParams.get("state");
    const activeSessionInfo: any = getActiveSession(redirectedSessionId);
    const credentialType = activeSessionInfo?.selectedCredentialType?.type;
    const credentialTypeDisplayObj =
        activeSessionInfo?.selectedCredentialType?.displayObj;
    const {t} = useTranslation("RedirectionPage");
    const [session, setSession] = useState<SessionObject | null>(activeSessionInfo);
    const [completedDownload, setCompletedDownload] = useState<boolean>(false);
    const [issuanceError, setIssuanceError] = useState<boolean>(false);
    const displayObject = getIssuerDisplayObjectForCurrentLanguage(session?.selectedIssuer?.display ?? []);
    const language = useSelector((state: RootState) => state.common.language);
    const {isUserLoggedIn} = useUser();
    const navigate = useNavigate();
    const {addSession, updateSession} = useDownloadSessionDetails();
    const tokenApi = useApi<TokenResponse>();
    const vcDownloadApi = useApi();

    const getResponseHeader = (headers: object, name: string): string | undefined => {
        const headerContainer = headers as Record<string, string> & {get?: (headerName: string) => string | null};
        return headerContainer.get?.(name) ??
            headerContainer[name] ??
            headerContainer[name.toLowerCase()];
    };

    const isDpopNonceChallenge = (response: ApiResult<unknown>): boolean => {
        const nonce = getResponseHeader(response.headers, "DPoP-Nonce");
        const wwwAuthenticate = getResponseHeader(response.headers, "WWW-Authenticate") ?? "";
        const errorData = (response.error as AxiosError<{error?: string; message?: string} | string> | null)?.response?.data;
        return Boolean(nonce && isUseDpopNonceError(errorData, wwwAuthenticate));
    };

    const handleLoggedInDownloadFlow = async (
        issuerId: string,
        requestBody: CredentialRequestBody,
        dpopProof?: string
    ) => {
        const downloadId = addSession(credentialTypeDisplayObj, RequestStatus.LOADING);
        navigate(ROUTES.USER_ISSUER(issuerId))
        const request = async (proof?: string) => vcDownloadApi.fetchData({
            body: requestBody,
            apiConfig: api.downloadVCInloginFlow,
            headers: {
                ...api.downloadVCInloginFlow.headers(language),
                ...(proof ? {DPoP: proof} : {})
            }
        });
        let credentialDownloadResponse = await request(dpopProof);

        if (dpopProof && isDpopNonceChallenge(credentialDownloadResponse)) {
            const nonce = getResponseHeader(credentialDownloadResponse.headers, "DPoP-Nonce")!;
            const token = (requestBody as {accessToken: string}).accessToken;
            const retryProof = await generateDpopProof({
                sessionId: redirectedSessionId!,
                endpoint: activeSessionInfo.selectedIssuer.credentials_endpoint,
                nonce,
                accessToken: token
            });
            credentialDownloadResponse = await request(retryProof);
        }

        if (credentialDownloadResponse.ok()) {
            updateSession(downloadId, RequestStatus.DONE)
        } else {
            updateSession(downloadId, RequestStatus.ERROR)
        }
    }

    const handleGuestDownloadFlow = async (
        requestBody: CredentialRequestBody,
        dpopProof?: string
    ) => {
        const request = async (proof?: string) => vcDownloadApi.fetchData({
            body: requestBody,
            apiConfig: api.fetchTokenAnddownloadVc,
            headers: {
                ...api.fetchTokenAnddownloadVc.headers(),
                ...(proof ? {DPoP: proof} : {})
            }
        });
        let credentialDownloadResponse = await request(dpopProof);

        if (dpopProof && isDpopNonceChallenge(credentialDownloadResponse)) {
            const nonce = getResponseHeader(credentialDownloadResponse.headers, "DPoP-Nonce")!;
            const token = (requestBody as {access_token: string}).access_token;
            const retryProof = await generateDpopProof({
                sessionId: redirectedSessionId!,
                endpoint: activeSessionInfo.selectedIssuer.credentials_endpoint,
                nonce,
                accessToken: token
            });
            credentialDownloadResponse = await request(retryProof);
        }

        if (credentialDownloadResponse.state !== RequestStatus.ERROR) {
            await downloadCredentialPDF(
                credentialDownloadResponse.data,
                credentialType + ".pdf"
            );
            setCompletedDownload(true);
        }
    }

    const fetchToken = async () => {
        if (Object.keys(activeSessionInfo).length > 0) {
            const sessionId = redirectedSessionId!;
            try {
                const code = searchParams.get('code') ?? '';
                const codeVerifier = activeSessionInfo.codeVerifier;
                const issuer = activeSessionInfo.selectedIssuer;
                const issuerId = issuer?.issuer_id ?? '';
                const tokenEndpoint = activeSessionInfo.dpopTokenEndpoint;
                const credentialEndpoint = activeSessionInfo.dpopCredentialEndpoint;
                const vcStorageExpiryLimitInTimes =
                    activeSessionInfo.vcStorageExpiryLimitInTimes ?? '-1';
                
                if (!code || !codeVerifier || !issuerId || !tokenEndpoint || !credentialEndpoint) {
                    throw new Error("Missing issuance session data");
                }
                
                const tokenRequestBody: TokenRequestBody = getTokenRequestBody(code, codeVerifier);
                const requestToken = async (proof: string) => tokenApi.fetchData({
                    body: tokenRequestBody,
                    apiConfig: api.getTokenV2,
                    url: api.getTokenV2.url(issuerId),
                    headers: {...api.getTokenV2.headers(), DPoP: proof}
                });

                let tokenProof = await generateDpopProof({
                    sessionId,
                    endpoint: tokenEndpoint
                });
                let tokenResponse = await requestToken(tokenProof);

                if (isDpopNonceChallenge(tokenResponse)) {
                    tokenProof = await generateDpopProof({
                        sessionId,
                        endpoint: tokenEndpoint,
                        nonce: getResponseHeader(tokenResponse.headers, "DPoP-Nonce")
                    });
                    tokenResponse = await requestToken(tokenProof);
                }

                if (!tokenResponse.ok() || !tokenResponse.data?.access_token) {
                    return;
                }

                const credentialRequestBody = getCredentialRequestBody(
                    issuerId,
                    credentialType,
                    String(vcStorageExpiryLimitInTimes),
                    tokenResponse.data,
                    isUserLoggedIn()
                );
                const credentialProof = tokenResponse.data.token_type?.toLowerCase() === "dpop"
                    ? await generateDpopProof({
                        sessionId,
                        endpoint: credentialEndpoint,
                        accessToken: tokenResponse.data.access_token
                    })
                    : undefined;

                if (isUserLoggedIn()) {
                    await handleLoggedInDownloadFlow(issuerId, credentialRequestBody, credentialProof);
                } else {
                    await handleGuestDownloadFlow(credentialRequestBody, credentialProof);
                }
            } catch (error) {
                console.error("Error during token fetch or credential download:", error);
                setIssuanceError(true);
            } finally {
                removeActiveSession(sessionId);
                await removeDpopSession(sessionId);
            }
        } else {
            setSession(null);
        }
    };

    useEffect(() => {
        void fetchToken();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadStatusOfRedirection = () => {
        if (!session) {
            return <DownloadResult title={t("error.invalidSession.title")}
                                   subTitle={t("error.invalidSession.subTitle")}
                                   state={RequestStatus.ERROR}/>
        }
        if (issuanceError || tokenApi.state === RequestStatus.ERROR || vcDownloadApi.state === RequestStatus.ERROR) {
            const errorObject = getErrorObject(vcDownloadApi.data ?? tokenApi.data) ?? {
                code: "error.generic.title",
                message: "error.generic.subTitle"
            };
            return <DownloadResult title={t(errorObject.code)}
                                   subTitle={t(errorObject.message)}
                                   state={RequestStatus.ERROR}/>
        }
        if (!completedDownload) {
            return <DownloadResult title={t("loading.title")}
                                   subTitle={t("loading.subTitle")}
                                   state={RequestStatus.LOADING}/>
        }
        return <DownloadResult title={t("success.title")}
                               subTitle={t("success.subTitle")}
                               state={RequestStatus.DONE}/>
    }

    return <div data-testid="Redirection-Page-Container">
        {activeSessionInfo?.selectedIssuer?.issuer_id && <NavBar title={displayObject?.name ?? ""} search={false}
                                                                 link={`/issuers/${activeSessionInfo?.selectedIssuer?.issuer_id}`}/>}
        {loadStatusOfRedirection()}
    </div>
}