export function SetupRequiredScreen({ errorMessage }: { errorMessage?: string | null }) {
  return (
    <div className="app-shell">
      <div className="scroll-area" style={{ paddingTop: 40 }}>
        <div className="center-empty" style={{ paddingTop: 0 }}>
          <div style={{ fontSize: 44 }}>🔌</div>
          <h1 style={{ margin: 0 }}>Connect a database</h1>
        </div>
        <div className="card" style={{ marginTop: 8, textAlign: 'left' }}>
          {errorMessage ? (
            <>
              <p style={{ marginTop: 0, fontWeight: 800, color: 'var(--danger)' }}>Couldn't connect to Supabase:</p>
              <p className="muted" style={{ fontSize: 13, wordBreak: 'break-word' }}>{errorMessage}</p>
              <p className="muted" style={{ fontSize: 13 }}>
                Double-check the schema and seed SQL have been run, and that Anonymous
                Sign-Ins are enabled under Authentication → Sign In / Providers.
              </p>
            </>
          ) : (
            <>
              <p style={{ marginTop: 0 }}>This app needs a Supabase project to store addresses and mail. Quick setup:</p>
              <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Create a free project at <strong>supabase.com</strong>.</li>
                <li>In the SQL Editor, run <code>supabase/schema.sql</code>, then <code>supabase/seed.sql</code>.</li>
                <li>Under Authentication → Sign In / Providers, enable <strong>Anonymous Sign-Ins</strong>.</li>
                <li>Copy your Project URL and anon public key from Project Settings → API.</li>
                <li>
                  Add them as <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> — locally in a{' '}
                  <code>.env</code> file, or in Vercel under Project Settings → Environment Variables.
                </li>
                <li>Redeploy / restart the dev server.</li>
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
