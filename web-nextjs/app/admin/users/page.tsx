import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import AdminUsersClient, { AdminUser, ExamType } from "./AdminUsersClient";

export const instant = false;

interface AdminData {
  users: AdminUser[];
  examTypes: ExamType[];
  error: string | null;
}

async function fetchAdminData(accessToken?: string): Promise<AdminData> {
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let users: AdminUser[] = [];
  let examTypes: ExamType[] = [];
  let error: string | null = null;

  try {
    const usersRes = await fetch(`${apiBaseUrl}/api/admin/users`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (usersRes.ok) {
      const data = await usersRes.json();
      users = Array.isArray(data) ? data : [];
    } else {
      error = "No se pudo cargar la lista de usuarios";
    }
  } catch {
    error = "No se pudo cargar la lista de usuarios";
  }

  try {
    const examTypesRes = await fetch(`${apiBaseUrl}/api/exam-types`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (examTypesRes.ok) {
      const data = await examTypesRes.json();
      examTypes = Array.isArray(data) ? data : [];
    }
  } catch {
    examTypes = [];
  }

  return { users, examTypes, error };
}

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
    return null;
  }

  const user = session.user as {
    name?: string | null;
    role?: string;
    roles?: string[];
    accessToken?: string;
  };
  const isAdmin =
    user.role === "ADMIN" || Boolean(user.roles?.includes("ROLE_ADMIN"));

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar session={session} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div
            role="alert"
            className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center space-y-4"
          >
            <h1 className="text-2xl font-bold text-red-700">Acceso denegado</h1>
            <p className="text-sm text-gray-600">
              Solo los usuarios con rol <strong>ADMIN</strong> pueden acceder a la administración.
            </p>
            <div>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { users, examTypes, error } = await fetchAdminData(user.accessToken);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar session={session} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Administración de usuarios
          </h1>
          <p className="text-sm text-gray-600">
            Asigna el rol de cada usuario y los bancos de preguntas a los que
            puede acceder. El acceso a bancos solo se aplica a los usuarios con
            rol <strong>USER</strong>.
          </p>
        </div>

        <AdminUsersClient
          initialUsers={users}
          examTypes={examTypes}
          accessToken={user.accessToken}
          initialError={error}
        />
      </main>
    </div>
  );
}
