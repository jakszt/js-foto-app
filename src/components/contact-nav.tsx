"use client";

import posthog from "posthog-js";

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

export function ContactNav() {
  return (
    <nav
      className="flex flex-col gap-[15px] max-md:items-center"
      aria-label="Kontakt"
    >
      <a
        href="mailto:jakub.sztuba@gmail.com"
        className="flex items-center text-base font-medium text-foreground no-underline transition-colors hover:text-accent"
        onClick={() => posthog.capture("contact_email_clicked")}
      >
        <MailIcon className="mr-3 size-5 shrink-0 fill-current" />
        napisz do mnie
      </a>
      <a
        href="https://www.linkedin.com/in/jakub-sztuba/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center text-base font-medium text-foreground no-underline transition-colors hover:text-accent"
        onClick={() => posthog.capture("contact_linkedin_clicked")}
      >
        <LinkedInIcon className="mr-3 size-5 shrink-0 fill-current" />
        dodaj mnie do sieci
      </a>
    </nav>
  );
}
