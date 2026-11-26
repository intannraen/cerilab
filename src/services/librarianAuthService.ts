export interface LibrarianAuthStatus {
  configured: boolean;
  needsSetup: boolean;
  usingEnvOverride: boolean;
}

export interface LibrarianSessionInfo {
  token: string;
  username: string;
  usingEnvOverride: boolean;
}

async function parseJsonSafe<T>(res: Response): Promise<T & { error?: string }> {
  try {
    return (await res.json()) as T & { error?: string };
  } catch {
    return {} as T & { error?: string };
  }
}

export async function fetchLibrarianAuthStatus(): Promise<LibrarianAuthStatus> {
  const res = await fetch('/api/librarian/status');
  const data = await parseJsonSafe<LibrarianAuthStatus>(res);
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memeriksa status akun pustakawan.');
  }
  return data;
}

export async function setupLibrarianCredentials(
  username: string,
  password: string,
): Promise<LibrarianSessionInfo> {
  const res = await fetch('/api/librarian/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseJsonSafe<LibrarianSessionInfo>(res);
  if (!res.ok) {
    throw new Error(data.error || 'Gagal membuat akun pustakawan.');
  }
  return data;
}

export async function loginLibrarianWithCredentials(
  username: string,
  password: string,
): Promise<LibrarianSessionInfo> {
  const res = await fetch('/api/librarian/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseJsonSafe<LibrarianSessionInfo>(res);
  if (!res.ok) {
    throw new Error(data.error || 'Username atau password pustakawan salah.');
  }
  return data;
}

export async function updateLibrarianCredentials(
  token: string,
  currentPassword: string,
  newUsername: string,
  newPassword: string,
): Promise<LibrarianSessionInfo> {
  const res = await fetch('/api/librarian/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newUsername, newPassword }),
  });
  const data = await parseJsonSafe<LibrarianSessionInfo>(res);
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memperbarui kredensial pustakawan.');
  }
  return data;
}
