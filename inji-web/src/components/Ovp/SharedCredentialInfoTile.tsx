import checkCircle from '../../assets/checkCircle.svg';
import { SharedCredentialInfoTileStyles } from "./OvpPageStyles";

interface SharedCredentialInfoTileProps {
    title: string;
    isSelected ?: boolean;
}

export function SharedCredentialInfoTile({ title, isSelected }: SharedCredentialInfoTileProps) {
    return (
        <div
            className={`${SharedCredentialInfoTileStyles.tileMainContainer} ${isSelected ? 'border-none bg-selected-credential-info-tile' : 'border-iw-borderGrayLight'}`}
        >
            {isSelected && (
                <span className={SharedCredentialInfoTileStyles.selectedCredentialCheckBox}>
                    <img src={checkCircle} alt="" className="h-3 w-3" aria-hidden />
                </span>
            )}
            {title}
        </div>
    )
}