import "./Profile.css";

function Profile() {
    return (
        <div className="profile">

            <h2>👤 My Profile</h2>

            <div className="profile-card">

                <img
                    src="https://via.placeholder.com/120"
                    alt="Profile"
                    className="profile-image"
                />

                <h3>Afia Ibnat Anika</h3>

                <p>Email: afia@example.com</p>

                <p>Role: User</p>

                <button>Edit Profile</button>

            </div>

        </div>
    );
}

export default Profile;