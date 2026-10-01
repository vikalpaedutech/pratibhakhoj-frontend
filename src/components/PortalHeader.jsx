import { Link } from "react-router-dom";

export default function PortalHeader({ examType = null }) {
  const isMB = examType === "MB";
  const isHS100 = examType === "HS100";

  return (
    <header className="portal-header">
      <div className="portal-header-inner">
        <Link to="/" className="brand-emblem">
          <img src="/haryana.png" alt="Government of Haryana" />
        </Link>

        <div className="portal-heading">
          <div className="portal-hindi">हरियाणा प्रतिभा खोज</div>

          {isMB && (
            <>
              <h1>Mission Buniyaad</h1>
              <div className="portal-subtitle">Registration Form</div>
              <div className="portal-batch">Batch 2026-28</div>
            </>
          )}

          {isHS100 && (
            <>
              <h1>Haryana Super 100</h1>
              <div className="portal-subtitle">Registration Form</div>
              <div className="portal-batch">Batch 2026-28</div>
            </>
          )}

          {!isMB && !isHS100 && (
            <>
              <h1>Mission Buniyaad</h1>
              <h2>Haryana Super 100</h2>
              <div className="portal-subtitle">Registration Form</div>
              <div className="portal-batch">Batch 2026-28</div>
            </>
          )}
        </div>

        <Link to="/" className="brand-buniyaad">
          <img src="/Buniyaad.png" alt="Mission Buniyaad" />
        </Link>
      </div>
    </header>
  );
}
