import { useState } from "react";
import type { FormEvent } from "react";
import { LockKeyhole, Mail, Sun, ArrowLeft } from "lucide-react";
import { supabase } from "./supabase";

type AuthScreenProps = {
  recoveryMode?: boolean;
  onRecoveryComplete?: () => void;
};

export default function AuthScreen({
  recoveryMode = false,
  onRecoveryComplete,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(
    recoveryMode ? "reset" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage("Jika email terdaftar, tautan untuk mengatur ulang password akan dikirim. Periksa inbox dan folder spam.");
      } else if (mode === "reset") {
        if (password.length < 8) throw new Error("Password baru minimal 8 karakter.");
        if (password !== confirmPassword) throw new Error("Konfirmasi password tidak sama.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        onRecoveryComplete?.();
        setMessage("Password berhasil diperbarui. Silakan login dengan password baru.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMessage(data.session ? "Akun berhasil dibuat. Silakan masuk." : "Pendaftaran berhasil. Periksa email untuk konfirmasi, lalu login.");
        setMode("login");
        setPassword("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Autentikasi gagal.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login" ? "Welcome back" :
    mode === "signup" ? "Create your account" :
    mode === "forgot" ? "Reset your password" :
    "Choose a new password";

  const description =
    mode === "login" ? "Sign in to access your engineering workspace." :
    mode === "signup" ? "Create an account to access Solar Apps." :
    mode === "forgot" ? "Enter your registered email. We will send you a password reset link." :
    "Enter and confirm your new password.";

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0b100e", color: "#edf5ef" }}>
    <form onSubmit={submit} style={{ width: "min(420px, 100%)", padding: 30, border: "1px solid #26372e", borderRadius: 18, background: "#111a15", boxShadow: "0 24px 80px #0008" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}><Sun color="#a3e635" size={30}/><div><strong style={{ letterSpacing: 2 }}>SOLAR APPS</strong><div style={{ color: "#91a69a", fontSize: 11 }}>PV ENGINEERING STUDIO</div></div></div>
      <h1 style={{ fontSize: 25, margin: "0 0 8px" }}>{title}</h1>
      <p style={{ color: "#9aada1", marginBottom: 24 }}>{description}</p>

      {mode !== "reset" && <label style={{ display: "block", fontSize: 13, marginBottom: 14 }}>Email<div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7, padding: "0 12px", border: "1px solid #34483c", borderRadius: 9, background: "#0c130f" }}><Mail size={16}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{ width: "100%", padding: 12, color: "white", background: "transparent", border: 0, outline: 0 }} /></div></label>}

      {(mode === "login" || mode === "signup" || mode === "reset") && <label style={{ display: "block", fontSize: 13, marginBottom: 18 }}>{mode === "reset" ? "New password" : "Password"}<div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7, padding: "0 12px", border: "1px solid #34483c", borderRadius: 9, background: "#0c130f" }}><LockKeyhole size={16}/><input required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} style={{ width: "100%", padding: 12, color: "white", background: "transparent", border: 0, outline: 0 }} /></div></label>}

      {mode === "reset" && <label style={{ display: "block", fontSize: 13, marginBottom: 18 }}>Confirm new password<div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7, padding: "0 12px", border: "1px solid #34483c", borderRadius: 9, background: "#0c130f" }}><LockKeyhole size={16}/><input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} style={{ width: "100%", padding: 12, color: "white", background: "transparent", border: 0, outline: 0 }} /></div></label>}

      <button disabled={busy} style={{ width: "100%", padding: 13, border: 0, borderRadius: 9, background: "#a3e635", color: "#15210d", fontWeight: 700, cursor: "pointer" }}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}</button>

      {message && <p role="status" style={{ color: "#c6d6cb", fontSize: 13, lineHeight: 1.5, marginTop: 16 }}>{message}</p>}

      {mode === "login" && <p style={{ textAlign: "right", margin: "14px 0 0" }}><button type="button" onClick={()=>setMode("forgot")} style={{ background: "none", border: 0, color: "#bef264", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Forgot password?</button></p>}

      <p style={{ color: "#9aada1", textAlign: "center", fontSize: 13, marginTop: 22 }}>
        {mode === "login" ? "New to Solar Apps?" : mode === "signup" ? "Already have an account?" : ""}
        {(mode === "login" || mode === "signup") && <button type="button" onClick={()=>{setMode(mode === "login" ? "signup" : "login");setMessage("");}} style={{ background: "none", border: 0, color: "#bef264", cursor: "pointer", fontWeight: 700 }}>{mode === "login" ? "Create account" : "Sign in"}</button>}
        {mode === "forgot" && <button type="button" onClick={()=>{setMode("login");setMessage("");}} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: 0, color: "#bef264", cursor: "pointer", fontWeight: 700 }}><ArrowLeft size={14}/> Back to sign in</button>}
        {mode === "reset" && <span>Use your new password after updating.</span>}
      </p>
    </form>
  </main>;
}
