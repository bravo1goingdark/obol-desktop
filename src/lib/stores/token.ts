// Token store — wraps the Rust side's `cmd_save_token` / `cmd_load_token`
// / `cmd_delete_token` commands. The actual token lives in the OS
// keychain via `keyring` on the Rust side, not in localStorage — see
// src-tauri/src/main.rs.
//
// Multi-account: labels stored in localStorage, active token in keychain.
import { writable } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";

export interface Account {
  label: string;
  prefix: string; // first 12 chars for display
}

function getAccounts(): Account[] {
  try {
    return JSON.parse(localStorage.getItem("obol_accounts") || "[]");
  } catch {
    return [];
  }
}

function saveAccounts(accounts: Account[]): void {
  localStorage.setItem("obol_accounts", JSON.stringify(accounts));
}

function create() {
  const { subscribe, set } = writable<string | null>(null);

  return {
    subscribe,
    async load(): Promise<string | null> {
      try {
        const tok = await invoke<string | null>("cmd_load_token");
        set(tok);
        return tok;
      } catch {
        set(null);
        return null;
      }
    },
    async save(token: string, label?: string): Promise<void> {
      await invoke("cmd_save_token", { token });
      set(token);
      // Store account metadata
      const accounts = getAccounts();
      const prefix = token.slice(0, 12);
      if (!accounts.some((a) => a.prefix === prefix)) {
        accounts.push({ label: label || `Account ${accounts.length + 1}`, prefix });
        saveAccounts(accounts);
      }
    },
    async clear(): Promise<void> {
      await invoke("cmd_delete_token").catch(() => undefined);
      set(null);
    },
  };
}

export const token = create();
