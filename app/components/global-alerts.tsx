import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Doc } from "convex/_generated/dataModel";

export function GlobalAlerts() {
  const alerts = useQuery(api.globalAlerts.getAlerts);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set()
  );

  if (!alerts || alerts.length === 0) return null;

  const visibleAlerts = alerts.filter(
    (alert) => !dismissedAlerts.has(alert._id)
  );

  if (visibleAlerts.length === 0) return null;

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  return (
    <>
      {visibleAlerts.map((alert: Doc<"globalAlerts">) => (
        <div
          key={alert._id}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-2xl w-full mx-4 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="flex gap-4 p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex-1">
                {alert.title}
              </h2>
              <button
                onClick={() => handleDismiss(alert._id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words prose-p:my-2 prose-p:leading-relaxed prose-strong:font-bold prose-em:italic prose-headings:font-bold prose-headings:my-3">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="my-2 leading-relaxed">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic">{children}</em>
                    ),
                    br: () => <br />,
                  }}
                >
                  {alert.description}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleDismiss(alert._id)}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
