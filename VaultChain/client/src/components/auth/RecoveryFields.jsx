export default function RecoveryFields({ prefix, values, onChange, questions }) {
 const field = (name) => ({ value: values[name], onChange: (event) => onChange({ ...values, [name]: event.target.value }) });
 return <>
  <div className="field"><label htmlFor={`${prefix}-question`}>Security question</label><select id={`${prefix}-question`} className="input" {...field('question')} required><option value="">Choose your question</option>{questions.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></div>
  <div className="field"><label htmlFor={`${prefix}-answer`}>Security answer</label><input id={`${prefix}-answer`} className="input" type="password" {...field('answer')} minLength={2} maxLength={200} autoComplete="off" aria-describedby={`${prefix}-answer-help`} required/><span id={`${prefix}-answer-help`} className="field-hint">Answers ignore capitalization and extra spaces.</span></div>
  <div className="field"><label htmlFor={`${prefix}-birth-date`}>Birth date</label><input id={`${prefix}-birth-date`} className="input" type="date" {...field('birthDate')} min="1900-01-01" max={new Date().toISOString().slice(0, 10)} autoComplete="bday" required/></div>
 </>;
}
