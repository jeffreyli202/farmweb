import { farm } from "@/data/farm";

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <p className="text-sm tracking-[0.18em] uppercase text-foreground/60">
          About us
        </p>
        <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          {farm.name}
        </h1>
        <div className="mt-8 max-w-2xl space-y-5 text-lg leading-8 text-foreground/80">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
            cupidatat non proident, sunt in culpa qui officia deserunt mollit
            anim id est laborum.
          </p>
          <p>
            Curabitur pretium tincidunt lacus. Nulla gravida orci a odio.
            Nullam varius, turpis et commodo pharetra, est eros bibendum elit,
            nec luctus magna felis sollicitudin mauris.
          </p>
        </div>
      </section>
    </main>
  );
}
