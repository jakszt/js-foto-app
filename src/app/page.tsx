import { ContactNav } from "@/components/contact-nav";

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

          <ContactNav />
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
