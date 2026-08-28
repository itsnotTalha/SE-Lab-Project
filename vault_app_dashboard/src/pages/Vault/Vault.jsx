function Vault() {

    return (

        <div className="vault-page">

            <h1>🔒 My Vault</h1>
            <p className="subtitle">
                Securely store and manage your blockchain protected files
            </p>


            <div className="vault-stats">

                <div className="vault-card">
                    <h3>Total Files</h3>
                    <h2>24</h2>
                    <p>Stored Documents</p>
                </div>


                <div className="vault-card">
                    <h3>Verified Files</h3>
                    <h2>18</h2>
                    <p>Blockchain Verified</p>
                </div>


                <div className="vault-card">
                    <h3>Security Status</h3>
                    <h2>🟢 Safe</h2>
                    <p>All systems protected</p>
                </div>


            </div>



            <div className="file-section">

                <div className="section-header">

                    <h2>Your Files</h2>

                    <button>
                        + Upload File
                    </button>

                </div>



                <div className="file-card">

                    <div>
                        <h3>📄 Research_Paper.pdf</h3>
                        <p>
                            Hash: 0x8A72F9B21
                        </p>
                    </div>

                    <span className="verified">
                        ✔ Verified
                    </span>

                </div>



                <div className="file-card">

                    <div>
                        <h3>🖼️ Project_Image.png</h3>
                        <p>
                            Hash: 0x91BC42D77
                        </p>
                    </div>

                    <span className="verified">
                        ✔ Verified
                    </span>

                </div>



                <div className="file-card">

                    <div>
                        <h3>📄 Certificate.pdf</h3>
                        <p>
                            Hash: 0x72FA88321
                        </p>
                    </div>

                    <span className="pending">
                        Pending
                    </span>

                </div>


            </div>


        </div>

    );

}


export default Vault;