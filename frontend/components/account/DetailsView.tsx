import React, { useEffect, useState } from "react";
import { User, Wrench } from "lucide-react";
import { UserData, requestPasswordReset, updateUserProfile } from "../../services/authService";
import { Notice } from "./Notice";
import { btnOutline, btnPrimary, cardClass, cardHeadClass, fieldClass, h2Class, labelClass } from "./ui";

type Message = { type: "success" | "error"; text: string } | null;

const toForm = (u: UserData) => ({
  first_name: u.first_name || "",
  last_name: u.last_name || "",
  display_name: u.display_name || "",
  phone: u.phone || "",
});

export const DetailsView: React.FC<{ user: UserData }> = ({ user }) => {
  const [form, setForm] = useState(() => toForm(user));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<Message>(null);
  const isTrade = !!user.roles?.includes("contractor");

  useEffect(() => setForm(toForm(user)), [user]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const result = await updateUserProfile(form);
      setMessage({ type: "success", text: result.message || "Account details updated successfully." });
      if (result.user) setForm(toForm(result.user));
      window.dispatchEvent(new Event("user-updated"));
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update account details." });
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    if (!user.email || sendingReset) return;
    setSendingReset(true);
    setResetMessage(null);
    try {
      const result = await requestPasswordReset(user.email);
      setResetMessage({ type: "success", text: result.message });
    } catch (error) {
      setResetMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not send the reset email. Please try again.",
      });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={save} aria-labelledby="profile-heading" className="space-y-4">
        {message && <Notice type={message.type}>{message.text}</Notice>}
        <section className={cardClass}>
          <div className={cardHeadClass}>
            <h2 id="profile-heading" className={h2Class}>
              Profile
            </h2>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div>
              <label htmlFor="acct-first-name" className={labelClass}>First name</label>
              <input id="acct-first-name" autoComplete="given-name" type="text" value={form.first_name} onChange={set("first_name")} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="acct-last-name" className={labelClass}>Last name</label>
              <input id="acct-last-name" autoComplete="family-name" type="text" value={form.last_name} onChange={set("last_name")} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="acct-display-name" className={labelClass}>Display name</label>
              <input id="acct-display-name" autoComplete="nickname" type="text" value={form.display_name} onChange={set("display_name")} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="acct-phone" className={labelClass}>Phone number</label>
              <input id="acct-phone" autoComplete="tel" type="tel" value={form.phone} onChange={set("phone")} className={fieldClass} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="acct-email" className={labelClass}>Email address</label>
              <input id="acct-email" autoComplete="email" type="email" value={user.email || ""} readOnly aria-describedby="acct-email-hint" className={fieldClass} />
              <p id="acct-email-hint" className="mt-1 text-[13px] text-text-tertiary">Your email is your sign-in and can't be changed here.</p>
            </div>
          </div>
          <div className="border-t border-border p-5">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>
      </form>

      <section aria-labelledby="signin-heading" className={cardClass}>
        <div className={cardHeadClass}>
          <h2 id="signin-heading" className={h2Class}>
            Password
          </h2>
        </div>
        <div className="space-y-4 p-5">
          <p className="max-w-xl text-text-secondary">To change your password we email a secure reset link to {user.email}.</p>
          {resetMessage && <Notice type={resetMessage.type}>{resetMessage.text}</Notice>}
          <button type="button" onClick={sendReset} disabled={sendingReset} className={btnOutline}>
            {sendingReset ? "Sending…" : "Email me a reset link"}
          </button>
        </div>
      </section>

      <section aria-labelledby="type-heading" className={cardClass}>
        <div className={cardHeadClass}>
          <h2 id="type-heading" className={h2Class}>
            Account type
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-current bg-white px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide text-belims-blue">
            {isTrade ? <Wrench size={14} aria-hidden="true" /> : <User size={14} aria-hidden="true" />}
            {isTrade ? "Trade account" : "Standard account"}
          </span>
        </div>
        <p className="p-5 text-text-secondary">
          {isTrade ? "Trade pricing applies automatically on trade-special products." : "Standard retail pricing applies."}
        </p>
      </section>
    </div>
  );
};
