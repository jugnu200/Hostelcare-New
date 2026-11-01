import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function StudentDashboard() {
    const t = {
    Dashboard: "Dashboard",
    "New Complaint": "New Complaint",
    "My Complaints": "My Complaints",
    "My Profile": "My Profile",
    "Change Password": "Change Password",
    "Help & Support": "Help & Support",
    Logout: "Logout",
    welcome: "Welcome to HostelCare!",
    subtitle: "Manage your hostel complaints in one place.",
    total: "Total Complaints",
    pending: "Pending",
    progress: "In Progress",
    resolved: "Resolved",
  };
  const [activePage, setActivePage] = useState("Dashboard");
  const [complaints, setComplaints] = useState([]);
  const [complaintDraft, setComplaintDraft] = useState(null);

  const [profile, setProfile] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("hostelcare_profile")) || {
          full_name: "",
          enrollment_no: "",
          email: "",
          hostel: "",
          block: "",
          room_number: "",
        }
      );
    } catch {
      return {
        full_name: "",
        enrollment_no: "",
        email: "",
        hostel: "",
        block: "",
        room_number: "",
      };
    }
  });

  const [editingProfile, setEditingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    type: "",
    block: "",
    room: "",
    details: "",
  });

  const menuItems = [
    "Dashboard",
    "New Complaint",
    "My Complaints",
    "My Profile",
    "Change Password",
    "Help & Support",
  ];

  // Save profile in browser
  useEffect(() => {
    localStorage.setItem(
      "hostelcare_profile",
      JSON.stringify(profile)
    );
  }, [profile]);

  
// Load student profile from Supabase
useEffect(() => {
  async function loadUser() {
    try {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) return;

      const { data: studentProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (profileError) throw profileError;

      setProfile({
        full_name: studentProfile.full_name,
        enrollment_no: studentProfile.enrollment_no,
        email: studentProfile.email,
        hostel: studentProfile.hostel,
        block: studentProfile.block,
        room_number: studentProfile.room,
      });

    } catch (error) {
      console.error("Profile loading error:", error);
      setMessage(error.message || "Unable to load student profile.");
    }
  }

  loadUser();
}, []);

  // Load complaints from Supabase
useEffect(() => {
  async function loadComplaints() {
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) return;

      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedComplaints = data.map((item) => ({
        id: item.id,
        type: item.complaint_type,
        block: item.block,
        room: item.room,
        details: item.description,
        message: item.complaint_message,
        status: item.status,
        date: new Date(item.created_at).toLocaleString()
      }));

      setComplaints(formattedComplaints);

    } catch (error) {
      console.error("Loading complaints error:", error);
      setMessage(error.message || "Unable to load complaints.");
    }
  }

  loadComplaints();
}, []);

  const totalComplaints = complaints.length;

  const pendingComplaints = complaints.filter(
    (item) => item.status === "Pending"
  ).length;

  const inProgressComplaints = complaints.filter(
    (item) => item.status === "In Progress"
  ).length;

  const resolvedComplaints = complaints.filter(
    (item) => item.status === "Resolved"
  ).length;

  // Generate complaint preview
  function generateComplaint() {
    setMessage("");

    if (!form.type || !form.block.trim() || !form.room.trim()) {
      setMessage("Please select a problem and enter your block and room number.");
      return;
    }

    const complaint = `HOSTELCARE - AMU HOSTEL COMPLAINT

Student Name: ${profile.full_name || "Student"}
Enrollment Number: ${profile.enrollment_no || "Not available"}
Hostel: ${profile.hostel || "Not available"}

Problem: ${form.type}
Block / Building: ${form.block}
Room Number: ${form.room}

Additional Details:
${form.details.trim() || "No additional details provided."}

I kindly request the hostel administration to look into this issue and arrange the necessary repairs as soon as possible.

Thank you.
HostelCare Student`;

    setComplaintDraft(complaint);
  }

  // Submit complaint (currently browser storage only)
   
async function submitComplaint() {
  if (!complaintDraft) return;

  try {
    // Get the currently logged-in student
    const { data: { user }, error: userError } =
      await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      setMessage("Please log in again to submit your complaint.");
      return;
    }

    // Save complaint in Supabase
    const { data: savedComplaint, error } = await supabase
      .from("complaints")
      .insert({
        student_id: user.id,
        complaint_type: form.type,
        hostel: profile.hostel || "Not provided",
        block: form.block,
        room: form.room,
        description: form.details,
        complaint_message: complaintDraft,
        status: "Pending"
      })
      .select()
      .single();

    if (error) throw error;

    // Update the existing dashboard
    const newComplaint = {
      id: savedComplaint.id,
      type: savedComplaint.complaint_type,
      block: savedComplaint.block,
      room: savedComplaint.room,
      details: savedComplaint.description,
      message: savedComplaint.complaint_message,
      status: savedComplaint.status,
      date: new Date(savedComplaint.created_at).toLocaleString()
    };

    setComplaints((previous) => [
      newComplaint,
      ...previous
    ]);

    setForm({
      type: "",
      block: "",
      room: "",
      details: ""
    });

    setComplaintDraft(null);
    setMessage("Complaint submitted successfully!");
    setActivePage("My Complaints");

  } catch (error) {
    console.error("Complaint submission error:", error);
    setMessage(error.message || "Failed to submit complaint.");
  }
}  // Copy generated complaint
  async function copyComplaint() {
    if (!complaintDraft) return;

    try {
      await navigator.clipboard.writeText(complaintDraft);
      setMessage("Complaint copied successfully!");
    } catch {
      setMessage("Unable to copy. Please select and copy the text manually.");
    }
  }

  // Save editable profile fields locally
  async function saveProfile() {
  setMessage("");

  const { data: { user }, error: authError } =
    await supabase.auth.getUser();

  if (authError || !user) {
    setMessage("Please log in again.");
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      hostel: profile.hostel,
      block: profile.block,
      room: profile.room_number,
    })
    .eq("id", user.id);

  if (error) {
    setMessage(error.message);
    return;
  }

  setEditingProfile(false);
  setMessage("Profile updated successfully!");
}

  // Change Supabase password
  async function changePassword() {
    setMessage("");

    if (newPassword.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password changed successfully!");
  }

  // Logout
  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.hash = "#/student-login";
  }

  return (
    <div className="student-dashboard">

      {/* SIDEBAR */}
      <aside className="student-sidebar">
        <div className="student-brand">
          <img
            src={`${import.meta.env.BASE_URL}amu-logo.jpg`}
            alt="Aligarh Muslim University Logo"
            className="student-amu-logo"
          />

          <div className="student-brand-text">
            <h2>HostelCare</h2>
            <p>AMU Hostel Portal</p>
          </div>
        </div>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item}
              type="button"
              className={activePage === item ? "active" : ""}
              onClick={() => {
                setActivePage(item);
                setMessage("");
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="student-logout"
          onClick={logout}
        >
        Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="student-main">

        <header className="student-topbar">
          <h2>{activePage}</h2>
          <span>Student Dashboard</span>
        </header>

        {message && (
          <div className="student-message" role="status">
            {message}
          </div>
        )}

        {/* DASHBOARD */}
        {activePage === "Dashboard" && (
          <section className="student-overview">

            <h1>Welcome to HostelCare!</h1>

            <p>
              Manage your hostel complaints in one place.
            </p>

            <div className="student-stats">

              <div className="student-stat-card">
                <h3>{totalComplaints}</h3>
                <p>Total Complaints</p>
              </div>

              <div className="student-stat-card">
                <h3>{pendingComplaints}</h3>
                <p>Pending</p>
              </div>

              <div className="student-stat-card">
                <h3>{inProgressComplaints}</h3>
                <p>In Progress</p>
              </div>

              <div className="student-stat-card">
                <h3>{resolvedComplaints}</h3>
                <p>Resolved</p>
              </div>

            </div>

            <div className="student-content-card">
              <h2>Quick Actions</h2>

              <button
                className="button-primary"
                onClick={() => setActivePage("New Complaint")}
              >
                + Submit New Complaint
              </button>

              <button
                className="button-primary"
                onClick={() => setActivePage("My Complaints")}
              >
                View My Complaints
              </button>
            </div>

          </section>
        )}

        {/* NEW COMPLAINT */}
        {activePage === "New Complaint" && (
          <section className="student-content-card">

            <h2>Submit a New Complaint</h2>

            <p>Tell us about the problem in your hostel.</p>

            <div className="complaint-form">

              <label>Select Problem</label>

              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value })
                }
              >
                <option value="">Choose a problem</option>
                <option>Fan Not Working</option>
                <option>Wi-Fi Not Working</option>
                <option>Water Cooler Not Working</option>
                <option>No Water Supply</option>
                <option>Light Not Working</option>
                <option>Tap / Plumbing Issue</option>
                <option>Broken Furniture</option>
                <option>Other Problem</option>
              </select>

              <label>Block / Building</label>

              <input
                value={form.block}
                onChange={(e) =>
                  setForm({ ...form, block: e.target.value })
                }
                placeholder="Enter your block name"
              />

              <label>Room Number</label>

              <input
                value={form.room}
                onChange={(e) =>
                  setForm({ ...form, room: e.target.value })
                }
                placeholder="Enter your room number"
              />

              <label>Additional Details</label>

              <textarea
                value={form.details}
                onChange={(e) =>
                  setForm({ ...form, details: e.target.value })
                }
                placeholder="Describe the problem..."
                rows="4"
              />

              <button
                type="button"
                className="button-primary"
                onClick={generateComplaint}
              >
                Generate Complaint
              </button>

            </div>

            {/* GENERATED COMPLAINT PREVIEW */}
            {complaintDraft && (
              <div className="complaint-preview">

                <h3>Generated Complaint</h3>

                <p>
                  Review your complaint before submitting it.
                </p>

                <pre>{complaintDraft}</pre>

                <div className="complaint-actions">

                  <button
                    type="button"
                    className="button-primary"
                    onClick={copyComplaint}
                  >
                    Copy Complaint
                  </button>

                  <button
                    type="button"
                    className="button-primary"
                    onClick={submitComplaint}
                  >
                    Submit Complaint
                  </button>

                  <button
                    type="button"
                    onClick={() => setComplaintDraft(null)}
                  >
                    Close Preview
                  </button>

                </div>

              </div>
            )}

          </section>
        )}

        {/* MY COMPLAINTS */}
        {activePage === "My Complaints" && (
          <section className="student-content-card">

            <h2>My Complaints</h2>

            <p>Track the progress of your submitted complaints.</p>

            {complaints.length === 0 ? (
              <div className="empty-state">
                <h3>No Complaints Yet</h3>
                <p>You haven't submitted any complaints.</p>

                <button
                  className="button-primary"
                  onClick={() => setActivePage("New Complaint")}
                >
                  Submit Your First Complaint
                </button>
              </div>
            ) : (
              <div className="complaints-list">

                {complaints.map((complaint) => (
                  <div
                    className="complaint-item"
                    key={complaint.id}
                  >

                    <h3>{complaint.type}</h3>

                    <p>
                      <strong>Block:</strong> {complaint.block}
                    </p>

                    <p>
                      <strong>Room:</strong> {complaint.room}
                    </p>

                    <p>
                      <strong>Date:</strong> {complaint.date}
                    </p>

                    <p>
                      <strong>Status:</strong>{" "}
                      <span className="complaint-status">
                        {complaint.status}
                      </span>
                    </p>

                    <details>
                      <summary>View Complaint</summary>
                      <pre>{complaint.message}</pre>
                    </details>

                  </div>
                ))}

              </div>
            )}

          </section>
        )}

        {/* MY PROFILE */}
        {activePage === "My Profile" && (
          <section className="student-content-card">

            <h2>My Profile</h2>

            <div className="profile-form">

              <label>Full Name</label>

              <input
                value={profile.full_name}
                disabled
              />

              <label>Enrollment Number</label>

              <input
                value={profile.enrollment_no}
                disabled
              />

              <label>Email Address</label>

              <input
                value={profile.email}
                disabled
              />

              <label>Hostel Name</label>

              <input
                value={profile.hostel}
                disabled={!editingProfile}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    hostel: e.target.value,
                  })
                }
              />

              <label>Block / Building</label>

              <input
                value={profile.block}
                disabled={!editingProfile}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    block: e.target.value,
                  })
                }
              />

              <label>Room Number</label>

              <input
                value={profile.room_number}
                disabled={!editingProfile}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    room_number: e.target.value,
                  })
                }
              />

              {editingProfile ? (
                <button
                  className="button-primary"
                  onClick={saveProfile}
                >
                  Save Changes
                </button>
              ) : (
                <button
                  className="button-primary"
                  onClick={() => setEditingProfile(true)}
                >
                  Edit Profile
                </button>
              )}

            </div>

          </section>
        )}

        {/* CHANGE PASSWORD */}
        {activePage === "Change Password" && (
          <section className="student-content-card">

            <h2>Change Password</h2>

            <p>Choose a new password for your account.</p>

            <div className="profile-form">

              <label>New Password</label>

              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />

              <label>Confirm New Password</label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Confirm new password"
              />

              <button
                className="button-primary"
                onClick={changePassword}
              >
                Update Password
              </button>

            </div>

          </section>
        )}

        {/* HELP AND SUPPORT */}
        {activePage === "Help & Support" && (
          <section className="student-content-card">

            <h2>Help & Support</h2>

            <p>
              Need help using HostelCare? Here are some useful tips.
            </p>

            <div className="support-item">
              <h3>How do I submit a complaint?</h3>
              <p>
                Open New Complaint, select your problem, enter your
                block and room number, generate the complaint and
                submit it.
              </p>
            </div>

            <div className="support-item">
              <h3>How do I track my complaint?</h3>
              <p>
                Open My Complaints to see your complaint details
                and current status.
              </p>
            </div>

            <div className="support-item">
              <h3>How do I update my room details?</h3>
              <p>
                Open My Profile and select Edit Profile.
              </p>
            </div>

          </section>
        )}

      </main>
    </div>
  );
}