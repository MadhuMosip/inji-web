export const VpAuthPageBackgroundStyles = {
    mainPage: "relative bg-iw-background box-border flex h-full w-full max-w-full overflow-x-hidden",
    mainBody: "flex min-w-0 flex-1 flex-col overflow-y-auto",
    mainWithBackgrounds: "relative flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 h-full min-h-0 flex-1",
    backgroundTop: "pointer-events-none absolute top-0 left-0 z-0 w-full",
    backgroundBottom: "pointer-events-none absolute bottom-0 left-0 z-0 w-full",
    contentOverlay: "relative flex w-full flex-1 flex-col overflow-x-hidden pl-6 sm:pl-6 md:pl-6 lg:px-16 pr-3 mt-6",
    mainContainerTitle: "flex flex-col h-auto sm:flex-row justify-between items-start mb-4 sm:mb-6 gap-4 sm:gap-0 sm:items-start sm:pt-2 md:pt-4 lg:pt-6 mx-4 sm:px-0",
    credentialDetailsCard: "relative mx-auto flex w-full max-w-full min-h-0 flex-col pl-5 px-3 mt-4"
};


export const MatchingCredentialsStyles = {
    mainContainer: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
    outerCredentialTile: "flex flex-col rounded-xl border-[2px] bg-white shadow-sm transition-colors",
    innerCredentialTile: "text-[12px] font-medium bg-iw-lightGrayBg text-iw-mediumGrayText h-[37px] border-iw-lightGrayBorder border-b px-4 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors rounded-t-[10px] h-auto py-1.5",
    credentialCheckbox: "w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center bg-iw-successBg",
    credentialEmptyCheckbox: "w-5 h-5 flex-shrink-0 rounded-full border-2 border-iw-mediumGrayText",
    vcViewCard: "[&>*]:!border-none [&>*]:!shadow-none [&>*]:!m-0 [&>*]:!rounded-t-none [&>*]:!rounded-b-[10px]"
};


export const SharedCredentialInfoTileStyles = {
    tileMainContainer: "overflow-hidden text-[12px] font-[600] rounded-lg border-2 w-full min-h-[44px] max-h-auto px-5 py-1 flex items-center text-[#364153]",
    selectedCredentialCheckBox: "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-selected-credential-check-icon"
};

export const VerifierCredentialsRequestCardStyles = {
    mainContainer: "w-full overflow-hidden rounded-xl border-iw-brand-gradient h-full w-full rounded-lg m-1",
    shareButtonCard: "order-1 md:order-2 w-full",
    declineButton: "order-2 md:order-1 w-full md:w-auto",
    actionButtons: "flex flex-col md:flex-row gap-4 md:gap-10 mt-4",
    sharedCredentialsTiles: "mt-2 grid grid-cols-1 md:grid-cols-2 gap-y-4 sm:gap-4 w-full",
    verifierName: "text-iw-darkGrayishBlue text-lg font-semibold",
    credentialReqDesc: "text-iw-mediumGrayText text-[14px]",
    verifierDetails: "relative flex gap-x-3",
    footer: "bg-transparent md:bg-iw-lightGrayBg text-center md:text-left text-[12px] min-h-[37px] border-iw-lightGrayBorder border-none pb-2 md:pb-0  md:border-t px-4 text-sm flex items-center justify-center md:justify-start mt-3",
    requestDetails: "sm:px-4 px-2 pt-4 pb-1 flex flex-col gap-y-4 sm:gap-4"

};