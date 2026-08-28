import { Routes, Route } from "react-router-dom";

import Layout from "../components/Layout/Layout";

import DashboardPage from "../pages/dashboard/DashboardPage";
import Documents from "../pages/Documents/Documents";
import Profile from "../pages/Profile/Profile";
import Vault from "../pages/Vault/Vault";
import Wallet from "../pages/Wallet/Wallet";
import Verification from "../pages/Verification/Verification";
import Marketplace from "../pages/Marketplace/Marketplace.jsx";

function AppRouter() {
    return (
        <Routes>
            <Route element={<Layout />}>

                <Route path="/" element={<DashboardPage />} />

                <Route path="/documents" element={<Documents />} />

                <Route path="/profile" element={<Profile />} />

                <Route path="/vault" element={<Vault />} />

                <Route path="/wallet" element={<Wallet />} />

                <Route path="/verification" element={<Verification />} />

            </Route>
        </Routes>
    );
}

export default AppRouter;