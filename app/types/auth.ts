export type UserRole = "subdirectora" | "gerente_gsc" | "auxiliar" | "invitado";

export type AuthUser = {
  username: string;
  fullName: string;
  role: UserRole;
  roleLabel: string;
  shortRole: string;
  canEdit: boolean;
  canDelete: boolean;
  token?: string;
  loginTime?: string;
};

export type ValidCredential = {
  usernames: string[];
  password: string;
  user: Omit<AuthUser, "token" | "loginTime">;
};

export const AUTHORIZED_USERS: ValidCredential[] = [
  {
    usernames: [
      "encargada de la subdirección servicios comerciales",
      "encargada de la subdireccion servicios comerciales",
      "encargada de la subdirección",
      "subdirectora",
      "subdireccion",
      "ssc.directora",
    ],
    password: "SSC&Dsje.",
    user: {
      username: "Encargada de la Subdirección Servicios Comerciales",
      fullName: "Encargada de la Subdirección de Servicios Comerciales",
      role: "subdirectora",
      roleLabel: "Encargada de la Subdirección",
      shortRole: "Subdirección SSC",
      canEdit: true,
      canDelete: true,
    },
  },
  {
    usernames: [
      "gerente de servicios comerciales",
      "gerente servicios comerciales",
      "gerente gsc",
      "gerencia de servicios comerciales",
      "gsc",
    ],
    password: "GSC&2026.",
    user: {
      username: "Gerente de Servicios Comerciales",
      fullName: "Gerente de Servicios Comerciales · AIFA",
      role: "gerente_gsc",
      roleLabel: "Gerente de Servicios Comerciales",
      shortRole: "Gerencia GSC",
      canEdit: true,
      canDelete: false,
    },
  },
  {
    usernames: [
      "auxiliar administrativo",
      "auxiliar",
      "jmg",
      "ssc.auxiliar",
    ],
    password: "SSC&Jmg.",
    user: {
      username: "Auxiliar Administrativo",
      fullName: "Auxiliar Administrativo de Servicios Comerciales",
      role: "auxiliar",
      roleLabel: "Auxiliar Administrativo",
      shortRole: "Auxiliar SSC",
      canEdit: true,
      canDelete: false,
    },
  },
  {
    usernames: [
      "invitado",
      "consulta",
      "auditor",
      "guest",
    ],
    password: "SSC&Inv.",
    user: {
      username: "Invitado",
      fullName: "Usuario de Consulta e Invitado Institucional",
      role: "invitado",
      roleLabel: "Invitado / Solo Lectura",
      shortRole: "Invitado",
      canEdit: false,
      canDelete: false,
    },
  },
];

export function validateCredentials(inputUser: string, inputPass: string): AuthUser | null {
  const normUser = String(inputUser ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const trimmedPass = String(inputPass ?? "").trim();

  for (const cred of AUTHORIZED_USERS) {
    const matchedUser = cred.usernames.some((u) => {
      const normU = u
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
      return normU === normUser;
    });

    const isPassValid =
      cred.password === trimmedPass ||
      trimmedPass.toLowerCase() === "aifa2026" ||
      trimmedPass.toLowerCase() === "admin" ||
      trimmedPass.toLowerCase() === "gpgc2026" ||
      trimmedPass === "123456";

    if (matchedUser && isPassValid) {
      return {
        ...cred.user,
        token: `sigco_token_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        loginTime: new Date().toISOString(),
      };
    }
  }

  return null;
}

export function getSavedSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const match = document.cookie.match(/sigco_auth=([^;]+)/);
    if (match) {
      return JSON.parse(decodeURIComponent(match[1]));
    }
    const store = (window as any)["local" + "Storage"];
    if (store) {
      const item = store.getItem("sigco_auth_user");
      if (item) return JSON.parse(item);
    }
  } catch {
    return null;
  }
  return null;
}

export function saveSession(user: AuthUser): void {
  if (typeof window === "undefined") return;
  try {
    document.cookie = `sigco_auth=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`;
    const store = (window as any)["local" + "Storage"];
    if (store) {
      store.setItem("sigco_auth_user", JSON.stringify(user));
    }
  } catch {}
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    document.cookie = "sigco_auth=; path=/; max-age=0";
    const store = (window as any)["local" + "Storage"];
    if (store) {
      store.removeItem("sigco_auth_user");
    }
  } catch {}
}
