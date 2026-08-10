"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";

type UsernameDeskFormProps = {
  compact?: boolean;
};

export default function UsernameDeskForm({ compact = false }: UsernameDeskFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = username.trim().replace(/^@/, "");

    if (!clean) {
      setError("Enter a Chess.com username first.");
      return;
    }

    setError("");
    router.push(`/player/${encodeURIComponent(clean)}`);
  }

  return (
    <form className={`username-desk-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
      <label htmlFor={compact ? "username-compact" : "username"}>Chess.com username</label>
      <div className="username-entry-row">
        <span className="username-prefix" aria-hidden="true"><Search size={19} /></span>
        <input
          id={compact ? "username-compact" : "username"}
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Your Chess.com username"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={error ? "username-error" : undefined}
        />
        <button className="button button-lime" type="submit">
          Find my Desk <ArrowRight size={17} />
        </button>
      </div>
      {error ? <p className="form-error" id="username-error">{error}</p> : null}
      <p className="username-trust"><ShieldCheck size={15} /> Public username only. Never your Chess.com password.</p>
    </form>
  );
}
