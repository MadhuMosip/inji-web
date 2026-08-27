import React from 'react';
import {waitFor} from '@testing-library/react';
import {RedirectionPage} from '../../pages/RedirectionPage';
import {getActiveSession} from '../../utils/sessions';
import {
    downloadCredentialPDF,
    getCredentialRequestBody,
    getErrorObject,
    getTokenRequestBody
} from '../../utils/misc';
import {mockusei18n, renderWithProvider, renderWithRouter} from '../../test-utils/mockUtils';
import {mockApiResponse, mockApiResponseSequence, mockUseApi} from "../../test-utils/setupUseApiMock";
import {RequestStatus} from "../../utils/constants";
import {generateDpopProof} from "../../utils/dpop";
import {api} from "../../utils/api";

//todo : extract the local method to mockUtils, which is added to bypass the routing problems
// Mock the utility functions
jest.mock('../../utils/sessions', () => ({
    getActiveSession: jest.fn(),
    removeActiveSession: jest.fn(),
}));
jest.mock('../../utils/misc', () => ({
    downloadCredentialPDF: jest.fn(),
    getCredentialRequestBody: jest.fn(),
    getErrorObject: jest.fn(),
    getTokenRequestBody: jest.fn(),
}));

jest.mock('../../utils/dpop', () => ({
    ...jest.requireActual('../../utils/dpop'),
    generateDpopProof: jest.fn().mockResolvedValue('dpop-proof'),
    removeDpopSession: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../hooks/useApi.ts', () => ({
    useApi: () => mockUseApi
}))

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useSearchParams: jest.fn(() => [new URLSearchParams('state=sessionId1'), jest.fn()]),
}));

describe('Testing the Layout of RedirectionPage', () => {
    mockusei18n();
    test('Check if the layout is matching with the snapshots', () => {
        (getActiveSession as jest.Mock).mockReturnValue({
            selectedIssuer: {
                issuer_id: 'issuer1',
                display: [{name: 'Test Issuer'}]
            },
            selectedCredentialType: {type: 'CredentialType', displayObj: []},
            codeVerifier: 'code-verifier',
            state: 'sessionId1',
            dpopTokenEndpoint: 'https://issuer.example/token',
            dpopCredentialEndpoint: 'https://issuer.example/credential'
        });
        mockApiResponse({})
        jest.spyOn(require('react-router-dom'), 'useSearchParams').mockReturnValue([new URLSearchParams('state=sessionId1&code=auth-code'), jest.fn()]);

        const {asFragment} = renderWithRouter(<RedirectionPage/>);

        expect(asFragment()).toMatchSnapshot();
    });
});

describe('Testing the Functionality of RedirectionPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockusei18n();
        (generateDpopProof as jest.Mock).mockResolvedValue('dpop-proof');
        (getActiveSession as jest.Mock).mockReturnValue({
            selectedIssuer: {
                issuer_id: 'issuer1',
                display: [{name: 'Test Issuer'}]
            },
            selectedCredentialType: {type: 'CredentialType', displayObj: []},
            codeVerifier: 'code-verifier',
            state: 'sessionId1',
            dpopTokenEndpoint: 'https://issuer.example/token',
            dpopCredentialEndpoint: 'https://issuer.example/credential'
        });
        mockApiResponse()
        jest.spyOn(require('react-router-dom'), 'useSearchParams').mockReturnValue([new URLSearchParams('state=sessionId1&code=auth-code'), jest.fn()]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("check if getSession is called with the sessionId from url search params state", () => {
        renderWithProvider(<RedirectionPage/>)

        expect(getActiveSession).toHaveBeenCalledWith('sessionId1');
    })

    test('Check if NavBar component is rendered', () => {
        const {asFragment} = renderWithRouter(<RedirectionPage/>);

        expect(asFragment()).toMatchSnapshot();
    });

    test.each([
        {
            name: 'displays error message if state is ERROR',
            setup: () => {
                (getErrorObject as jest.Mock).mockReturnValue({
                    code: 'error.generic.title',
                    message: 'error.generic.subTitle'
                });
                mockApiResponse({error: true, state: RequestStatus.ERROR, status: 500});
            }
        },
        {
            name: 'DownloadResult component shows loading state',
            setup: () => {
                // Default setup already includes loading state
            }
        },
        {
            name: 'DownloadResult component shows success state',
            setup: () => {
                (downloadCredentialPDF as jest.Mock).mockResolvedValueOnce(true);
                mockApiResponse({
                    data: new Blob(),
                    headers: {
                        "Content-Disposition": "attachment; filename=credential",
                        "Content-Type": "application/pdf"
                    },
                    status: 200,
                    state: RequestStatus.DONE
                });
            }
        }
    ])('Check if $name', async ({setup}) => {
        setup();
        const {asFragment} = renderWithRouter(<RedirectionPage/>);
        expect(asFragment()).toMatchSnapshot();
    });

    test.todo("check if credential download API with right params is called for logged in user")
    test.todo("check if redirects to issuer page after successful download initiation for logged in user")

    test("calls get-token then guest credential download with DPoP proofs", async () => {
        const tokenBody = {
            grant_type: "authorization_code",
            code: "auth-code",
            redirect_uri: "https://wallet.example/redirect",
            code_verifier: "code-verifier"
        };
        const credentialBody = {
            issuer: "issuer1",
            credential: "CredentialType",
            vcStorageExpiryLimitInTimes: "-1",
            access_token: "access-token",
            token_type: "DPoP"
        };
        (getTokenRequestBody as jest.Mock).mockReturnValue(tokenBody);
        (getCredentialRequestBody as jest.Mock).mockReturnValue(credentialBody);
        mockUseApi.fetchData.mockReset();
        mockApiResponseSequence([
            {
                data: {access_token: "access-token", token_type: "DPoP"},
                status: 200,
                state: RequestStatus.DONE
            },
            {
                data: new Blob(["credential"]),
                status: 200,
                state: RequestStatus.DONE
            }
        ]);

        renderWithRouter(<RedirectionPage/>);

        await waitFor(() => expect(mockUseApi.fetchData).toHaveBeenCalledTimes(2));
        expect(mockUseApi.fetchData).toHaveBeenNthCalledWith(1, expect.objectContaining({
            apiConfig: api.getTokenV2,
            url: expect.stringContaining("/v2/get-token/issuer1"),
            headers: expect.objectContaining({DPoP: "dpop-proof"})
        }));
        expect(mockUseApi.fetchData).toHaveBeenNthCalledWith(2, expect.objectContaining({
            apiConfig: api.fetchTokenAnddownloadVc,
            body: credentialBody,
            headers: expect.objectContaining({DPoP: "dpop-proof"})
        }));
        expect(generateDpopProof).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: "https://issuer.example/credential",
            accessToken: "access-token"
        }));
        expect(downloadCredentialPDF).toHaveBeenCalled();
    });

    test("rebuilds the token proof and retries once for a DPoP nonce challenge", async () => {
        (getTokenRequestBody as jest.Mock).mockReturnValue({
            grant_type: "authorization_code",
            code: "auth-code",
            redirect_uri: "https://wallet.example/redirect",
            code_verifier: "code-verifier"
        });
        (getCredentialRequestBody as jest.Mock).mockReturnValue({
            issuer: "issuer1",
            credential: "CredentialType",
            vcStorageExpiryLimitInTimes: "-1",
            access_token: "access-token",
            token_type: "Bearer"
        });
        mockUseApi.fetchData.mockReset();
        mockApiResponseSequence([
            {
                status: 400,
                state: RequestStatus.ERROR,
                headers: {"dpop-nonce": "as-nonce"},
                error: {response: {data: {error: "use_dpop_nonce"}}}
            },
            {
                data: {access_token: "access-token", token_type: "Bearer"},
                status: 200,
                state: RequestStatus.DONE
            },
            {
                data: new Blob(["credential"]),
                status: 200,
                state: RequestStatus.DONE
            }
        ]);

        renderWithRouter(<RedirectionPage/>);

        await waitFor(() => expect(mockUseApi.fetchData).toHaveBeenCalledTimes(3));
        expect(generateDpopProof).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: "https://issuer.example/token",
            nonce: "as-nonce"
        }));
    });

    test("retries token request when MOSIP returns XML use_dpop_nonce", async () => {
        (getTokenRequestBody as jest.Mock).mockReturnValue({
            grant_type: "authorization_code",
            code: "auth-code",
            redirect_uri: "https://wallet.example/redirect",
            code_verifier: "code-verifier"
        });
        (getCredentialRequestBody as jest.Mock).mockReturnValue({
            issuer: "issuer1",
            credential: "CredentialType",
            vcStorageExpiryLimitInTimes: "-1",
            access_token: "access-token",
            token_type: "Bearer"
        });
        mockUseApi.fetchData.mockReset();
        mockApiResponseSequence([
            {
                status: 400,
                state: RequestStatus.ERROR,
                headers: {"dpop-nonce": "as-nonce"},
                error: {
                    response: {
                        data: "<OAuthError><error>use_dpop_nonce</error><error_description>Authorization server requires nonce in DPoP proof</error_description></OAuthError>"
                    }
                }
            },
            {
                data: {access_token: "access-token", token_type: "Bearer"},
                status: 200,
                state: RequestStatus.DONE
            },
            {
                data: new Blob(["credential"]),
                status: 200,
                state: RequestStatus.DONE
            }
        ]);

        renderWithRouter(<RedirectionPage/>);

        await waitFor(() => expect(mockUseApi.fetchData).toHaveBeenCalledTimes(3));
        expect(generateDpopProof).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: "https://issuer.example/token",
            nonce: "as-nonce"
        }));
    });
});
