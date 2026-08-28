import "./Wallet.css";


function Wallet(){

    return(

        <div className="wallet-page">


            <div className="wallet-header">

                <h1>💳 Wallet</h1>

                <p>
                    Manage your blockchain wallet and transactions
                </p>

            </div>



            <div className="wallet-cards">


                <div className="wallet-card">

                    <h3>Wallet Balance</h3>

                    <h2>0.45 ETH</h2>

                    <p>
                        ≈ $1,250 USD
                    </p>

                </div>



                <div className="wallet-card">

                    <h3>Wallet Status</h3>

                    <h2 className="connected">
                        🟢 Connected
                    </h2>

                    <p>
                        Blockchain Network Active
                    </p>

                </div>



                <div className="wallet-card">

                    <h3>Wallet Address</h3>

                    <h2 className="address">
                        0x7A83...92FD
                    </h2>

                    <p>
                        Ethereum Network
                    </p>

                </div>


            </div>




            <div className="transaction-section">


                <h2>
                    Recent Transactions
                </h2>



                <div className="transaction">


                    <div>
                        <h3>
                            📄 Document Upload
                        </h3>

                        <p>
                            Hash stored on blockchain
                        </p>
                    </div>


                    <span>
                        +0.01 ETH
                    </span>


                </div>




                <div className="transaction">


                    <div>

                        <h3>
                            🔍 File Verification
                        </h3>

                        <p>
                            Blockchain verification completed
                        </p>

                    </div>


                    <span>
                        Verified
                    </span>


                </div>




                <div className="transaction">


                    <div>

                        <h3>
                            🔐 New Vault Created
                        </h3>

                        <p>
                            Secure storage initialized
                        </p>

                    </div>


                    <span>
                        Completed
                    </span>


                </div>



            </div>


        </div>

    );

}


export default Wallet;