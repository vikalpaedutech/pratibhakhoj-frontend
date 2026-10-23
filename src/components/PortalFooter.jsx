import { useEffect, useState } from "react";
import { api, unwrap } from "../api/client";

export default function PortalFooter() {
  const [helplines, setHelplines] = useState([]);
  useEffect(() => { api.get("/exam-controller/public").then((response) => {
    const data = unwrap(response) || {};
    setHelplines(Array.isArray(data.helplines) ? data.helplines.slice().sort((a, b) => Number(a.order) - Number(b.order)) : []);
  }).catch(() => setHelplines([])); }, []);
  return <footer className="portal-footer">
    <div className="footer-inner">
      <img src="/vikalpalogo.png" alt="Vikalpa Foundation Trust" />
      <div className="footer-copy">
        <strong>Vikalpa Foundation Trust</strong>
        <span>Note: Helpline Number (संपर्क करने का समय सुबह 09 बजे से शाम 5 बजे तक रहेगा): {helplines.map((item) => item.number).filter(Boolean).join(", ")}</span>
      </div>
    </div>
  </footer>;
}
