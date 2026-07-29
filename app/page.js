"use client";

import { useMemo, useState } from "react";
import "./globals.css";

const TABS = [
  { id: "generate", label: "Generate Link" },
  { id: "check", label: "Check Account" },
  { id: "bulk", label: "Bulk Generate" },
];

const PLACEHOLDERS = {
  generate: `# Netscape cookie file OR JSON OR key=value
.www.netflix.com	TRUE	/	TRUE	0	NetflixId	YOUR_NETFLIX_ID
.www.netflix.com	TRUE	/	TRUE	0	SecureNetflixId	YOUR_SECURE_ID`,
  check: `Paste Netflix cookies to validate membership and scrape plan details...`,
  bulk: `Cookie block 1
---
Cookie block 2
---
Cookie block 3

# Or send a JSON array of cookie objects / strings`,
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ResultCard({ item, index }) {
  const [copied, setCopied] = useState("");

  const onCopy = async (value, key) => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    }
  };

  if (!item?.ok) {
    return (
      <div className="card fail">
        <div className="card-head">
          <div className="card-title">#{index} Failed</div>
          <span className="pill fail">Invalid</span>
        </div>
        <div className="details">{item?.error || "Unknown error"}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          {item.title || `Netflix Link #${index}`}
        </div>
        <span className="pill ok">Working</span>
      </div>

      {item.loginUrl && (
        <div className="link-box">
          <strong>Login URL</strong>
          <code>{item.loginUrl}</code>
          <div className="row">
            <a className="btn btn-primary" href={item.loginUrl} target="_blank" rel="noreferrer">
              Open Netflix Link
            </a>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => onCopy(item.loginUrl, "url")}
            >
              {copied === "url" ? "Copied" : "Copy URL"}
            </button>
          </div>
        </div>
      )}

      {item.expiryStr && item.expiryStr !== "Unknown" && (
        <div className="hint">Expires: {item.expiryStr}</div>
      )}

      {item.detailsText && (
        <div>
          <strong>Account Details</strong>
          <div className="details">{item.detailsText}</div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [tab, setTab] = useState("generate");
  const [cookieText, setCookieText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [results, setResults] = useState([]);

  const endpoint = useMemo(() => {
    if (tab === "check") return "/api/check";
    if (tab === "bulk") return "/api/bulk";
    return "/api/generate";
  }, [tab]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", text: "Working..." });
    setResults([]);

    try {
      const headers = { "Content-Type": "application/json" };
      if (apiKey.trim()) headers["x-api-key"] = apiKey.trim();

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ cookieText }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      if (tab === "bulk") {
        setResults(data.results || []);
        setStatus({
          type: "ok",
          text: `Done — ${data.success} working, ${data.failed} failed (total ${data.total})`,
        });
      } else if (tab === "check") {
        setResults([
          {
            ok: true,
            title: "Account Check",
            detailsText: data.detailsText,
            details: data.details,
          },
        ]);
        setStatus({ type: "ok", text: "Account is active / CURRENT_MEMBER" });
      } else {
        setResults([
          {
            ok: true,
            title: "Netflix Login Generated",
            loginUrl: data.loginUrl,
            expiryStr: data.expiryStr,
            detailsText: data.detailsText,
            details: data.details,
          },
        ]);
        setStatus({ type: "ok", text: "Login link generated successfully" });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <div className="badge">Netflix Cookie → Login Link</div>
        <h1>Netflix Link Generator</h1>
        <p className="subtitle">
          Paste Netscape / JSON / key=value cookies. Working cookies generate a
          login URL and full account details. Invalid cookies are skipped.
        </p>
      </section>

      <section className="panel">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => {
                setTab(t.id);
                setStatus({ type: "", text: "" });
                setResults([]);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form className="panel-body" onSubmit={onSubmit}>
          <div className="grid-2">
            <label>
              Cookie input
              <textarea
                value={cookieText}
                onChange={(e) => setCookieText(e.target.value)}
                placeholder={PLACEHOLDERS[tab]}
                required
              />
              <span className="hint">
                Bulk mode: separate accounts with a line containing only <code>---</code>.
                Max 50 per request.
              </span>
            </label>

            <div style={{ display: "grid", gap: "0.9rem", alignContent: "start" }}>
              <label>
                API key (optional)
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="x-api-key if API_SECRET is set"
                  autoComplete="off"
                />
                <span className="hint">
                  Set <code>API_SECRET</code> in Vercel env to lock the APIs.
                </span>
              </label>

              <div className="row">
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading
                    ? "Please wait..."
                    : tab === "check"
                      ? "Check Account"
                      : tab === "bulk"
                        ? "Bulk Generate"
                        : "Generate Link"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setCookieText("");
                    setResults([]);
                    setStatus({ type: "", text: "" });
                  }}
                >
                  Clear
                </button>
              </div>

              <div className={`status ${status.type}`}>{status.text}</div>
            </div>
          </div>
        </form>
      </section>

      {results.length > 0 && (
        <section className="results" style={{ marginTop: "1rem" }}>
          {results.map((item, i) => (
            <ResultCard key={`${i}-${item.loginUrl || item.error || "r"}`} item={item} index={i + 1} />
          ))}
        </section>
      )}

      <footer className="footer">
        <div>
          API endpoints: <code>POST /api/generate</code>, <code>POST /api/check</code>,{" "}
          <code>POST /api/bulk</code>
        </div>
        <div>
          Body: <code>{`{ "cookieText": "..." }`}</code>
        </div>
      </footer>
    </main>
  );
}
