import { Outlet } from "react-router-dom";

import Sidebar from "../Sidebar/Sidebar";
import Navbar from "../Navbar/Navbar";

function Layout() {
    return (
        <div className="app-layout">
            <Sidebar />

            <div className="main-area">
                <Navbar />

                <div className="dashboard-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default Layout;