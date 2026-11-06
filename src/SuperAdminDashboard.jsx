import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./SuperAdminDashboard.css";

const MENU_ITEMS = [
  { id: "applications", label: "Admin Applications", icon: "▤" },
  { id: "profile", label: "My Profile", icon: "◎" },
  { id: "password", label: "Change Password", icon: "♧" },
  { id: "help", label: "Help & Support", icon: "?" },
];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function SuperAdminDashboard() {
  const [superAdmin, setSuperAdmin] = useState(null);
  const [applications, setApplications] = useState([]);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [activePage, setActivePage] = useState("applications");
  const [loading, setLoading] = useState(true);
  const [busyAdminId, setBusyAdminId] = useState(null);
  const [message, setMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [approvedAdmins, setApprovedAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData?.user;

      if (!user) {
        window.location.hash = "#/admin-login";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, approval_status")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.role !== "super_admin" || profile.approval_status !== "approved") {
        await supabase.auth.signOut();
        window.location.hash = "#/admin-login";
        return;
      }

      setSuperAdmin(profile);

      const { data: admins, error: adminsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, approval_status, created_at")
        .eq("role", "admin")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

      if (adminsError) throw adminsError;

      // Count approved administrators (excluding the Super Admin account).
      const { data: approvedAdminRows, error: approvedAdminsError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("approval_status", "approved");

      if (approvedAdminsError) throw approvedAdminsError;

      let approvedAdminCount = 0;
      const approvedIds = (approvedAdminRows || []).map((admin) => admin.id);

      if (approvedIds.length) {
        const { data: approvedPermissionRows, error: approvedPermissionsError } = await supabase
          .from("admin_permissions")
          .select("id")
          .eq("approval_status", "approved")
          .in("id", approvedIds);

        if (approvedPermissionsError) throw approvedPermissionsError;
        approvedAdminCount = (approvedPermissionRows || []).length;
      }

      setTotalAdmins(approvedAdminCount);

      const adminIds = (admins || []).map((admin) => admin.id);
      let permissions = [];

      if (adminIds.length) {
        const { data, error } = await supabase
          .from("admin_permissions")
          .select("id, hostel, approval_status")
          .in("id", adminIds);

        if (error) throw error;
        permissions = data || [];
      }

      const permissionById = new Map(permissions.map((item) => [item.id, item]));
      setApplications((admins || []).map((admin) => ({
        ...admin,
        permission: permissionById.get(admin.id) || null,
      })));
    } catch (error) {
      console.error("Super Admin dashboard loading error:", error);
      setMessage(error.message || "Unable to load the Super Admin dashboard.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  async function handleDecision(adminId, decision) {
    const action = decision === "approved" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this admin application?`)) return;

    setBusyAdminId(adminId);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("manage_admin_application", {
        p_admin_id: adminId,
        p_decision: decision,
      });

      if (error) throw error;
      if (data?.success === false) {
        throw new Error(data.message || `Could not ${action} this application.`);
      }

      setMessage(decision === "approved"
        ? "Admin application approved successfully."
        : "Admin application rejected successfully.");
      await loadApplications();
    } catch (error) {
      console.error(`Could not ${action} admin:`, error);
      setMessage(error.message || `Could not ${action} this application.`);
    } finally {
      setBusyAdminId(null);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.hash = "#/admin-login";
  }

  async function changePassword(event) {
    event.preventDefault();
    setMessage("");

    if (newPassword.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password changed successfully.");
  }

  function openPage(page) {
    setActivePage(page);
    setMessage("");
    setMobileMenuOpen(false);
  }

  function renderApplications() {
    return (
      <>
        <div className="super-admin-welcome">
          <div>
            <p className="super-admin-eyebrow">HOSTELCARE CONTROL PANEL</p>
            <h1>Admin Applications</h1>
            <p>Review administrator applications for AMU hostels.</p>
          </div>
          <button className="super-admin-outline-button" onClick={loadApplications} disabled={loading || !!busyAdminId}>
            ↻ {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="super-admin-stats">
          <div className="super-admin-stat-card">
            <span>▤</span><strong>{applications.length}</strong><small>Pending Applications</small>
          </div>
          <div className="super-admin-stat-card">
            <span>♙</span><strong>{totalAdmins}</strong><small>Total Approved Admins</small>
          </div>
        </div>

        <section className="super-admin-panel">
          <div className="super-admin-panel-heading">
            <div><h2>Pending Admin Requests</h2><p>Check the applicant and assigned hostel before making a decision.</p></div>
            <span className="super-admin-count">{applications.length} pending</span>
          </div>

          {loading ? (
            <div className="super-admin-empty">Loading admin applications...</div>
          ) : applications.length === 0 ? (
            <div className="super-admin-empty">There are no pending admin applications.</div>
          ) : (
            <div className="super-admin-table-wrap">
              <table className="super-admin-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Phone</th><th>Hostel</th><th>Applied</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((admin) => (
                    <tr key={admin.id}>
                      <td><strong>{admin.full_name || "—"}</strong></td>
                      <td>{admin.email || "—"}</td>
                      <td>{admin.phone || "—"}</td>
                      <td>{admin.permission?.hostel || "Not available"}</td>
                      <td>{formatDate(admin.created_at)}</td>
                      <td>
                        <div className="super-admin-actions">
                          <button
                            className="super-admin-approve"
                            type="button"
                            disabled={!!busyAdminId}
                            onClick={() => handleDecision(admin.id, "approved")}
                          >
                            {busyAdminId === admin.id ? "Please wait..." : "Approve"}
                          </button>
                          <button
                            className="super-admin-reject"
                            type="button"
                            disabled={!!busyAdminId}
                            onClick={() => handleDecision(admin.id, "rejected")}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="super-admin-note">Only the approved Super Admin can approve or reject administrator applications.</p>
      </>
    );
  }
  const loadApprovedAdmins = useCallback(async () => {
  try {
    const { data: admins, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "admin")
      .eq("approval_status", "approved");

    if (error) throw error;

    if (!admins?.length) {
      setApprovedAdmins([]);
      return;
    }

    const { data: permissions, error: permissionError } =
      await supabase
        .from("admin_permissions")
        .select("id")
        .eq("approval_status", "approved")
        .in("id", admins.map((admin) => admin.id));

    if (permissionError) throw permissionError;

    const approvedIds = new Set(
      (permissions || []).map((item) => item.id)
    );

    setApprovedAdmins(
      admins.filter((admin) => approvedIds.has(admin.id))
    );
  } catch (error) {
    console.error("Could not load approved admins:", error);
    setMessage(error.message);
  }
}, []);

useEffect(() => {
  if (activePage === "profile") {
    loadApprovedAdmins();
  }
}, [activePage, loadApprovedAdmins]);
async function handleTransferOwnership() {
  if (!selectedAdminId) {
    setMessage("Please select an administrator.");
    return;
  }

  const selectedAdmin = approvedAdmins.find(
    (admin) => admin.id === selectedAdminId
  );

  if (!selectedAdmin) return;

  const confirmed = window.confirm(
    `Transfer Super Admin ownership to ${selectedAdmin.full_name}? ` +
    "Your Super Admin access will be revoked."
  );

  if (!confirmed) return;

  setTransferBusy(true);
  setMessage("");

  try {
    const { data, error } = await supabase.rpc(
      "transfer_super_admin",
      { p_new_admin_id: selectedAdminId }
    );

    if (error) throw error;

    if (data?.success !== true) {
      throw new Error(data?.message || "Transfer failed.");
    }

    alert("Super Admin ownership transferred successfully. You will now be signed out.");

    await supabase.auth.signOut();
    window.location.hash = "#/admin-login";

  } catch (error) {
    console.error("Ownership transfer error:", error);
    setMessage(error.message || "Ownership transfer failed.");
  } finally {
    setTransferBusy(false);
  }
}
  function renderProfile() {
    return (
      <section className="super-admin-panel">
        <div className="super-admin-panel-heading">
          <div><h2>My Profile</h2><p>Your Super Admin account information.</p></div>
          <span className="super-admin-badge">Super Admin</span>
        </div>
        <div className="super-admin-profile">
          <div className="super-admin-avatar">{(superAdmin?.full_name || "S").charAt(0).toUpperCase()}</div>
          <div><h3>{superAdmin?.full_name || "Super Admin"}</h3><p>{superAdmin?.email || "—"}</p></div>
        </div>
        <div className="super-admin-details">
          <div><span>Full Name</span><strong>{superAdmin?.full_name || "—"}</strong></div>
          <div><span>Email</span><strong>{superAdmin?.email || "—"}</strong></div>
          <div><span>Phone</span><strong>{superAdmin?.phone || "—"}</strong></div>
          <div><span>Account Role</span><strong>Super Admin</strong></div>
        </div>
                <div className="super-admin-transfer-section">
          <h3>Transfer Super Admin Ownership</h3>

          <p>
            Transfer complete Super Admin control to another approved
            administrator. Your current Super Admin access will be revoked.
          </p>

          {approvedAdmins.length === 0 ? (
            <div className="super-admin-empty">
              No other approved administrators available.
            </div>
          ) : (
            <>
              <label htmlFor="transfer-admin">
                Select Administrator
              </label>

              <select
                id="transfer-admin"
                value={selectedAdminId}
                onChange={(event) => setSelectedAdminId(event.target.value)}
              >
                <option value="">-- Select an Administrator --</option>

                {approvedAdmins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.full_name} ({admin.email})
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="super-admin-transfer-button"
                onClick={handleTransferOwnership}
                disabled={!selectedAdminId || transferBusy}
              >
                {transferBusy
                  ? "Transferring..."
                  : "Transfer Super Admin Ownership"}
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  function renderContent() {
    if (activePage === "applications") return renderApplications();
    if (activePage === "profile") return renderProfile();
    if (activePage === "password") {
      return (
        <section className="super-admin-panel super-admin-form-panel">
          <h2>Change Password</h2>
          <p>Choose a strong password for your account.</p>
          <form onSubmit={changePassword}>
            <label>New Password
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required />
            </label>
            <label>Confirm New Password
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
            </label>
            <button className="super-admin-primary-button" disabled={passwordBusy}>
              {passwordBusy ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>
      );
    }
    return (
      <section className="super-admin-panel">
        <h2>Help & Support</h2>
        <p>For HostelCare technical support, contact your project administrator.</p>
      </section>
    );
  }

  if (loading && !superAdmin) {
    return <div className="super-admin-loading">Verifying Super Admin access...</div>;
  }

  return (
    <div className="super-admin-dashboard">
      {mobileMenuOpen && (
        <button className="super-admin-backdrop" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`super-admin-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="super-admin-brand">
          <img src={`${import.meta.env.BASE_URL}amu-logo.jpg`} alt="AMU logo" />
          <div><h2>HostelCare</h2><p>AMU Control Panel</p></div>
        </div>
        <div className="super-admin-sidebar-label">SUPER ADMIN MENU</div>
        <nav className="super-admin-nav">
          {MENU_ITEMS.map((item) => (
            <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => openPage(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <button className="super-admin-logout" onClick={signOut}>↪ <span>Sign Out</span></button>
      </aside>

      <div className="super-admin-main">
        <header className="super-admin-topbar">
          <button className="super-admin-menu-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Toggle menu">☰</button>
          <div><strong>{MENU_ITEMS.find((item) => item.id === activePage)?.label || "Dashboard"}</strong><span>HostelCare · AMU</span></div>
          <button className="super-admin-top-refresh" onClick={loadApplications} disabled={loading} title="Refresh">↻</button>
        </header>
        <main className="super-admin-content">
          {message && <div className="super-admin-alert" role="status">{message}<button onClick={() => setMessage("")}>×</button></div>}
          {renderContent()}
        </main>
        <footer className="super-admin-footer">HostelCare · AMU Hostel Support</footer>
      </div>
    </div>
  );
}
