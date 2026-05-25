import React from "react";
import { ClaimLeaf } from "../../../../utils/sdClaimsTree";
import { ClaimCheckbox } from "./ClaimCheckbox";
import { SdClaimInputStyles } from "./SdClaimInputStyles";

interface ClaimLeafRowProps {
    node: ClaimLeaf;
    depth?: number;
    isSelected: boolean;
    onToggle?: () => void;
}

export const ClaimLeafRow: React.FC<ClaimLeafRowProps> = ({
    node,
    depth = 0,
    isSelected,
    onToggle,
}) => {
    const isToggleable = node.claimType === "sdClaim" && !!onToggle;

    return (
        <button
            type="button"
            className={SdClaimInputStyles.leafRow}
            data-testid={`claim-leaf-${node.path}`}
            onClick={isToggleable ? onToggle : undefined}
            disabled={!isToggleable}
            aria-pressed={isToggleable ? isSelected : undefined}
        >
            <ClaimCheckbox
                claimType={node.claimType}
                selected={isSelected}
                readOnly={isToggleable}
                testId={`claim-checkbox-${node.path}`}
            />
            <p className={SdClaimInputStyles.leafLabel}>{node.label}</p>
        </button>
    );
};
