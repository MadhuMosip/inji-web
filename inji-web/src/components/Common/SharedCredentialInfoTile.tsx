
interface SharedCredentialInfoTileProps {
    title: string;
}

export function SharedCredentialInfoTile({title}: SharedCredentialInfoTileProps) {
    return (
        <div className="overflow-hidden rounded-lg border-iw-borderGrayLight border-2 w-[50%] h-[44px] px-3 py-1 flex items-center">
            {title}
        </div>
    )
}
