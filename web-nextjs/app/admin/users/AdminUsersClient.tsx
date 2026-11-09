"use client";

import { useState } from "react";

export interface AdminUser {
  id: number;
  username: string;
  displayName?: string | null;
  role: string;
  allowedExamTypeCodes?: string[];
}

export interface ExamType {
  id: number;
  code: string;
  name: string;
}

const ROLES = ["ADMIN", "CREATOR", "USER"] as const;

interface AdminUsersClientProps {
  initialUsers: AdminUser[];
  examTypes: ExamType[];
  accessToken?: string;
  initialError?: string | null;
}

export default function AdminUsersClient({
  initialUsers,
  examTypes,
  accessToken,
  initialError = null,
}: AdminUsersClientProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, string>>(() =>
    Object.fromEntries(initialUsers.map((u) => [u.id, u.role]))
  );
  const [bankDrafts, setBankDrafts] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(
      initialUsers.map((u) => [u.id, [...(u.allowedExamTypeCodes || [])]])
    )
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }

  async function handleRoleSubmit(e: React.FormEvent, userId: number) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSavingUserId(userId);

    const selectedRole =
      roleDrafts[userId] ?? users.find((u) => u.id === userId)?.role ?? "USER";

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo cambiar el rol");
      }

      const updated: AdminUser = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setRoleDrafts((prev) => ({ ...prev, [userId]: updated.role }));
      setMessage("Cambios guardados.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo cambiar el rol"
      );
    } finally {
      setSavingUserId(null);
    }
  }

  function toggleBank(userId: number, code: string) {
    setBankDrafts((prev) => {
      const current =
        prev[userId] ??
        users.find((u) => u.id === userId)?.allowedExamTypeCodes ??
        [];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      return { ...prev, [userId]: next };
    });
  }

  async function handleBanksSubmit(e: React.FormEvent, userId: number) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSavingUserId(userId);

    const selectedBanks =
      bankDrafts[userId] ??
      users.find((u) => u.id === userId)?.allowedExamTypeCodes ??
      [];

    try {
      const res = await fetch(`/api/admin/users/${userId}/banks`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify({ examTypeCodes: selectedBanks }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudieron guardar los bancos");
      }

      const updated: AdminUser = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setBankDrafts((prev) => ({
        ...prev,
        [userId]: [...(updated.allowedExamTypeCodes || [])],
      }));
      setMessage("Cambios guardados.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los bancos"
      );
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          role="status"
          className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200"
        >
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div
          role="status"
          className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800"
        >
          No hay usuarios registrados.
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((u) => {
            const currentRole = roleDrafts[u.id] ?? u.role;
            const currentBanks = bankDrafts[u.id] ?? u.allowedExamTypeCodes ?? [];

            return (
              <div
                key={u.id}
                data-testid={`user-card-${u.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">
                      {u.displayName || u.username}
                    </span>
                    <span className="text-sm text-gray-500">
                      @{u.username}
                    </span>
                  </div>
                  <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    {u.role}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Role Form */}
                  <div className="lg:col-span-4">
                    <form
                      onSubmit={(e) => handleRoleSubmit(e, u.id)}
                      className="space-y-2"
                    >
                      <label
                        htmlFor={`role-${u.id}`}
                        className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Rol
                      </label>
                      <div className="flex space-x-2">
                        <select
                          id={`role-${u.id}`}
                          name="role"
                          value={currentRole}
                          onChange={(e) =>
                            setRoleDrafts((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={savingUserId === u.id}
                          className="rounded-md border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Banks Form */}
                  <div className="lg:col-span-8">
                    <form
                      onSubmit={(e) => handleBanksSubmit(e, u.id)}
                      className="space-y-3"
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Bancos de preguntas
                      </span>

                      {examTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-4">
                          {examTypes.map((et) => {
                            const checkboxId = `bank-${u.id}-${et.code}`;
                            const isChecked = currentBanks.includes(et.code);
                            return (
                              <div
                                key={et.code}
                                className="flex items-center space-x-2"
                              >
                                <input
                                  type="checkbox"
                                  id={checkboxId}
                                  name="banks"
                                  value={et.code}
                                  checked={isChecked}
                                  onChange={() => toggleBank(u.id, et.code)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                />
                                <label
                                  htmlFor={checkboxId}
                                  className="text-sm text-gray-700 cursor-pointer"
                                >
                                  {et.code} - {et.name}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">
                          No hay tipos de examen registrados.
                        </p>
                      )}

                      <div>
                        <button
                          type="submit"
                          disabled={savingUserId === u.id}
                          className="rounded-md border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        >
                          Guardar bancos
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
