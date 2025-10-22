import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import React from "react";
import { AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Doc } from "convex/_generated/dataModel";

export function GlobalAlerts() {
  const alerts = useQuery(api.globalAlerts.getAlerts);

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm space-y-3 pointer-events-auto">
      {alerts.map((alert: Doc<"globalAlerts">) => (
        <div
          key={alert._id}
          className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-lg animate-in fade-in slide-in-from-top"
        >
          <div className="flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                {alert.title}
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-200 prose prose-sm dark:prose-invert max-w-none prose-p:m-0 prose-strong:font-bold prose-em:italic">
                <ReactMarkdown>{alert.description}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
