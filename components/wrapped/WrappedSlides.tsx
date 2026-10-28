"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, m, useReducedMotion } from "motion/react";
import { CLASS_TEXT_SHADOW } from "@/lib/class-text";
import type { WrappedClassId, WrappedSlide } from "@/lib/beta-wrapped";

export type WrappedClassView = { label: string; color: string; icon: string; specIcons: string[]; art: string };
export type WrappedClasses = Record<WrappedClassId, WrappedClassView>;

type SlideOf<K extends WrappedSlide["kind"]> = Extract<WrappedSlide, { kind: K }>;

// Same curve as the slide transition in WrappedStory, so reveals feel like one motion.
export const EASE = [0.22, 1, 0.36, 1] as const;

const HERO_IMAGE = "/images/hero/homepage-hero.webp";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground-muted">{children}</p>
);

// Counts a number up from 0 each time its slide becomes active. Renders the
// final value on the server and when inactive, so the prerendered HTML and
// reduced-motion visitors always see the real figure.
function CountUp({ value, active, duration = 1.1 }: { value: string; active: boolean; duration?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(/^(\D*)([\d,]+)(.*)$/);
  const target = match ? Number(match[2].replace(/,/g, "")) : 0;
  const final = target.toLocaleString("en-US");

  // Writes the animated number straight to the DOM node: no re-render per frame.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active || reduce) {
      el.textContent = final;
      return;
    }
    el.textContent = "0";
    const controls = animate(0, target, {
      duration,
      ease: EASE,
      onUpdate: (v) => (el.textContent = Math.round(v).toLocaleString("en-US")),
    });
    return () => controls.stop();
  }, [active, reduce, target, final, duration]);

  if (!match) return <>{value}</>;
  return (
    <>
      {match[1]}
      <span ref={ref}>{final}</span>
      {match[3]}
    </>
  );
}

// Dim, color-graded backdrop photo for the bookend slides (intro and closer).
function Backdrop({ position }: { position: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0 bg-cover opacity-45 [.light-mode_&]:opacity-25"
        style={{ backgroundImage: `url(${HERO_IMAGE})`, backgroundPosition: position }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-surface/30 via-surface/80 to-surface" />
    </div>
  );
}

function IntroSlide({
  slide,
  classes,
  onJump,
}: {
  slide: SlideOf<"intro">;
  classes: WrappedClasses;
  onJump: (classId: WrappedClassId) => void;
}) {
  return (
    <div className="flex min-h-full flex-col justify-between gap-8 pt-16">
      <Backdrop position="20% 40%" />
      <div>
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <h1 className="mt-4 font-heading text-[2.6rem] font-black leading-[0.95] text-accent sm:text-5xl">
          The beta,
          <br />
          <span className="pl-8 text-foreground">wrapped</span>
        </h1>
        <p className="mt-5 max-w-[17rem] text-[15px] leading-snug text-foreground">{slide.subtitle}</p>
      </div>
      <div>
        <p className="mb-2 text-xs text-foreground-muted">Tap to begin, or jump to your class</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(classes) as WrappedClassId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onJump(id)}
              aria-label={`Skip to ${classes[id].label}`}
              className="border-b-2 bg-background/40 p-0.5 transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
              style={{ borderColor: classes[id].color }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={classes[id].icon} alt="" width={30} height={30} className="block h-[30px] w-[30px]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatsSlide({ slide, active }: { slide: SlideOf<"stats">; active: boolean }) {
  return (
    <div className="flex min-h-full flex-col justify-center gap-7">
      <Eyebrow>{slide.title}</Eyebrow>
      <div>
        <p className="font-heading text-7xl font-black tabular-nums leading-none text-accent sm:text-8xl">
          <CountUp value={slide.hero.value} active={active} duration={1.3} />
        </p>
        <p className="mt-2 text-lg text-foreground">{slide.hero.label}</p>
        <p className="mt-1 text-sm text-foreground-muted">{slide.hero.detail}</p>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-border border-y border-border">
        {slide.stats.map((s) => (
          <div key={s.label} className="px-2 py-3 first:pl-0">
            <dd className="font-heading text-2xl font-bold tabular-nums text-foreground">
              <CountUp value={s.value} active={active} />
            </dd>
            <dt className="text-[11px] leading-tight text-foreground-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
      <p className="text-[11px] leading-snug text-foreground-muted">{slide.footnote}</p>
    </div>
  );
}

function TimelineSlide({ slide }: { slide: SlideOf<"timeline"> }) {
  return (
    <div className="flex min-h-full flex-col justify-center gap-5">
      <h2 className="font-heading text-[1.75rem] font-bold leading-tight text-accent">{slide.title}</h2>
      <ol>
        {slide.items.map((it) => {
          const hotfix = it.build === "Hotfix";
          return (
            <li key={it.date + it.build} className="grid grid-cols-[4.25rem_1fr] gap-3 border-t border-border/70 py-1.5">
              <p className="text-xs font-semibold tabular-nums text-accent">{it.date}</p>
              <p className="text-[13px] leading-snug text-foreground">
                <span className={`mr-1.5 text-[11px] ${hotfix ? "italic text-foreground-muted" : "font-mono text-foreground-muted"}`}>
                  {hotfix ? "hotfix" : it.build}
                </span>
                {it.headline}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ListSlide({ slide }: { slide: SlideOf<"list"> }) {
  const [lead, ...rest] = slide.items;
  return (
    <div className="flex min-h-full flex-col justify-center gap-5">
      <Eyebrow>{slide.eyebrow}</Eyebrow>
      <h2 className="font-heading text-[1.75rem] font-bold leading-tight text-accent">{slide.title}</h2>
      <p className="border-l-2 border-accent pl-3 text-2xl font-semibold leading-snug text-foreground">{lead}</p>
      <ul className="space-y-2.5">
        {rest.map((t) => (
          <li key={t} className="text-[14px] leading-snug text-foreground">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

// `near` gates the art so only the current and adjacent slides fetch it.
function ClassSlide({ slide, cls, flip, near }: { slide: SlideOf<"class">; cls: WrappedClassView; flip: boolean; near: boolean }) {
  const [lead, ...rest] = slide.items;
  return (
    <div className="-mx-6 -mt-12 flex min-h-[calc(100%+3rem)] flex-col">
      {/* Talent-tree art from the planner, faded into the slide. */}
      <div
        aria-hidden="true"
        className="h-44 shrink-0 bg-cover bg-center sm:h-48"
        style={{
          backgroundImage: near ? `url(${cls.art})` : undefined,
          maskImage: "linear-gradient(to bottom, black 35%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent)",
        }}
      />
      <div className="-mt-16 flex flex-1 flex-col gap-4 px-6">
        <div className={`flex items-end gap-3 ${flip ? "flex-row-reverse text-right" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cls.icon} alt="" width={52} height={52} className="h-[52px] w-[52px] border-2" style={{ borderColor: cls.color }} />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-[2rem] font-black leading-none" style={{ color: cls.color, textShadow: CLASS_TEXT_SHADOW }}>
              {slide.label}
            </h2>
            <p className="mt-1 text-sm text-foreground">{slide.tagline}</p>
          </div>
          <div className="flex flex-col gap-0.5" aria-hidden="true">
            {cls.specIcons.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" width={16} height={16} className="h-4 w-4 opacity-80" />
            ))}
          </div>
        </div>
        <div className="h-0.5 w-16" style={{ backgroundColor: cls.color, marginLeft: flip ? "auto" : undefined }} />
        <div>
          <p className="text-[11px] font-semibold tabular-nums text-foreground-muted">{lead.date}</p>
          <p className="text-lg font-medium leading-snug text-foreground">{lead.text}</p>
        </div>
        <ul className="space-y-2">
          {rest.map((it) => (
            <li key={it.text} className="grid grid-cols-[3.25rem_1fr] gap-2 text-[13.5px] leading-snug text-foreground">
              <span className="pt-px text-[11px] font-semibold tabular-nums text-foreground-muted">{it.date}</span>
              <span>{it.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const TONE = {
  new: { mark: "+", cls: "text-emerald-400 [.light-mode_&]:text-emerald-700" },
  removed: { mark: "−", cls: "text-red-400 line-through decoration-red-400/60 [.light-mode_&]:text-red-700" },
  renamed: { mark: "↻", cls: "text-foreground" },
} as const;

function RosterSlide({ slide }: { slide: SlideOf<"roster"> }) {
  return (
    <div className="flex min-h-full flex-col justify-center gap-4">
      <h2 className="font-heading text-[1.75rem] font-bold leading-tight text-accent">{slide.title}</h2>
      {slide.groups.map((g) => (
        <section key={g.label}>
          <h3 className="mb-1 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">
            <span className={`font-heading text-base not-italic no-underline ${TONE[g.tone].cls.split(" ")[0]}`} aria-hidden="true">
              {TONE[g.tone].mark}
            </span>
            {g.label}
          </h3>
          <p className="text-[13px] leading-relaxed">
            {g.items.map((t, i) => (
              <span key={t}>
                <span className={`whitespace-nowrap ${TONE[g.tone].cls}`}>{t}</span>
                {i < g.items.length - 1 && <span className="text-foreground-muted"> · </span>}
              </span>
            ))}
          </p>
        </section>
      ))}
    </div>
  );
}

function BeforeAfterSlide({ slide }: { slide: SlideOf<"beforeAfter"> }) {
  return (
    <div className="flex min-h-full flex-col justify-center gap-4">
      <Eyebrow>{slide.eyebrow}</Eyebrow>
      <h2 className="font-heading text-[1.75rem] font-bold leading-tight text-accent">{slide.title}</h2>
      <ul className="divide-y divide-border">
        {slide.rows.map((r) => (
          <li key={r.race} className="flex gap-3 py-1.5">
            <p className="w-16 shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent">{r.race}</p>
            <div>
              <p className="text-xs leading-snug text-foreground-muted line-through decoration-foreground-muted/50">{r.before}</p>
              <p className="text-[13px] leading-snug text-foreground">{r.after}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpotlightSlide({ slide, active, color }: { slide: SlideOf<"spotlight">; active: boolean; color: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(...slide.steps.map((s) => parseInt(s.value, 10)));
  return (
    <div className="flex min-h-full flex-col justify-center gap-5">
      <Eyebrow>{slide.eyebrow}</Eyebrow>
      <div>
        <h2 className="font-heading text-[2rem] font-black leading-tight" style={{ color, textShadow: CLASS_TEXT_SHADOW }}>
          {slide.title}
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">{slide.subject}</p>
      </div>
      <ol className="space-y-2.5">
        {slide.steps.map((s, i) => {
          const pct = (parseInt(s.value, 10) / max) * 100;
          const delay = reduce ? 0 : 0.15 + i * 0.35;
          return (
            <li key={s.date} className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2">
              <span className="text-xs tabular-nums text-foreground-muted">{s.date}</span>
              <div className="h-3 bg-background/60">
                <m.div
                  className="h-full origin-left"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  initial={false}
                  animate={{ scaleX: active ? 1 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.6, delay: active ? delay : 0, ease: EASE }}
                />
              </div>
              <span className="text-right font-heading text-xl font-bold tabular-nums text-foreground">
                <CountUp value={s.value} active={active} duration={0.6 + delay} />
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-[15px] leading-snug text-foreground">{slide.caption}</p>
    </div>
  );
}

function CloserSlide({ slide, onShare, shareLabel }: { slide: SlideOf<"closer">; onShare: () => void; shareLabel: string }) {
  return (
    <div className="flex min-h-full flex-col justify-end gap-6 pb-4">
      <Backdrop position="70% 30%" />
      <h2 className="font-heading text-5xl font-black leading-[0.95] text-accent">
        {slide.title.split(" ").slice(0, -2).join(" ")}
        <br />
        <span className="text-foreground">{slide.title.split(" ").slice(-2).join(" ")}</span>
      </h2>
      <p className="max-w-[18rem] text-[15px] leading-snug text-foreground">{slide.body}</p>
      <div className="flex flex-col gap-2">
        <Link
          href={slide.cta.href}
          className="bg-accent px-4 py-3 text-center font-semibold text-background transition-colors hover:bg-accent-hover"
        >
          {slide.cta.label} →
        </Link>
        <button
          type="button"
          onClick={onShare}
          className="border border-border bg-background/50 px-4 py-3 font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          {shareLabel}
        </button>
      </div>
    </div>
  );
}

export function WrappedSlideView(props: {
  slide: WrappedSlide;
  index: number;
  active: boolean;
  near: boolean;
  classes: WrappedClasses;
  onJump: (classId: WrappedClassId) => void;
  onShare: () => void;
  shareLabel: string;
}) {
  const { slide, active } = props;
  switch (slide.kind) {
    case "intro":
      return <IntroSlide slide={slide} classes={props.classes} onJump={props.onJump} />;
    case "stats":
      return <StatsSlide slide={slide} active={active} />;
    case "timeline":
      return <TimelineSlide slide={slide} />;
    case "list":
      return <ListSlide slide={slide} />;
    case "class":
      return <ClassSlide slide={slide} cls={props.classes[slide.classId]} flip={props.index % 2 === 1} near={props.near} />;
    case "roster":
      return <RosterSlide slide={slide} />;
    case "beforeAfter":
      return <BeforeAfterSlide slide={slide} />;
    case "spotlight":
      return <SpotlightSlide slide={slide} active={active} color={props.classes.paladin.color} />;
    case "closer":
      return <CloserSlide slide={slide} onShare={props.onShare} shareLabel={props.shareLabel} />;
  }
}
