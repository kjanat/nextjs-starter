"use client";

import { differenceInDays, format } from "date-fns";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import { alertStyles, buttonStyles, containerStyles } from "@/lib/styles";
import { trpc } from "@/trpc/client";

export default function InventoryDetailPage() {
  const params = useParams();
  const inventoryId = params.id as string;

  const [showTemperatureForm, setShowTemperatureForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const {
    data: item,
    isLoading,
    error,
    refetch,
  } = trpc.insulinInventory.getById.useQuery({
    id: inventoryId,
  });

  const { data: exposures } = trpc.insulinInventory.getTemperatureExposures.useQuery({
    inventoryId,
  });

  const updateMutation = trpc.insulinInventory.update.useMutation({
    onSuccess: () => {
      refetch();
      setShowUpdateForm(false);
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading details..." />;
  }

  if (error || !item) {
    return <ErrorMessage error={error?.message || "Item not found"} onRetry={refetch} />;
  }

  const daysUntilExpiry = differenceInDays(new Date(item.expirationDate), new Date());
  const daysSinceOpened = item.openedDate
    ? differenceInDays(new Date(), new Date(item.openedDate))
    : null;

  const handleStatusChange = (newStatus: string) => {
    const updates = {
      id: inventoryId,
      status: newStatus as "active" | "finished" | "expired" | "discarded",
      startedUsing: undefined as Date | undefined,
      finishedUsing: undefined as Date | undefined,
    };

    if (newStatus === "active" && item.status !== "active") {
      updates.startedUsing = new Date();
    } else if (newStatus === "finished") {
      updates.finishedUsing = new Date();
    }

    updateMutation.mutate(updates);
  };

  return (
    <PageLayout
      title="Insulin Details"
      icon="💉"
      backTo={{ href: "/inventory", label: "← Back to Inventory" }}
    >
      {/* Main Info Card */}
      <div className={`${containerStyles.card} mb-6`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">{item.brand || item.insulinType}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {item.insulinType} • {item.concentration || "U100"}
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              item.status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                : item.status === "expired"
                  ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                  : item.status === "finished"
                    ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
            }`}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Quantity</p>
            <p className="font-semibold">
              {item.quantity} {item.quantity === 1 ? "vial/pen" : "vials/pens"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Volume</p>
            <p className="font-semibold">{item.volumeMl || 10} mL each</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Units</p>
            <p className="font-semibold">
              {(item.volumeMl || 10) * (item.unitsPerMl || 100) * item.quantity} units
            </p>
          </div>
          {item.currentUnitsRemaining !== null && item.currentUnitsRemaining !== undefined && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
              <p className="font-semibold">{item.currentUnitsRemaining} units</p>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">User</span>
            <span>{item.userName}</span>
          </div>
          {item.purchaseDate && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Purchase Date</span>
              <span>{format(new Date(item.purchaseDate), "MMM d, yyyy")}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Expiration Date</span>
            <span
              className={daysUntilExpiry < 30 ? "text-red-600 dark:text-red-400 font-semibold" : ""}
            >
              {format(new Date(item.expirationDate), "MMM d, yyyy")}
              {daysUntilExpiry >= 0 ? ` (${daysUntilExpiry} days)` : " (EXPIRED)"}
            </span>
          </div>
          {item.openedDate && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Opened Date</span>
              <span
                className={
                  daysSinceOpened && daysSinceOpened > 28
                    ? "text-yellow-600 dark:text-yellow-400"
                    : ""
                }
              >
                {format(new Date(item.openedDate), "MMM d, yyyy")}
                {daysSinceOpened !== null && ` (${daysSinceOpened} days ago)`}
              </span>
            </div>
          )}
          {item.storageLocation && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Storage Location</span>
              <span>{item.storageLocation}</span>
            </div>
          )}
        </div>

        {item.notes && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <p className="text-sm font-medium mb-1">Notes</p>
            <p className="text-sm">{item.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {item.status === "active" && !item.openedDate && (
          <button
            onClick={() => updateMutation.mutate({ id: inventoryId, openedDate: new Date() })}
            className={buttonStyles.secondary}
          >
            Mark as Opened
          </button>
        )}

        {item.status === "active" && (
          <>
            <button
              onClick={() => handleStatusChange("finished")}
              className={buttonStyles.secondary}
            >
              Mark as Finished
            </button>
            <button onClick={() => setShowTemperatureForm(true)} className={buttonStyles.secondary}>
              Log Temperature Event
            </button>
          </>
        )}

        {item.status !== "active" && item.status !== "discarded" && (
          <button onClick={() => handleStatusChange("active")} className={buttonStyles.primary}>
            Reactivate
          </button>
        )}

        {item.status !== "discarded" && (
          <button
            onClick={() => {
              if (confirm("Are you sure you want to discard this item?")) {
                handleStatusChange("discarded");
              }
            }}
            className={`${buttonStyles.secondary} !text-red-600 dark:!text-red-400`}
          >
            Discard
          </button>
        )}

        <button onClick={() => setShowUpdateForm(true)} className={buttonStyles.secondary}>
          Edit Details
        </button>
      </div>

      {/* Temperature Exposures */}
      {exposures && exposures.length > 0 && (
        <div className={containerStyles.section}>
          <h3 className="text-lg font-semibold mb-3">Temperature Exposure History</h3>
          <div className="space-y-2">
            {exposures.map((exposure) => (
              <div
                key={exposure.id}
                className={`p-3 rounded border ${
                  exposure.severity === "high"
                    ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                    : exposure.severity === "medium"
                      ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20"
                      : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {exposure.exposureType === "heat"
                        ? "🔥 Heat Exposure"
                        : exposure.exposureType === "freeze"
                          ? "❄️ Freeze Exposure"
                          : "🌡️ Room Temperature"}
                    </p>
                    {exposure.temperature && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {exposure.temperature}°C
                        {exposure.duration && ` for ${exposure.duration} minutes`}
                      </p>
                    )}
                    {exposure.notes && <p className="text-sm mt-1">{exposure.notes}</p>}
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(exposure.exposureDate), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Temperature Exposure Form */}
      {showTemperatureForm && (
        <TemperatureExposureForm
          inventoryId={inventoryId}
          onClose={() => setShowTemperatureForm(false)}
          onSuccess={refetch}
        />
      )}

      {/* Update Form */}
      {showUpdateForm && (
        <UpdateInventoryForm
          item={item}
          onClose={() => setShowUpdateForm(false)}
          onSuccess={refetch}
        />
      )}
    </PageLayout>
  );
}

function TemperatureExposureForm({
  inventoryId,
  onClose,
  onSuccess,
}: {
  inventoryId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    exposureType: "heat" as "heat" | "freeze" | "room_temp",
    temperature: "",
    duration: "",
    exposureDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    severity: "medium" as "low" | "medium" | "high",
    notes: "",
  });

  const mutation = trpc.insulinInventory.logTemperatureExposure.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      inventoryId,
      exposureType: formData.exposureType,
      temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      exposureDate: new Date(formData.exposureDate),
      severity: formData.severity,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Log Temperature Exposure</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Exposure Type</label>
            <select
              value={formData.exposureType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  exposureType: e.target.value as "heat" | "freeze" | "room_temp",
                })
              }
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="heat">Heat Exposure</option>
              <option value="freeze">Freeze Exposure</option>
              <option value="room_temp">Room Temperature</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date & Time</label>
            <input
              type="datetime-local"
              required
              value={formData.exposureDate}
              onChange={(e) => setFormData({ ...formData, exposureDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Severity</label>
            <select
              value={formData.severity}
              onChange={(e) =>
                setFormData({ ...formData, severity: e.target.value as "low" | "medium" | "high" })
              }
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="e.g., Left in car for 2 hours"
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={mutation.isPending} className={buttonStyles.primary}>
              {mutation.isPending ? "Logging..." : "Log Exposure"}
            </button>
            <button type="button" onClick={onClose} className={buttonStyles.secondary}>
              Cancel
            </button>
          </div>

          {mutation.error && <div className={alertStyles.error}>{mutation.error.message}</div>}
        </form>
      </div>
    </div>
  );
}

function UpdateInventoryForm({
  item,
  onClose,
  onSuccess,
}: {
  item: {
    id: string;
    currentUnitsRemaining?: number | null;
    storageLocation?: string | null;
    notes?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    currentUnitsRemaining: item.currentUnitsRemaining?.toString() || "",
    storageLocation: item.storageLocation || "",
    notes: item.notes || "",
  });

  const mutation = trpc.insulinInventory.update.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      id: item.id,
      currentUnitsRemaining: formData.currentUnitsRemaining
        ? parseFloat(formData.currentUnitsRemaining)
        : undefined,
      storageLocation: formData.storageLocation || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Update Inventory Details</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Units Remaining</label>
            <input
              type="number"
              step="0.1"
              value={formData.currentUnitsRemaining}
              onChange={(e) => setFormData({ ...formData, currentUnitsRemaining: e.target.value })}
              placeholder="Leave empty to calculate automatically"
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Storage Location</label>
            <input
              type="text"
              value={formData.storageLocation}
              onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
              placeholder="e.g., Main fridge, bedroom drawer"
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={mutation.isPending} className={buttonStyles.primary}>
              {mutation.isPending ? "Updating..." : "Update"}
            </button>
            <button type="button" onClick={onClose} className={buttonStyles.secondary}>
              Cancel
            </button>
          </div>

          {mutation.error && <div className={alertStyles.error}>{mutation.error.message}</div>}
        </form>
      </div>
    </div>
  );
}
