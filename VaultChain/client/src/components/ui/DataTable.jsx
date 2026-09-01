export default function DataTable({ columns, rows, getRowKey = (row, index) => row.id ?? index, empty = 'No records found.' }) {
	return <div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={getRowKey(row, index)}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>) : <tr><td colSpan={columns.length} className="data-table__empty">{empty}</td></tr>}</tbody></table></div>;
}
