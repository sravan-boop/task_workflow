export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center px-8 py-4">
        <svg
          width="120"
          height="28"
          viewBox="0 0 120 28"
          fill="none"
          className="text-primary"
        >
          <circle cx="14" cy="7" r="5" fill="#F06A6A" />
          <circle cx="6" cy="21" r="5" fill="#F06A6A" />
          <circle cx="22" cy="21" r="5" fill="#F06A6A" />
          <text
            x="34"
            y="22"
            fontFamily="system-ui"
            fontSize="20"
            fontWeight="600"
            fill="#1e1f21"
          >
            TaskFlow
          </text>
        </svg>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-[400px] px-6">{children}</div>
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground">
        <p suppressHydrationWarning>&copy; {new Date().getFullYear()} TaskFlow AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
