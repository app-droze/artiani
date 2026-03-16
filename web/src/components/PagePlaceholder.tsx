type PagePlaceholderProps = {
  title: string;
  body: string;
};

export const PagePlaceholder = ({ title, body }: PagePlaceholderProps) => (
  <section className="mx-auto flex w-full max-w-5xl flex-1 items-start px-4 py-7 sm:px-6 sm:py-10 md:py-14">
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="text-base leading-7 text-black/70">{body}</p>
    </div>
  </section>
);
