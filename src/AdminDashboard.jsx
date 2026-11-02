import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import "./AdminDashboard.css";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "complaints", label: "Complaints", icon: "▤" },
  { id: "profile", label: "My Profile", icon: "◎" },
  { id: "password", label: "Change Password", icon: "♧" },
  { id: "help", label: "Help & Support", icon: "?" },
];

const STATUS_OPTIONS = ["Pending", "In Progress", "Resolved"];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusClass(status) {
  return String(status || "Pending").toLowerCase().replace(/\s+/g, "-");
}

export default function AdminDashboard() {
  const [activePage, setActivePage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [admin, setAdmin] = useState(null);
  const [hostel, setHostel] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [complaintSearch, setComplaintSearch] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadDashboard = useCallback(async () => {
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
      if (profile.role !== "admin" || profile.approval_status !== "approved") {
        await supabase.auth.signOut();
        window.location.hash = "#/admin-login";
        return;
      }

      const { data: permission, error: permissionError } = await supabase
        .from("admin_permissions")
        .select("hostel, approval_status")
        .eq("id", user.id)
        .single();

      if (permissionError) throw permissionError;
      if (permission.approval_status !== "approved" || !permission.hostel) {
        throw new Error("Your admin account does not have an approved hostel assignment.");
      }

      setAdmin(profile);
      setHostel(permission.hostel);

      const { data: complaintRows, error: complaintsError } = await supabase
        .from("complaints")
        .select("*")
        .eq("hostel", permission.hostel)
        .order("created_at", { ascending: false });

      if (complaintsError) throw complaintsError;

      const studentIds = [...new Set((complaintRows || []).map((item) => item.student_id).filter(Boolean))];
      let profileRows = [];

      if (studentIds.length) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, enrollment_no, email, phone, hostel, block, room")
          .in("id", studentIds);
        if (error) throw error;
        profileRows = data || [];
      }

      const profileById = new Map(profileRows.map((item) => [item.id, item]));
      const enrichedComplaints = (complaintRows || []).map((item) => ({
        ...item,
        student: profileById.get(item.student_id) || null,
      }));

      setComplaints(enrichedComplaints);
      setStudents(profileRows);
    } catch (error) {
      console.error("Admin dashboard loading error:", error);
      setMessage(error.message || "Unable to load the admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Listen for new complaints submitted to this admin's assigned hostel.
  useEffect(() => {
    if (!hostel) return;

    const channel = supabase
      .channel(`admin-new-complaints-${hostel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "complaints",
          filter: `hostel=eq.${hostel}`,
        },
        (payload) => {
          const complaint = payload.new;

          setNotifications((current) => [
            {
              id: complaint.id,
              type: complaint.complaint_type || "New hostel complaint",
              block: complaint.block || "—",
              room: complaint.room || "—",
              createdAt: complaint.created_at,
              read: false,
            },
            ...current,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hostel]);

  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter((item) => item.status === "Pending").length,
    progress: complaints.filter((item) => item.status === "In Progress").length,
    resolved: complaints.filter((item) => item.status === "Resolved").length,
  }), [complaints]);

  const filteredComplaints = useMemo(() => {
    const query = complaintSearch.trim().toLowerCase();
    if (!query) return complaints;
    return complaints.filter((item) =>
      [item.complaint_type, item.status, item.block, item.room,
        item.student?.full_name, item.student?.enrollment_no]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [complaints, complaintSearch]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.full_name, student.enrollment_no, student.email, student.block, student.room]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [students, studentSearch]);

  async function updateComplaintStatus(complaint, status) {
    const confirmed = window.confirm(`Change this complaint status to "${status}"?`);
    if (!confirmed) return;

    setSavingId(complaint.id);
    setMessage("");
    try {
      const { data, error } = await supabase
        .from("complaints")
        .update({ status })
        .eq("id", complaint.id)
        .eq("hostel", hostel)
        .select()
        .single();

      if (error) throw error;
      setComplaints((current) => current.map((item) =>
        item.id === complaint.id ? { ...item, ...data } : item
      ));
      setSelectedComplaint((current) =>
        current?.id === complaint.id ? { ...current, ...data } : current
      );
      setMessage("Complaint status updated successfully.");
    } catch (error) {
      console.error("Complaint status update error:", error);
      setMessage(error.message || "Could not update the complaint. Check the Supabase update policy.");
    } finally {
      setSavingId(null);
    }
  }

  async function logout() {
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
    setSelectedComplaint(null);
    setMessage("");
    setMobileMenuOpen(false);
  }

  function renderDashboard() {
    return (
      <>
        <div className="admin-welcome">
          <div>
            <p className="admin-eyebrow">HOSTELCARE ADMIN PORTAL</p>
            <h1>Welcome, {admin?.full_name || "Admin"}!</h1>
            <p>Manage hostel complaints for <strong>{hostel}</strong>.</p>
          </div>
          <button className="admin-outline-button" onClick={loadDashboard}>↻ Refresh</button>
        </div>

        <div className="admin-stat-grid">
          <article className="admin-stat-card"><span className="admin-stat-icon">▤</span><strong>{stats.total}</strong><span>Total Complaints</span></article>
          <article className="admin-stat-card pending"><span className="admin-stat-icon">◷</span><strong>{stats.pending}</strong><span>Pending</span></article>
          <article className="admin-stat-card progress"><span className="admin-stat-icon">⚙</span><strong>{stats.progress}</strong><span>In Progress</span></article>
          <article className="admin-stat-card resolved"><span className="admin-stat-icon">✓</span><strong>{stats.resolved}</strong><span>Resolved</span></article>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><h2>Recent Complaints</h2><p>Latest complaints from your assigned hostel.</p></div>
            <button className="admin-text-button" onClick={() => openPage("complaints")}>View all →</button>
          </div>
          {renderComplaintTable(complaints.slice(0, 5))}
        </section>
      </>
    );
  }

  function renderComplaintTable(rows) {
    if (!rows.length) return <div className="admin-empty">No complaints found for {hostel || "your hostel"}.</div>;
    return (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Problem</th><th>Student</th><th>Block / Room</th><th>Date</th><th>Status</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.complaint_type || "Hostel complaint"}</strong></td>
                <td>{item.student?.full_name || "Student"}<small>{item.student?.enrollment_no || "—"}</small></td>
                <td>{item.block || "—"} / {item.room || "—"}</td>
                <td>{formatDate(item.created_at)}</td>
                <td><span className={`admin-status ${statusClass(item.status)}`}>{item.status || "Pending"}</span></td>
                <td><button className="admin-small-button" onClick={() => setSelectedComplaint(item)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderComplaints() {
    if (selectedComplaint) {
      const item = selectedComplaint;
      return (
        <section className="admin-panel">
          <button className="admin-text-button" onClick={() => setSelectedComplaint(null)}>← Back to complaints</button>
          <div className="admin-panel-heading detail-heading"><div><p className="admin-eyebrow">COMPLAINT DETAILS</p><h2>{item.complaint_type || "Hostel complaint"}</h2><p>{formatDate(item.created_at)}</p></div><span className={`admin-status ${statusClass(item.status)}`}>{item.status}</span></div>
          <div className="admin-detail-grid">
            <div><span>Student Name</span><strong>{item.student?.full_name || "—"}</strong></div>
            <div><span>Enrollment No.</span><strong>{item.student?.enrollment_no || "—"}</strong></div>
            <div><span>Email</span><strong>{item.student?.email || "—"}</strong></div>
            <div><span>Phone</span><strong>{item.student?.phone || "—"}</strong></div>
            <div><span>Hostel</span><strong>{item.hostel || hostel}</strong></div>
            <div><span>Block</span><strong>{item.block || "—"}</strong></div>
            <div><span>Room</span><strong>{item.room || "—"}</strong></div>
          </div>
          <div className="admin-message-box"><h3>Student's Description</h3><p>{item.description || "No additional description provided."}</p></div>
          {item.complaint_message && <div className="admin-message-box"><h3>Complaint Message</h3><p className="preserve-lines">{item.complaint_message}</p></div>}
          <div className="admin-status-editor">
            <h3>Update Complaint Status</h3>
            <div className="admin-status-actions">
              {STATUS_OPTIONS.map((status) => <button key={status} disabled={savingId === item.id || item.status === status} className={`admin-status-choice ${statusClass(status)}`} onClick={() => updateComplaintStatus(item, status)}>{status}</button>)}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Hostel Complaints</h2><p>Only complaints assigned to {hostel} are shown.</p></div></div>
        <input className="admin-search" value={complaintSearch} onChange={(event) => setComplaintSearch(event.target.value)} placeholder="Search by problem, student, enrollment, block or room..." />
        {renderComplaintTable(filteredComplaints)}
      </section>
    );
  }


  function renderProfile() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>My Profile</h2><p>Your administrator account information.</p></div></div>
        <div className="admin-profile-card">
          <div className="admin-avatar">{(admin?.full_name || "A").charAt(0).toUpperCase()}</div>
          <div><h3>{admin?.full_name || "Admin"}</h3><p>{admin?.email || "—"}</p><span className="admin-status resolved">Approved Admin</span></div>
        </div>
        <div className="admin-detail-grid">
          <div><span>Full Name</span><strong>{admin?.full_name || "—"}</strong></div>
          <div><span>Email</span><strong>{admin?.email || "—"}</strong></div>
          <div><span>Phone</span><strong>{admin?.phone || "—"}</strong></div>
          <div><span>Assigned Hostel</span><strong>{hostel || "—"}</strong></div>
        </div>
      </section>
    );
  }

  function renderContent() {
    switch (activePage) {
      case "dashboard": return renderDashboard();
      case "complaints": return renderComplaints();
      case "profile": return renderProfile();
      case "password": return (
        <section className="admin-panel admin-form-panel">
          <h2>Change Password</h2>
          <p>Choose a strong password for your account.</p>
          <form onSubmit={changePassword}>
            <label>New Password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required /></label>
            <label>Confirm New Password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>
            <button className="admin-primary-button" disabled={passwordBusy}>{passwordBusy ? "Updating..." : "Update Password"}</button>
          </form>
        </section>
      );
      case "help": return <section className="admin-panel"><h2>Help & Support</h2><p>For HostelCare technical support, contact your project administrator.</p><p>Your assigned hostel: <strong>{hostel || "—"}</strong></p></section>;
      default: return renderDashboard();
    }
  }

  return (
    <div className="admin-dashboard">
      <aside className={`admin-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <img src={`${import.meta.env.BASE_URL}amu-logo.jpg`} alt="AMU logo" />
          <div><h2>HostelCare</h2><p>AMU Hostel Portal</p></div>
        </div>
        <div className="admin-sidebar-label">ADMIN MENU</div>
        <nav className="admin-nav">
          {MENU_ITEMS.map((item) => <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => openPage(item.id)}><span className="admin-nav-icon">{item.icon}</span>{item.label}</button>)}
        </nav>
        <button className="admin-logout-button" onClick={logout}>↪ <span>Logout</span></button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Toggle menu">☰</button>
          <div><strong>{MENU_ITEMS.find((item) => item.id === activePage)?.label || "Dashboard"}</strong><span>{hostel || "HostelCare Admin Portal"}</span></div>
          <div className="admin-notification-wrap">
            <button
              className="admin-notification-button"
              type="button"
              onClick={() => setShowNotifications((open) => !open)}
              aria-label={`Notifications: ${notifications.filter((item) => !item.read).length} unread`}
              aria-expanded={showNotifications}
              title="Notifications"
            >
              <span aria-hidden="true">♧</span>
              {notifications.some((item) => !item.read) && (
                <span className="admin-notification-badge">
                  {notifications.filter((item) => !item.read).length > 99
                    ? "99+"
                    : notifications.filter((item) => !item.read).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="admin-notification-dropdown">
                <div className="admin-notification-heading">
                  <strong>Notifications</strong>
                  <button
                    type="button"
                    onClick={() => setNotifications((current) =>
                      current.map((item) => ({ ...item, read: true }))
                    )}
                  >
                    Mark all read
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p className="admin-notification-empty">No new complaints yet.</p>
                ) : (
                  <div className="admin-notification-list">
                    {notifications.map((item) => (
                      <button
                        type="button"
                        className={`admin-notification-item ${item.read ? "read" : "unread"}`}
                        key={item.id}
                        onClick={() => {
                          setNotifications((current) =>
                            current.map((notification) =>
                              notification.id === item.id
                                ? { ...notification, read: true }
                                : notification
                            )
                          );
                          setShowNotifications(false);
                          openPage("complaints");
                          loadDashboard();
                        }}
                      >
                        <strong>{item.type}</strong>
                        <span>Block {item.block} · Room {item.room}</span>
                        <small>{formatDate(item.createdAt)}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button className="admin-top-refresh" onClick={loadDashboard} title="Refresh">↻</button>
        </header>
        <main className="admin-content">
          {message && <div className="admin-alert" role="status">{message}<button onClick={() => setMessage("")}>×</button></div>}
          {loading ? <div className="admin-loading">Loading your hostel dashboard...</div> : renderContent()}
        </main>
        <footer className="admin-footer">HostelCare · AMU Hostel Support</footer>
      </div>
    </div>
  );
}
