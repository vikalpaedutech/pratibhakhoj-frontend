import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, unwrap } from "../../api/client";

export default function ExamController() {
  const [examActive, setExamActive] = useState(true);
  const [landingMessage, setLandingMessage] = useState("Registrations coming soon");
  const [helplines, setHelplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get("/exam-controller/admin");
      const data = unwrap(response) || {};
      setExamActive(data.examActive !== false);
      setLandingMessage(data.landingMessage || "Registrations coming soon");
      setHelplines((data.helplines || []).slice().sort((a, b) => Number(a.order) - Number(b.order)).map((h, i) => ({ label: h.label || `Helpline ${i + 1}`, number: h.number || "", order: Number(h.order) || i + 1, _id: h._id })));
    } catch (e) { setError(e.response?.data?.message || "Unable to load Exam Controller settings."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await api.put("/exam-controller/admin", { examActive, landingMessage, helplines: helplines.map(({ label, number, order }) => ({ label, number, order })) });
      setSuccess("Exam Controller settings saved successfully.");
      await load();
    } catch (e) { setError(e.response?.data?.message || "Unable to save settings."); }
    finally { setSaving(false); }
  };

  if (loading) return <AdminShell><div className="page-content"><p>Loading Exam Controller…</p></div></AdminShell>;
  return <AdminShell><div className="page-content">
    <div className="page-heading"><div><p className="eyebrow">Administration</p><h1>Exam Controller</h1><p>Manage registration availability and public helpline numbers.</p></div></div>
    {error && <div className="alert error">{error}</div>}{success && <div className="alert success">{success}</div>}
    <form className="form-card" onSubmit={save}>
      <section className="form-section">
        <h2>Exam Active Status</h2>
        <label className="exam-toggle-field"><input type="checkbox" checked={examActive} onChange={(e) => setExamActive(e.target.checked)} /><span className="exam-toggle-track" aria-hidden="true" /><span><strong>{examActive ? "Exam portal is active" : "Exam portal is inactive"}</strong><small>{examActive ? "The full portal is available." : "Only the landing page message is shown to visitors."}</small></span></label>
        <label className="field"><span>Landing page message</span><input value={landingMessage} maxLength={500} onChange={(e) => setLandingMessage(e.target.value)} required placeholder="Registrations coming soon" /></label>
      </section>
      <section className="form-section">
        <div className="section-heading-row"><h2>Helpline Numbers</h2><button type="button" className="secondary" onClick={() => setHelplines((items) => [...items, { label: `Helpline ${items.length + 1}`, number: "", order: items.length + 1 }])} disabled={helplines.length >= 20}>Add helpline</button></div>
        <p>Numbers appear in the portal footer in the order set below.</p>
        {helplines.map((item, index) => <div className="form-grid" key={item._id || `helpline-${index}`}>
          <label className="field"><span>Label</span><input value={item.label} onChange={(e) => setHelplines((items) => items.map((h, i) => i === index ? { ...h, label: e.target.value } : h))} /></label>
          <label className="field"><span>Number</span><input value={item.number} onChange={(e) => setHelplines((items) => items.map((h, i) => i === index ? { ...h, number: e.target.value } : h))} required /></label>
          <label className="field"><span>Display order</span><input type="number" min="1" value={item.order} onChange={(e) => setHelplines((items) => items.map((h, i) => i === index ? { ...h, order: e.target.value } : h))} /></label>
          <div className="field field-actions"><span>&nbsp;</span><button type="button" className="secondary" onClick={() => setHelplines((items) => items.filter((_, i) => i !== index))}>Remove</button></div>
        </div>)}
      </section>
      <button type="submit" className="primary" disabled={saving}>{saving ? "Saving…" : "Save Settings"}</button>
    </form>
  </div></AdminShell>;
}
