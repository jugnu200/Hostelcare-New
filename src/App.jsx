
import { HashRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";
import StudentDashboard from "./StudentDashboard";

const hostels = [
  "Abdullah Hall",
  "Aftab Hall",
  "Allama Iqbal Boarding House",
  "B. R. Ambedkar Hall",
  "Begum Azeezun Nisa Hall",
  "Begum Sultan Jahan Hall",
  "Bibi Fatima Hall",
  "Hadi Hasan Hall",
  "Indira Gandhi Hall",
  "Mohammad Habib Hall",
  "Mohsinul Mulk Hall",
  "Nadeem Tarin Hall",
  "Ross Masood Hall",
  "Sarojini Naidu Hall",
  "Sir Shah Sulaiman Hall",
  "Sir Syed Hall North",
  "Sir Syed Hall South",
  "Sir Ziauddin Hall",
  "Viqar-ul-Mulk Hall",
  "Other / Not Listed"
];


const problems = [
  ["🌀", "Fan Not Working", "Report a broken fan or regulator."],
  ["📶", "Wi-Fi Not Working", "Report internet connectivity problems."],
  ["🚰", "Water Cooler Not Working", "Report a broken water cooler."],
  ["💧", "No Water Supply", "Report water shortages."],
  ["💡", "Light Not Working", "Report faulty lights and switches."],
  ["🔧", "Tap / Plumbing Issue", "Report leaking taps and plumbing issues."],
  ["🛏️", "Broken Furniture", "Report damaged beds, chairs, or tables."],
  ["•••", "Other Problem", "Report any other hostel issue."]
];


function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#/">
        <img
         className="brand-icon"
         src={`${import.meta.env.BASE_URL}amu-logo.jpg`}
         alt="Aligarh Muslim University logo"/>
        <span className="brand-text">
          <strong>HostelCare</strong>
          <small>AMU HOSTEL SUPPORT</small>
        </span>
      </a>

      <nav className="navigation">
        <a href="#/">Home</a>
        <a href="#/ " onClick={(event) => {
          event.preventDefault();
          window.location.hash = "/";
          setTimeout(() => {
            document.getElementById("problems")?.scrollIntoView({ behavior: "smooth" });
          }, 200);
        }}>Common Problems</a>
        <a href="#/" onClick={(event) => {
          event.preventDefault();
          window.location.hash = "/";
          setTimeout(() => {
            document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
          }, 200);
        }}>How It Works</a>
      </nav>

      

<div className="header-actions">
  <a className="header-login" href="#/student-login">
    Student Login
  </a>

  <a className="button button-small" href="#/admin-login">
    Admin Login
  </a>

  <div className="settings-wrapper">
    <button
      className="settings-button"
      onClick={() => {
        const menu = document.getElementById("language-settings");
        menu.hidden = !menu.hidden;
      }}
      type="button"
    >
      <span className="settings-icon">⚙️</span>
      <span>Settings</span>
    </button>

    <div id="language-settings" className="language-settings" hidden>
     <label htmlFor="site-language">
      Language / भाषा / زبان
      </label>

      <select
      id="site-language"
      value={localStorage.getItem("hostelcare-language") || "en"}
      onChange={(event) => {
      const selectedLanguage = event.target.value;
      localStorage.setItem("hostelcare-language", selectedLanguage);
      window.location.reload();
      }}
  >
      <option value="en">English</option>
      <option value="hi">हिन्दी (Hindi)</option>
      <option value="ur">اردو (Urdu)</option>
      </select>
      </div>
    </div>
  </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <a className="brand footer-brand" href="#/">
        <img
          className="brand-icon"
          src={`${import.meta.env.BASE_URL}amu-logo.jpg`}
          alt="Aligarh Muslim University logo"/>
        <span className="brand-text">
          <strong>HostelCare</strong>
          <small>AMU HOSTEL SUPPORT</small>
        </span>
      </a>
      <p>Making hostel life better, one complaint at a time.</p>
      <p className="copyright">© {new Date().getFullYear()} HostelCare</p>
      <p className="image-credit">
        Campus photograph: Wikimedia Commons. Retain the required attribution.
      </p>
    </footer>
  );
}

function HomePage() {
  const [language, setLanguage] = useState(
    localStorage.getItem("hostelcare-language") || "en"
  );

  const translations = {
    en: {
      badge: "AMU HOSTEL COMPLAINT PORTAL",
      title1: "Your Hostel.",
      title2: "Your Comfort.",
      title3: "Our Responsibility.",
      description:
        "Report hostel problems, track complaints, and get the help you need. Making hostel life better, one complaint at a time.",
    },
    hi: {
      badge: "एएमयू हॉस्टल शिकायत पोर्टल",
      title1: "आपका हॉस्टल।",
      title2: "आपकी सुविधा।",
      title3: "हमारी जिम्मेदारी।",
      description:
        "हॉस्टल की समस्याओं की शिकायत करें, उनकी स्थिति देखें और सहायता प्राप्त करें।",
    },
    ur: {
      badge: "اے ایم یو ہاسٹل شکایت پورٹل",
      title1: "آپ کا ہاسٹل۔",
      title2: "آپ کا سکون۔",
      title3: "ہماری ذمہ داری۔",
      description:
        "ہاسٹل کے مسائل کی شکایت درج کریں، ان کی صورتحال دیکھیں اور مدد حاصل کریں۔",
    },
  };

  const t = translations[language];
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-overlay" />
          <div className="hero-content">
            <div className="hero-badge">
              <span className="status-dot" />
              {t.badge}
            </div>

            <h1>
              {t.title1}
              <br />
              {t.title2}
              <br />
              <span>{t.title3}</span>
            </h1>

            <p className="hero-description">
              {t.description}
            </p>

            <div className="hero-buttons">
              <a href="#/register" className="button button-primary">
                Register as Student →
              </a>
              <a href="#/student-login" className="button button-light">
                Student Login
              </a>
            </div>

            <div className="hero-benefits">
              <span>✓ Simple reporting</span>
              <span>✓ Complaint tracking</span>
              <span>✓ Student-focused support</span>
            </div>

            <div className="hero-location">
              Aligarh Muslim University · Aligarh, Uttar Pradesh
            </div>
          </div>
        </section>

        <section className="stats-section">
          <div className="stat">
            <span className="stat-icon">🏠</span>
            <div><strong>Hostel Support</strong><p>Report accommodation problems</p></div>
          </div>
          <div className="stat">
            <span className="stat-icon">📝</span>
            <div><strong>Easy Reporting</strong><p>Submit problems in one place</p></div>
          </div>
          <div className="stat">
            <span className="stat-icon">📊</span>
            <div><strong>Complaint Tracking</strong><p>Follow complaint progress</p></div>
          </div>
        </section>

        <section className="section problems-section" id="problems">
          <div className="section-heading">
            <span className="eyebrow">HOSTEL MAINTENANCE</span>
            <h2>What problem are you facing?</h2>
            <p>Report common hostel problems through one convenient portal.</p>
          </div>

          <div className="problem-grid">
            {problems.map(([icon, title, description]) => (
              <article className="problem-card" key={title}>
                <div className="problem-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{description}</p>
                <a href="#/register" className="text-link">Report a problem →</a>
              </article>
            ))}
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <span className="eyebrow">SIMPLE PROCESS</span>
            <h2>How HostelCare works</h2>
            <p>Three simple steps to report and track a hostel complaint.</p>
          </div>
          <div className="steps-grid">
            <article className="step-card">
              <div className="step-number">01</div>
              <div className="step-icon">👤</div>
              <h3>Create your account</h3>
              <p>Register with your student and hostel information.</p>
            </article>
            <article className="step-card">
              <div className="step-number">02</div>
              <div className="step-icon">📋</div>
              <h3>Submit a complaint</h3>
              <p>Explain your problem and provide its details.</p>
            </article>
            <article className="step-card">
              <div className="step-number">03</div>
              <div className="step-icon">✅</div>
              <h3>Track its progress</h3>
              <p>Check your complaint status as the team responds.</p>
            </article>
          </div>
        </section>

        <section className="account-section">
          <div className="account-content">
            <span className="eyebrow">GET STARTED TODAY</span>
            <h2>A better hostel experience starts here.</h2>
            <p>Report maintenance problems and keep track of your complaints.</p>
            <div className="account-buttons">
              <a href="#/register" className="button button-primary">Student Registration →</a>
              <a href="#/admin-register" className="button button-light">Admin Registration</a>
            </div>
            <div className="admin-access">
              Administrator? <a href="#/admin-login">Admin Login</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function RegistrationPage({ admin = false }) {
  const [form, setForm] = useState({
    name: "",
    enrollment: "",
    phone: "",
    email: "",
    hostel: "",
    block: "",
    room: "",
    password: "",
    confirmPassword: ""
  });
  const [message, setMessage] = useState("");

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    setMessage("");
  }


async function submit(event) {
  event.preventDefault();

  if (form.password !== form.confirmPassword) {
    setMessage("Passwords do not match.");
    return;
  }

  if (form.password.length < 8) {
    setMessage("Password must contain at least 8 characters.");
    return;
  }

  // Admin registration will be connected separately.
  if (admin) {
    setMessage("Admin registration will be connected after student registration.");
    return;
  }

  // Step 1: Verify the AMU enrollment number.
  const { data: verified, error: verifyError } = await supabase.rpc(
    "verify_student_enrollment",
    {
      p_enrollment_no: form.enrollment.trim(),
    }
  );

  if (verifyError) {
    console.error("Enrollment verification error:", verifyError);
    setMessage("Unable to verify enrollment. Please try again.");
    return;
  }

  if (!verified) {
    setMessage("You are not a student of AMU.");
    return;
  }

  // Step 2: Create the student's authentication account.
  const { data: authData, error: authError } =
    await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: form.name.trim(),
          enrollment_no: form.enrollment.trim(),
        },
      },
    });

  if (authError) {
    console.error("Signup error:", authError);
    setMessage(authError.message);
    return;
  }

  if (!authData.session || !authData.user) {
    setMessage(
      "Account created, but no active session was returned. Check Supabase email confirmation settings."
    );
    return;
  }

  // Step 3: Save the student's details in the profiles table.
  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: authData.user.id,
      full_name: form.name.trim(),
      enrollment_no: form.enrollment.trim(),
      email: form.email.trim(),
      hostel: form.hostel,
      block: form.block.trim(),
      room: form.room.trim(),
      role: "student",
      approval_status: "approved",
    });

  if (profileError) {
    console.error("Profile creation error:", profileError);
    setMessage(
      "Authentication account created, but profile saving failed. Please contact the administrator."
    );
    return;
  }

  setMessage("Student account created successfully! You can now log in.");

  // Step 4: Clear the registration form.
  setForm({
    name: "",
    enrollment: "",
    phone: "",
    email: "",
    hostel: "",
    block: "",
    room: "",
    password: "",
    confirmPassword: "",
  });
}
  return (
    <>
      <Header />
      <main className="auth-page">
        <section className="auth-intro">
          <span className="eyebrow">{admin ? "ADMIN PORTAL" : "STUDENT PORTAL"}</span>
          <h1>{admin ? "Manage your hostel with HostelCare." : "Your hostel, your building, your room."}</h1>
          <p>
            {admin
              ? "Apply for administrator access to manage hostel complaints."
              : "Create an account to report hostel problems and track complaints."}
          </p>
          <ul className="auth-benefits">
            {admin ? (
              <>
                <li>✓ Enter your contact information.</li>
                <li>✓ Select the hostel you manage.</li>
                <li>✓ Access admin tools after approval.</li>
              </>
            ) : (
              <>
                <li>✓ Register with your student details.</li>
                <li>✓ Select your AMU hostel or hall.</li>
                <li>✓ Enter your block and room number.</li>
              </>
            )}
          </ul>
          <a href="#/" className="text-link">← Back to homepage</a>
        </section>

        <section className="auth-card">
          <div className="auth-card-heading">
            <div className="auth-card-icon">{admin ? "🛡️" : "🎓"}</div>
            <div>
              <h2>{admin ? "Admin Registration" : "Student Registration"}</h2>
              <p>{admin ? "Apply for administrator access" : "Create your student account"}</p>
            </div>
          </div>

          <form onSubmit={submit} className="auth-form">
            <div className="form-field">
              <label htmlFor="name">Full Name *</label>
              <input id="name" name="name" value={form.name} onChange={update} placeholder="Enter your full name" required />
            </div>

            {admin ? (
              <div className="form-field">
                <label htmlFor="phone">Phone Number *</label>
                <input id="phone" name="phone" type="tel" value={form.phone} onChange={update} placeholder="Enter your phone number" required />
              </div>
            ) : (
              <div className="form-field">
                <label htmlFor="enrollment">Enrollment Number *</label>
                <input id="enrollment" name="enrollment" value={form.enrollment} onChange={update} placeholder="Enter your AMU enrollment number" required />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Email Address *</label>
              <input id="email" name="email" type="email" value={form.email} onChange={update} placeholder="Enter your email" required />
            </div>

            <div className="form-field">
              <label htmlFor="hostel">Hostel / Hall Name *</label>
              <select id="hostel" name="hostel" value={form.hostel} onChange={update} required>
                <option value="">Select your hostel or hall</option>
                {hostels.map((hostel) => <option key={hostel} value={hostel}>{hostel}</option>)}
              </select>
            </div>

            {!admin && (
              <>
                <div className="form-field">
                  <label htmlFor="block">Block / Building Name *</label>
                  <input id="block" name="block" value={form.block} onChange={update} placeholder="e.g. A Block, Agha Khan, Kashmir House" required />
                </div>
                <div className="form-field">
                  <label htmlFor="room">Room Number *</label>
                  <input id="room" name="room" value={form.room} onChange={update} placeholder="e.g. 204" required />
                </div>
              </>
            )}

            <div className="form-field">
              <label htmlFor="password">Password *</label>
              <input id="password" name="password" type="password" value={form.password} onChange={update} minLength={8} autoComplete="new-password" placeholder="At least 8 characters" required />
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} minLength={8} autoComplete="new-password" placeholder="Enter your password again" required />
            </div>

            {message && <div className="form-message" role="status">{message}</div>}

            <button className="button button-primary submit-button" type="submit">
              {admin ? "Submit Admin Registration →" : "Create Student Account →"}
            </button>

            {admin && <p className="approval-notice">Admin access requires approval.</p>}
          </form>

          <div className="auth-switch">
            {admin ? (
              <>Already registered? <a href="#/admin-login">Admin Login</a></>
            ) : (
              <>Already registered? <a href="#/student-login">Student Login</a></>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function LoginPage({ admin = false }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
  event.preventDefault();
  setMessage("Checking your account...");

  try {
    // Step 1: Sign in using Supabase Authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier.trim(),
      password: password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    // Step 2: Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, approval_status, full_name")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setMessage("Profile not found. Please contact the administrator.");
      return;
    }

    // Step 3: Check the account role
    if (admin && profile.role !== "admin") {
      await supabase.auth.signOut();
      setMessage("This account does not have administrator access.");
      return;
    }

    if (!admin && profile.role !== "student") {
      await supabase.auth.signOut();
      setMessage("Please use the correct login portal.");
      return;
    }

    // Step 4: Check admin approval
    if (admin && profile.approval_status !== "approved") {
      await supabase.auth.signOut();
      setMessage("Your admin account is waiting for approval.");
      return;
    }

    // Step 5: Login successful
    setMessage("Login successful!");

    window.location.hash = admin ? "#/admin-dashboard" : "#/student-dashboard";

  } catch (error) {
    console.error("Login error:", error);
    setMessage("Something went wrong. Please try again.");
  }
}
  return (
    <>
      <Header />
      <main className="login-page">
        <section className="auth-card login-card">
          <div className="auth-card-heading">
            <div className="auth-card-icon">{admin ? "🛡️" : "🎓"}</div>
            <div>
              <h2>{admin ? "Admin Login" : "Student Login"}</h2>
              <p>Welcome back to HostelCare</p>
            </div>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <div className="form-field">
              <label htmlFor="identifier">{admin ? "Email or Phone Number *" : "Email Address *"}</label>
              <input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={admin ? "Enter email or phone number" : "Enter registered email"} required />
            </div>
            
          <div className="form-field">
              <label htmlFor="loginPassword">Password *</label>

              <div className="password-input-wrapper">
              <input
              id="loginPassword"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
             />

             <button
             type="button"
             className="password-toggle"
             onClick={() => setShowPassword(!showPassword)}
             aria-label={showPassword ? "Hide password" : "Show password"}
             >
             {showPassword ? "🙈" : "👁️"}
            </button>
         </div>
          </div>
            <div className="forgot-password"><a href="#/forgot-password">Forgot password?</a></div>
            {message && <div className="form-message" role="status">{message}</div>}
            <button className="button button-primary submit-button" type="submit">Login →</button>
          </form>

          <div className="auth-switch">
            {admin ? (
              <>Need admin access? <a href="#/admin-register">Register as Admin</a></>
            ) : (
              <>New student? <a href="#/register">Create an account</a></>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    setMessage("Password reset will be enabled after Supabase setup.");
  }

  return (
    <>
      <Header />
      <main className="login-page">
        <section className="auth-card login-card">
          <div className="auth-card-heading">
            <div className="auth-card-icon">🔐</div>
            <div><h2>Forgot Password?</h2><p>Request a reset link</p></div>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <div className="form-field">
              <label htmlFor="resetEmail">Email Address *</label>
              <input id="resetEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter your registered email" />
            </div>
            {message && <div className="form-message" role="status">{message}</div>}
            <button className="button button-primary submit-button" type="submit">Request Reset Link</button>
          </form>
          <div className="auth-switch"><a href="#/student-login">← Back to Student Login</a></div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function NotFoundPage() {
  return (
    <>
      <Header />
      <main className="not-found">
        <h1>Page not found</h1>
        <p>The requested page could not be found.</p>
        <a className="button button-primary" href="#/">Return Home</a>
      </main>
      <Footer />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/student-login" element={<LoginPage />} />
      <Route path="/admin-register" element={<RegistrationPage admin />} />
      <Route path="/admin-login" element={<LoginPage admin />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/student-dashboard" element={<StudentDashboard />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}