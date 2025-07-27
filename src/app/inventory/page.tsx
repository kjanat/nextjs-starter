"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageLayout } from "@/components/PageLayout";
import { ROUTES } from "@/lib/constants";
import { alertStyles, buttonStyles, containerStyles } from "@/lib/styles";
import { trpc } from "@/trpc/client";

export default function InventoryPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [userName, setUserName] = useState("");

  const {
    data: inventory,
    isLoading,
    error,
    refetch,
  } = trpc.insulinInventory.list.useQuery(userName ? { userName } : {});

  const { data: stats } = trpc.insulinInventory.getStats.useQuery(userName ? { userName } : {});

  const { data: alerts } = trpc.insulinInventory.getAlerts.useQuery(
    { userName: userName || "default" },
    { enabled: !!userName },
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading inventory..." />;
  }

  if (error) {
    return <ErrorMessage error={error.message} onRetry={refetch} />;
  }

  const activeItems = inventory?.filter((item) => item.status === "active") || [];
  const expiredItems = inventory?.filter((item) => item.status === "expired") || [];

  return (
    <PageLayout
      title="Insulin Inventory"
      icon="📦"
      backTo={{ href: ROUTES.HOME, label: "← Back to Dashboard" }}
    >
      {/* User Filter */}
      <div className={`${containerStyles.card} mb-6`}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by User
        </label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter user name (leave empty for all)"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={containerStyles.card}>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalActive}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Items</div>
          </div>
          <div className={containerStyles.card}>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.expiringWithin30Days}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</div>
          </div>
          <div className={containerStyles.card}>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expired}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Expired</div>
          </div>
          <div className={containerStyles.card}>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {Object.keys(stats.byType).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Types</div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className={`${alertStyles.error} mb-6`}>
          <h3 className="font-semibold mb-2">⚠️ Alerts</h3>
          <ul className="space-y-1">
            {alerts.map((alert, index) => (
              <li key={index} className="text-sm">
                • {alert.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Button */}
      <div className="mb-6">
        <button onClick={() => setShowAddForm(true)} className={buttonStyles.primary}>
          + Add Insulin
        </button>
      </div>

      {/* Active Inventory */}
      <div className={containerStyles.section}>
        <h2 className="text-xl font-semibold mb-4">Active Inventory</h2>
        {activeItems.length === 0 ? (
          <p className="text-gray-500">No active insulin in inventory</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeItems.map((item) => (
              <Link
                key={item.id}
                href={`/inventory/${item.id}`}
                className={`${containerStyles.card} hover:shadow-md transition-shadow`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{item.brand || item.insulinType}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.insulinType} • {item.concentration || "U100"}
                    </p>
                  </div>
                  {item.quantity > 1 && (
                    <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 px-2 py-1 rounded text-sm">
                      x{item.quantity}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                    <span
                      className={
                        new Date(item.expirationDate) < new Date()
                          ? "text-red-600 dark:text-red-400 font-semibold"
                          : new Date(item.expirationDate) <
                              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            ? "text-yellow-600 dark:text-yellow-400"
                            : ""
                      }
                    >
                      {format(new Date(item.expirationDate), "MMM d, yyyy")}
                    </span>
                  </div>

                  {item.openedDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Opened:</span>
                      <span>{format(new Date(item.openedDate), "MMM d, yyyy")}</span>
                    </div>
                  )}

                  {item.currentUnitsRemaining !== null &&
                    item.currentUnitsRemaining !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                        <span>{item.currentUnitsRemaining} units</span>
                      </div>
                    )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Expired Items */}
      {expiredItems.length > 0 && (
        <div className={`${containerStyles.section} mt-8`}>
          <h2 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">
            Expired Items
          </h2>
          <div className="space-y-2">
            {expiredItems.map((item) => (
              <div key={item.id} className={`${containerStyles.card} opacity-60`}>
                <div className="flex justify-between">
                  <span>{item.brand || item.insulinType}</span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Expired {format(new Date(item.expirationDate), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && <AddInsulinForm onClose={() => setShowAddForm(false)} onSuccess={refetch} />}
    </PageLayout>
  );
}

function AddInsulinForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    userName: "",
    insulinType: "rapid" as "rapid" | "long-acting" | "intermediate" | "mixed" | "other",
    brand: "",
    concentration: "U100",
    quantity: 1,
    volumeMl: 10,
    expirationDate: "",
    storageLocation: "fridge",
    notes: "",
  });

  const createMutation = trpc.insulinInventory.create.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      expirationDate: new Date(formData.expirationDate),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Add Insulin to Inventory</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">User Name</label>
            <input
              type="text"
              required
              value={formData.userName}
              onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Insulin Type</label>
            <select
              value={formData.insulinType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  insulinType: e.target.value as
                    | "rapid"
                    | "long-acting"
                    | "intermediate"
                    | "mixed"
                    | "other",
                })
              }
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="rapid">Rapid Acting</option>
              <option value="long-acting">Long Acting</option>
              <option value="intermediate">Intermediate</option>
              <option value="mixed">Mixed</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Brand Name</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g., Humalog, Lantus"
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Volume (mL)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.volumeMl}
                onChange={(e) => setFormData({ ...formData, volumeMl: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Expiration Date</label>
            <input
              type="date"
              required
              value={formData.expirationDate}
              onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
              min={format(new Date(), "yyyy-MM-dd")}
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
              rows={2}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className={buttonStyles.primary}
            >
              {createMutation.isPending ? "Adding..." : "Add to Inventory"}
            </button>
            <button type="button" onClick={onClose} className={buttonStyles.secondary}>
              Cancel
            </button>
          </div>

          {createMutation.error && (
            <div className={alertStyles.error}>{createMutation.error.message}</div>
          )}
        </form>
      </div>
    </div>
  );
}
