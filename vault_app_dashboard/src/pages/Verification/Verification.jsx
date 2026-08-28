function Verification() {

    return (

        <div className="verification-page">

            <h1>🔍 File Verification</h1>

            <p className="subtitle">
                Verify document authenticity using blockchain records
            </p>


            <div className="verify-box">

                <div className="upload-area">

                    <h2>📂 Upload File</h2>

                    <p>
                        Select a document or image to verify
                    </p>


                    <input
                        type="file"
                    />


                    <button>
                        Verify Now
                    </button>


                </div>


            </div>



            <div className="verification-result">

                <h2>Verification Result</h2>


                <div className="result-card">

                    <div>
                        <h3>📄 Research_Paper.pdf</h3>

                        <p>
                            Blockchain Hash:
                            <br/>
                            0x8A72F9B21ABC
                        </p>

                    </div>


                    <span className="verified">
                        ✔ Authentic
                    </span>


                </div>


            </div>



            <div className="blockchain-info">

                <h2>Blockchain Details</h2>

                <p>
                    ⛓ Transaction ID:
                    TXN_83920192
                </p>

                <p>
                    📅 Timestamp:
                    07 August 2026
                </p>

                <p>
                    🔐 Network:
                    Ethereum Testnet
                </p>


            </div>


        </div>

    );

}


export default Verification;