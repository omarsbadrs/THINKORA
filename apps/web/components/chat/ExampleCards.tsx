'use client';

import { ArrowUpRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const EXAMPLES = [
  {
    title: 'Prepare for a job interview',
    desc: 'Practice common interview questions, get tips on how to present your experience, and build confidence for the big day.',
  },
  {
    title: 'Write a personal website bio',
    desc: 'Craft an engaging and professional bio that highlights your skills, personality, and career story.',
  },
  {
    title: 'Create a personal budget',
    desc: 'Build a practical monthly budget that tracks income, expenses, and savings goals to improve financial health.',
  },
  {
    title: 'Understand climate change',
    desc: 'Get a clear, science-backed explanation of climate change causes, effects, and what individuals can do to help.',
  },
  {
    title: 'Deep conversation starters',
    desc: 'Explore thought-provoking questions that spark meaningful dialogue about life, values, and human connection.',
  },
  {
    title: 'Techniques for managing stress',
    desc: 'Discover evidence-based strategies for reducing stress, from breathing exercises to mindset shifts.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ExampleCardsProps {
  onSelect: (text: string) => void;
}

export default function ExampleCards({ onSelect }: ExampleCardsProps) {
  return (
    <div className="examples-grid">
      {EXAMPLES.map((ex, i) => (
        <div
          key={i}
          className="ex-card"
          style={{ animationDelay: `${0.28 + i * 0.04}s` }}
          onClick={() => onSelect(ex.desc)}
        >
          <div className="ex-card-title">{ex.title}</div>
          <div className="ex-card-desc">{ex.desc}</div>
          <span className="ex-card-arrow">
            <ArrowUpRight size={16} />
          </span>
        </div>
      ))}
    </div>
  );
}
