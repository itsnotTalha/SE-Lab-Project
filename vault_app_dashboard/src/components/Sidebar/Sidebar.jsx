import "./Sidebar.css";
import { NavLink } from "react-router-dom";

function Sidebar() {
    return (
        <div className="sidebar">
            <h2>🔐 VaultChain</h2>

            <ul>
                <li>
                    <NavLink to="/">🏠 Dashboard</NavLink>
                </li>

                <li>
                    <NavLink to="/documents">📄 Documents</NavLink>
                </li>

                <li>
                    <NavLink to="/verification">🛡 Verification</NavLink>
                </li>

                <li>
                    <NavLink to="/vault">🔒 Vault</NavLink>
                </li>

                <li>
                    <NavLink to="/wallet">💳 Wallet</NavLink>
                </li>

                <li>
                    <NavLink to="/profile">👤 Profile</NavLink>
                </li>
            </ul>

            <div className="sidebar-bottom">
                <li>⚙ Settings</li>
                <li>🚪 Logout</li>
            </div>
        </div>
    );
}

export default Sidebar;