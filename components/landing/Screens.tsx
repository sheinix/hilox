import Image from "next/image";

/** Single demo GIF showing the flow: paste URL → generate → copy thread. */
const DEMO_GIF_PATH = "/landing/demo.gif";

export function Screens() {
  return (
    <section className="px-4 py-16 sm:py-20" id="screenshots">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          See it in action
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Paste a link → Hilox generates the thread → copy and post.
        </p>
        <figure className="mt-12 overflow-hidden rounded-xl border border-border bg-card/50 p-2 shadow-lg">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <Image
              src={DEMO_GIF_PATH}
              alt="Hilox demo: paste a news URL, adjust settings, generate thread, copy tweets"
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 1024px"
              unoptimized
              priority={false}
            />
          </div>
          <figcaption className="mt-3 text-center text-sm text-muted-foreground">
            How Hilox works
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
