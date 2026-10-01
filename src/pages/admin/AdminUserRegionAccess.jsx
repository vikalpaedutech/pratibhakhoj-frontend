import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, unwrap } from "../../api/client";

const DASHBOARDS = [
  ["MB_DISTRICT_BLOCK", "Mission Buniyaad · District-Block Dashboard"],
  ["MB_BLOCK_SCHOOL", "Mission Buniyaad · Block-School Dashboard"],
  ["MB_SCHOOL", "Mission Buniyaad · School Level Dashboard"],
  ["HS100_DISTRICT_BLOCK", "Haryana Super 100 · District-Block Dashboard"],
  ["HS100_BLOCK_SCHOOL", "Haryana Super 100 · Block-School Dashboard"],
  ["HS100_SCHOOL", "Haryana Super 100 · School Level Dashboard"],
];

export default function AdminUserRegionAccess() {
  const [users, setUsers] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [userId, setUserId] = useState("");
  const [scope, setScope] = useState("district");
  const [regions, setRegions] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([api.get("/admin/users"), api.get("/regions/districts")])
      .then(([u, d]) => {
        setUsers(unwrap(u) || []);
        setDistricts(unwrap(d) || []);
      })
      .catch((e) => setErr(e.response?.data?.message || "Unable to load."));
  }, []);

  const load = async (id) => {
    if (!id) return;
    setErr("");
    try {
      const a = await api.get(`/admin/user-region-access/${id}`);
      const accessRows = unwrap(a) || [];

      setRegions(
        accessRows.map((x) => ({
          districtId: x.districtId?._id || x.districtId,
          blockId: x.blockId?._id || x.blockId,
          schoolId: x.schoolId?._id || x.schoolId,
        }))
      );
      setBlocks([]);
      setSchools([]);
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to load access.");
    }
  };

  const districtChange = async (id) => {
    setRegions(id ? [{ districtId: id }] : []);
    setBlocks([]);
    setSchools([]);
    if (id) {
      try {
        setBlocks(unwrap(await api.get(`/regions/blocks?districtId=${id}`)) || []);
      } catch {
        setBlocks([]);
      }
    }
  };

  const blockChange = async (id) => {
    const districtId = regions[0]?.districtId;
    setRegions(id ? [{ ...regions[0], blockId: id }] : []);
    setSchools([]);
    if (id && districtId) {
      try {
        setSchools(
          unwrap(await api.get(`/regions/schools?districtId=${districtId}&blockId=${id}`)) || []
        );
      } catch {
        setSchools([]);
      }
    }
  };

  const save = async () => {
    if (!userId) return;
    setErr("");
    setMsg("");
    try {
      await api.put(`/admin/user-region-access/${userId}`, { scope, regions });
      setMsg("User region access updated.");
      await load(userId);
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to update access.");
    }
  };

  return (
    <AdminShell>
      <section className="dashboard">
        <div className="dash-head">
          <div>
            <div className="eyebrow">ADMINISTRATION</div>
            <h2>User Region Access</h2>
            <p>Manage the user's region access.</p>
          </div>
        </div>

        <div className="panel">
          <label className="field">
            <span>User *</span>
            <select
              value={userId}
              onChange={(e) => {
                const id = e.target.value;
                setUserId(id);
                setScope("district");
                setRegions([]);
                load(id);
              }}
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} · {u.contact}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Scope *</span>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setRegions([]);
                setBlocks([]);
                setSchools([]);
              }}
            >
              <option value="global">global</option>
              <option value="district">district</option>
              <option value="block">block</option>
              <option value="school">school</option>
            </select>
          </label>

          {scope === "global" ? (
            <p>Global access = all regions.</p>
          ) : (
            <>
              {scope === "district" && (
                <label className="field">
                  <span>District *</span>
                  <select
                    value={regions[0]?.districtId || ""}
                    onChange={(e) => districtChange(e.target.value)}
                  >
                    <option value="">Select district</option>
                    {districts.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.districtName}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {["block", "school"].includes(scope) && (
                <>
                  <label className="field">
                    <span>District *</span>
                    <select
                      value={regions[0]?.districtId || ""}
                      onChange={(e) => districtChange(e.target.value)}
                    >
                      <option value="">Select district</option>
                      {districts.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.districtName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Block *</span>
                    <select
                      value={regions[0]?.blockId || ""}
                      disabled={!regions[0]?.districtId}
                      onChange={(e) => blockChange(e.target.value)}
                    >
                      <option value="">Select block</option>
                      {blocks.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.blockName}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {scope === "school" && (
                <label className="field">
                  <span>School *</span>
                  <select
                    value={regions[0]?.schoolId || ""}
                    disabled={!regions[0]?.blockId}
                    onChange={(e) =>
                      setRegions((r) => [{ ...r[0], schoolId: e.target.value }])
                    }
                  >
                    <option value="">Select school</option>
                    {schools.map((x) => (
                      <option key={x._id} value={x._id}>
                        {x.schoolName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}

          {err && <div className="error">{err}</div>}
          {msg && <div className="success-message">{msg}</div>}

          <button className="primary" onClick={save} disabled={!userId}>
            Save Access
          </button>
        </div>
      </section>
    </AdminShell>
  );
}
