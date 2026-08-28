import "./SummaryCard.css";

function SummaryCard(props) {
    return (
        <div className="summary-card">

            <div className="card-title">
                <span>{props.icon}</span>
                <h3>{props.title}</h3>
            </div>

            <h2>{props.value}</h2>

            <p>Securely Stored</p>

        </div>
    );
}

export default SummaryCard;