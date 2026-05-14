const SERVICES = [
  "content marketing",
  "website development",
  "website maintenance",
  "e-commerce maintenance",
  "email marketing",
  "app development",
  "marketing automation",
  "sales automation",
  "no-code and low-code",
] as const;

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

export default function Home() {
  const loopItems = [...SERVICES, ...SERVICES];

  return (
    <main className="flex min-h-[100dvh] flex-1 items-center justify-center overflow-x-hidden overflow-y-hidden bg-background text-foreground max-md:min-h-[100dvh] max-md:overflow-y-auto">
      <div className="flex w-full max-w-[1000px] flex-col items-center justify-between gap-0 px-5 py-14 max-md:px-5 max-md:py-[60px] md:flex-row md:items-center md:gap-0 md:px-10 md:py-10">
        <div className="z-10 flex-1 max-md:mb-[60px] max-md:text-center md:text-left">
          <p className="mb-2.5 text-[1.2rem] font-normal opacity-80">hej! tu</p>
          <h1 className="mb-[35px] text-[3.2rem] font-bold leading-[0.95] tracking-[-1.5px] max-md:text-center md:text-[4rem]">
            <span className="text-accent">Jakub</span>
            <br />
            Sztuba
          </h1>

          <nav
            className="flex flex-col gap-[15px] max-md:items-center"
            aria-label="Kontakt"
          >
            <a
              href="mailto:jakub.sztuba@gmail.com"
              className="flex items-center text-base font-medium text-foreground no-underline transition-colors hover:text-accent"
            >
              <MailIcon className="mr-3 size-5 shrink-0 fill-current" />
              napisz do mnie
            </a>
            <a
              href="https://www.linkedin.com/in/jakub-sztuba/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-base font-medium text-foreground no-underline transition-colors hover:text-accent"
            >
              <LinkedInIcon className="mr-3 size-5 shrink-0 fill-current" />
              dodaj mnie do sieci
            </a>
          </nav>
        </div>

        <div
          className="relative flex h-[220px] w-full flex-1 justify-center overflow-hidden max-md:h-[220px] md:h-[300px]"
          aria-hidden
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[100px] bg-linear-to-b from-background from-20% to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[100px] bg-linear-to-t from-background from-20% to-transparent" />

          <div className="home-services-scroll flex flex-col">
            {loopItems.map((label, i) => (
              <div
                key={`${label}-${i}`}
                className="flex h-[45px] shrink-0 items-center justify-center text-[1.3rem] font-semibold whitespace-nowrap opacity-90 md:h-[55px] md:text-[1.6rem]"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
