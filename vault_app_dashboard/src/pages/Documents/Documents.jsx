import "./Documents.css";

function Documents() {
    return (
        <div className="documents">

            <div className="documents-header">
                <div>
                    <h2>Documents</h2>
                    <p>Manage and verify your uploaded documents.</p>
                </div>

                <button className="upload-btn">
                    + Upload Document
                </button>
            </div>

            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search documents..."
                />
            </div>

            <table className="documents-table">

                <thead>
                <tr>
                    <th>Document</th>
                    <th>Owner</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                </tr>
                </thead>

                <tbody>

                <tr>
                    <td>Passport.pdf</td>
                    <td>Afia</td>
                    <td>
              <span className="verified">
                Verified
              </span>
                    </td>
                    <td>06 Aug 2026</td>
                    <td>
                        <button className="view-btn">
                            View
                        </button>
                    </td>
                </tr>

                <tr>
                    <td>Certificate.pdf</td>
                    <td>Afia</td>
                    <td>
              <span className="pending">
                Pending
              </span>
                    </td>
                    <td>05 Aug 2026</td>
                    <td>
                        <button className="view-btn">
                            View
                        </button>
                    </td>
                </tr>

                <tr>
                    <td>National_ID.pdf</td>
                    <td>Afia</td>
                    <td>
              <span className="verified">
                Verified
              </span>
                    </td>
                    <td>04 Aug 2026</td>
                    <td>
                        <button className="view-btn">
                            View
                        </button>
                    </td>
                </tr>

                </tbody>

            </table>

        </div>
    );
}

export default Documents;