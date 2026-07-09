import { DcqlQueryGroup, DcqlSelectionState } from "../../types/dcql";
import { SelectedSdClaimsMap } from "../../types/data";
import { DcqlQueryGroupsStyles } from "./OvpPageStyles";
import { QueryGroupSection } from "./QueryGroupSection";
import { RequirementInfoVerifier } from "../../modals/CredentialRequirementInfoModal";

interface DcqlQueryGroupsProps {
    queryGroups: DcqlQueryGroup[];
    selection: DcqlSelectionState;
    refreshCredentials?: () => void;
    selectedSdClaimsByCredential?: SelectedSdClaimsMap;
    presentationId?: string;
    redirectUri?: string | null;
    verifier?: RequirementInfoVerifier | null;
    onCredentialSelect: (
        queryId: string,
        credentialId: string,
        isSelected: boolean
    ) => void;
    onSdClaimsConfirm?: (credentialId: string, selectedClaimPaths: string[]) => void;
}

function DcqlQueryGroups({
    queryGroups,
    selection,
    refreshCredentials,
    selectedSdClaimsByCredential,
    presentationId,
    redirectUri,
    verifier,
    onCredentialSelect,
    onSdClaimsConfirm,
}: DcqlQueryGroupsProps) {
    const mandatoryGroups = queryGroups.filter((group) => group.required);
    const optionalGroups = queryGroups.filter((group) => !group.required);

    return (
        <div
            className={DcqlQueryGroupsStyles.mainContainer}
            data-testid="dcql-query-groups"
        >
            {mandatoryGroups.map((group) => (
                <QueryGroupSection
                    key={group.queryId}
                    group={group}
                    selectedCredentialIds={selection[group.queryId] ?? []}
                    defaultExpanded
                    refreshCredentials={refreshCredentials}
                    selectedSdClaimsByCredential={selectedSdClaimsByCredential}
                    presentationId={presentationId}
                    redirectUri={redirectUri}
                    verifier={verifier}
                    onCredentialSelect={onCredentialSelect}
                    onSdClaimsConfirm={onSdClaimsConfirm}
                />
            ))}
            {optionalGroups.map((group) => (
                <QueryGroupSection
                    key={group.queryId}
                    group={group}
                    selectedCredentialIds={selection[group.queryId] ?? []}
                    defaultExpanded={false}
                    refreshCredentials={refreshCredentials}
                    selectedSdClaimsByCredential={selectedSdClaimsByCredential}
                    presentationId={presentationId}
                    redirectUri={redirectUri}
                    verifier={verifier}
                    onCredentialSelect={onCredentialSelect}
                    onSdClaimsConfirm={onSdClaimsConfirm}
                />
            ))}
        </div>
    );
}

export default DcqlQueryGroups;
