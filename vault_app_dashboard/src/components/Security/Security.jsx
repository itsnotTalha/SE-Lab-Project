import "./Security.css";

function Security() {
    return (
        <div className="security-card">

            <h2>🛡 Security Status</h2>

            <div className="security-item">
                Blockchain Network
                <span>🟢 Active</span>
            </div>

            <div className="security-item">
                C2PA Verification
                <span>🟢 Enabled</span>
            </div>

            <div className="security-item">
                Encryption
                <span>🟢 AES-256</span>
            </div>

        </div>
    );
}

export default Security;