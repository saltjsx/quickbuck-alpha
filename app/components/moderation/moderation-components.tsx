import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";

export function BanCheckComponent() {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      try {
        // Check if user is banned via a public check endpoint
        // This will need to be called after auth is set up
        const userEmail = localStorage.getItem("userEmail");

        if (userEmail) {
          // Query will be set up once API types are regenerated
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error checking ban status:", error);
        setIsLoading(false);
      }
    };

    checkBanStatus();
  }, []);

  if (isLoading) {
    return null;
  }

  if (isBanned) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">⛔</div>
            <h1 className="text-3xl font-bold text-red-600 mb-2">
              Account Banned
            </h1>
            <p className="text-gray-600 mb-6">
              Your account has been banned from QuickBuck.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Reason:</span> {banReason}
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              If you believe this is a mistake, please contact support.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
              className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function WarningPopup() {
  const warnings = useQuery(api.moderation.getUnacknowledgedWarnings);
  const acknowledgeWarning = useMutation(api.moderation.acknowledgeWarning);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Debug: Log warnings data
  useEffect(() => {
    if (warnings !== undefined) {
      console.log("[WarningPopup] Warnings loaded:", warnings);
      console.log("[WarningPopup] Number of warnings:", warnings?.length || 0);
    }
  }, [warnings]);

  // Get the first unacknowledged warning
  const currentWarning = warnings && warnings.length > 0 ? warnings[0] : null;

  const handleAcknowledge = async () => {
    if (!currentWarning) return;

    console.log("[WarningPopup] Acknowledging warning:", currentWarning._id);
    setIsAcknowledging(true);
    try {
      await acknowledgeWarning({ warningId: currentWarning._id });
      console.log("[WarningPopup] Warning acknowledged successfully");
    } catch (error) {
      console.error("[WarningPopup] Error acknowledging warning:", error);
    } finally {
      setIsAcknowledging(false);
    }
  };

  if (!currentWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-orange-600 mb-2">Warning</h2>
          <p className="text-gray-600 mb-6 text-lg">{currentWarning.reason}</p>
          <p className="text-xs text-gray-500 mb-6">
            Issued: {new Date(currentWarning.createdAt).toLocaleDateString()}
          </p>
          <button
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAcknowledging ? "Acknowledging..." : "I Understand"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add to root layout to check for bans and show warnings
export function ModerationProviders() {
  return (
    <>
      <BanCheckComponent />
      <WarningPopup />
    </>
  );
}
