"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Bot, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoControl } from "@/components/pulse/shared";
import type { AskPulseResponse } from "@/types/pulse";

const suggestedQuestions = [
  "How do transferred complaints compare with other cases?",
  "Which regions have the most estimated reads?",
  "What does the AskNorthwind pilot data show?",
];

function errorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export function AskPulse() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskPulseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const panelId = useId();
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) questionInput.current?.focus();
    else if (wasOpen.current) launcher.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function ask(value: string) {
    const prompt = value.trim();
    if (!prompt || loading) return;
    setQuestion(prompt);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ask-pulse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: prompt }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "Ask Pulse could not answer right now."));
      setAnswer(body as AskPulseResponse);
    } catch (cause) {
      setAnswer(null);
      setError(cause instanceof Error ? cause.message : "Ask Pulse could not answer right now.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <aside className={`ask-pulse-widget ${open ? "is-open" : ""}`}>
      {open && (
        <section className="ask-panel" id={panelId} role="dialog" aria-modal="false" aria-labelledby="ask-pulse-title">
          <header className="ask-panel-heading">
            <div className="ask-title-wrap">
              <span className="ask-icon"><Bot size={17} aria-hidden="true" /></span>
              <div><h2 id="ask-pulse-title">Ask Pulse</h2><p>Answers grounded in Northwind’s measured data.</p></div>
            </div>
            <div className="ask-panel-actions">
              <InfoControl label="Ask Pulse privacy and limits" title="Grounded answers">
                Ask Pulse receives a small selection of aggregate dataset facts. It does not receive complaint-level rows and cannot make routing decisions or calculate investment returns.
              </InfoControl>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Close Ask Pulse" onClick={() => setOpen(false)}><X size={16} /></Button>
            </div>
          </header>
          <div className="ask-panel-body">
            <form className="ask-form" onSubmit={submit}>
              <label className="sr-only" htmlFor="ask-pulse-question">Ask Pulse question</label>
              <div className="ask-input">
                <textarea
                  ref={questionInput}
                  id="ask-pulse-question"
                  rows={2}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  maxLength={1000}
                  placeholder="For example: How do transfers relate to resolution time?"
                  disabled={loading}
                />
                <Button type="submit" size="icon" disabled={!question.trim() || loading} aria-label="Send question">
                  {loading ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <ArrowUp size={18} aria-hidden="true" />}
                </Button>
              </div>
            </form>
            {!answer && <div className="suggestions" aria-label="Suggested questions">{suggestedQuestions.map((suggestion) => <button key={suggestion} type="button" disabled={loading} onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>}

            {error && <p className="api-error" role="alert">{error}</p>}
            {answer && (
              <section className={`ask-answer ${answer.grounding === "insufficientData" ? "ask-answer-limited" : ""}`} aria-live="polite" aria-labelledby="ask-answer-title">
                <div className="answer-heading"><span className="result-eyebrow" id="ask-answer-title">{answer.grounding === "grounded" ? "Evidence-grounded answer" : "Not enough source data"}</span><span className="grounding-pill">{answer.grounding === "grounded" ? "Grounded" : "Limited"}</span></div>
                <p className="answer-copy">{answer.answer}</p>
                {answer.evidence.length > 0 && <div className="ask-evidence"><h3>Evidence used</h3><ul>{answer.evidence.map((item) => <li key={item.id}><span><strong>{item.label}</strong><small>{item.source}{item.period ? ` · ${item.period}` : ""}</small></span><b>{item.value}</b></li>)}</ul></div>}
                {answer.caveats.length > 0 && <div className="ask-caveats"><strong>Important context</strong><ul>{answer.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul></div>}
                {answer.suggestedFollowUps.length > 0 && <div className="ask-followups"><span>Explore further</span>{answer.suggestedFollowUps.map((followUp) => <button type="button" key={followUp} disabled={loading} onClick={() => void ask(followUp)}>{followUp}</button>)}</div>}
              </section>
            )}
          </div>
        </section>
      )}
      <Button
        ref={launcher}
        type="button"
        className="ask-pulse-launcher"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={17} aria-hidden="true" /> : <Bot size={18} aria-hidden="true" />}
        {open ? "Close Ask Pulse" : "Ask Pulse"}
      </Button>
    </aside>
  );
}
