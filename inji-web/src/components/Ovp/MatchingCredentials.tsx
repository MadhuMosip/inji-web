import {VCCardView} from "../VC/VCCardView";
import {WalletCredential} from "../../types/data";

interface MatchingCredentialsProps {
    credentials?: WalletCredential[] | null;
    refreshCredentials?: () => void;
}

function MatchingCredentials({ credentials, refreshCredentials }: MatchingCredentialsProps) {
    return (
        <div>
            {credentials && credentials.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {credentials.map((credential, index) => (
                        <VCCardView 
                            key={credential.credentialId || index}
                            credential={credential}
                            refreshCredentials={refreshCredentials || (() => {})}
                        />
                    ))}
                </div>
            ) : (
                <p>No credentials found</p>
            )}
        </div>
    )
};

export default MatchingCredentials;