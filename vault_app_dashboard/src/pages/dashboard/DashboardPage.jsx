import "./DashboardPage.css";

import SummaryCard from "../../components/dashboard/SummaryCard";
import Security from "../../components/Security/Security";
import Activity from "../../components/Activity/Activity";
import Welcome from "../../components/Welcome/Welcome";

function DashboardPage() {
    return (
        <>
            <Welcome />

            <div className="card-container">
                <SummaryCard
                    icon="📁"
                    title="Assets"
                    value="25"
                />

                <SummaryCard
                    icon="📄"
                    title="Documents"
                    value="14"
                />

                <SummaryCard
                    icon="🛡️"
                    title="Verification Reports"
                    value="18"
                />

                <SummaryCard
                    icon="🔒"
                    title="Vault"
                    value="7"
                />

                <SummaryCard
                    icon="💳"
                    title="Wallet"
                    value="$5200"
                />
            </div>

            <Activity />
            <Security />
        </>
    );
}

export default DashboardPage;