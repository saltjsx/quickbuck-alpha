import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

export function MaintenanceScreen() {
  const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);

  if (!maintenanceStatus?.isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <div className="text-center space-y-8 max-w-md px-4">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 animate-spin">
              <svg
                className="w-full h-full text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white">Maintenance Mode</h1>

          <p className="text-lg text-gray-400">
            {maintenanceStatus.message || "System maintenance in progress"}
          </p>

          <p className="text-sm text-gray-500">
            We'll be back online shortly. Please check back in a few moments.
          </p>
        </div>

        {/* Loading indicator */}
        <div className="space-y-3">
          <div className="flex gap-2 justify-center">
            <div
              className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"
              style={{ animationDelay: "0s" }}
            />
            <div
              className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
          <p className="text-xs text-gray-600">Performing system updates...</p>
        </div>
      </div>
    </div>
  );
}
