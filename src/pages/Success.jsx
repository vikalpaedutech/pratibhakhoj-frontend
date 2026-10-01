import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_BASE_URL, api, unwrap } from "../api/client";
import PortalHeader from "../components/PortalHeader";
import PortalFooter from "../components/PortalFooter";
import OfficialShell from "../components/OfficialShell";

export default function Success() {
  const { slipId } = useParams();
  const [params] = useSearchParams();
  const examType = params.get("examType") === "HS100" ? "HS100" : "MB";
  const srn = params.get("srn");
  const official = params.get("official") === "1";
  const requestedEditable = params.get("editable") !== "0" && Boolean(srn);
  const nextRegistration = params.get("next") || `/official/register/${examType}`;

  const pdfUrl = `${API_BASE_URL}/students/acknowledgement/${encodeURIComponent(slipId)}`;
  const [previewUrl, setPreviewUrl] = useState("");
  const [pdfBlob, setPdfBlob] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState("Pending");
  const [rejectionRemark, setRejectionRemark] = useState("");
  const [statusLoading, setStatusLoading] = useState(Boolean(srn));

  useEffect(() => {
    if (!srn) {
      setStatusLoading(false);
      return undefined;
    }

    let active = true;
    api.get(`/students/public/status/${encodeURIComponent(srn)}?examType=${examType}`)
      .then((response) => {
        if (!active) return;
        const data = unwrap(response);
        setRegistrationStatus(data?.verificationStatus || (data?.isVerified ? "Verified" : "Pending"));
        setRejectionRemark(data?.registrationFormVerificationRemark || "");
      })
      .catch(() => {
        // Keep the status supplied by the acknowledgement request when the status lookup fails.
      })
      .finally(() => { if (active) setStatusLoading(false); });

    return () => { active = false; };
  }, [srn, examType]);

  const canEdit = !statusLoading && requestedEditable && registrationStatus !== "Verified";

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    const loadPdf = async () => {
      try {
        setLoadingPreview(true);
        setPreviewError("");
        const response = await fetch(pdfUrl, { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load acknowledgement slip.");
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/pdf")) throw new Error("The acknowledgement endpoint did not return a PDF.");
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setPreviewUrl(objectUrl);
      } catch (error) {
        if (!cancelled) setPreviewError(error.message || "Unable to load acknowledgement slip.");
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };
    loadPdf();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [pdfUrl]);

  const downloadAcknowledgement = async () => {
    try {
      setDownloading(true);
      let blob = pdfBlob;
      if (!blob) {
        const response = await fetch(`${pdfUrl}?download=1`, { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error("Unable to download acknowledgement slip.");
        blob = await response.blob();
      }
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${slipId}-acknowledgement.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setPreviewError(error.message || "Unable to download acknowledgement slip.");
    } finally {
      setDownloading(false);
    }
  };

  const statusClass = registrationStatus === "Verified" ? "verified" : registrationStatus === "Rejected" ? "rejected" : "pending";

  const content = (
    <main className={official ? "acknowledgement-page official-success-page" : "acknowledgement-page"}>
      <section className="acknowledgement-card">
        <div className="acknowledgement-heading acknowledgement-heading-centered">
          <div>
            <div className="eyebrow">REGISTRATION STATUS</div>
            <h1>{registrationStatus}</h1>
            {registrationStatus === "Rejected" && rejectionRemark && (
              <div className="rejection-reason">
                <strong>Rejection Reason:</strong> {rejectionRemark}
              </div>
            )}
            {registrationStatus === "Rejected" && (
              <p className="rejection-edit-note">
                In case of rejection you can Edit your form, update the details and submit again.<br />
                अस्वीकृति की स्थिति में आप अपना फॉर्म संपादित करके विवरण अपडेट कर पुनः जमा कर सकते हैं।
              </p>
            )}
            <p className="download-slip-text">Download Your Acknowledgement Slip</p>
            <p className="acknowledgement-note">
              Note: Check your registration after 24 hours. Make sure that you filled every detail in the form correctly; wrong details can lead to rejection of your form.
              <span>(24 घंटे बाद अपना पंजीकरण जाँचें। सुनिश्चित करें कि आपने फॉर्म में सभी विवरण सही भरे हैं; गलत विवरण भरने पर आपका फॉर्म अस्वीकृत हो सकता है।)</span>
            </p>
          </div>
        </div>

        <div className="pdf-preview-shell">
          {loadingPreview && <div className="pdf-preview-state">Loading acknowledgement preview…</div>}
          {!loadingPreview && previewError && <div className="pdf-preview-state error">{previewError}</div>}
          {!loadingPreview && !previewError && previewUrl && <iframe title="Acknowledgement Slip Preview" src={previewUrl} className="pdf-preview" />}
        </div>

        <div className="success-actions acknowledgement-actions">
          <button type="button" className="primary" onClick={downloadAcknowledgement} disabled={downloading || loadingPreview}>
            {downloading ? "Preparing PDF…" : "Download Acknowledgement"}
          </button>
          {canEdit && (
            <Link className="secondary" to={official ? nextRegistration : `/register/${examType}/edit/${srn}`}>Edit Registration</Link>
          )}
          {official ? (
            <>
              <Link className="secondary" to={nextRegistration}>Next Registration</Link>
              <Link className="secondary" to="/official">Dashboard</Link>
            </>
          ) : <Link className="secondary" to="/">Back to Home</Link>}
        </div>
      </section>
    </main>
  );

  if (official) return <OfficialShell>{content}</OfficialShell>;
  return <div className="public-page"><PortalHeader examType={examType} />{content}<PortalFooter examType={examType} /></div>;
}
