// Token store — wraps the Rust side's `cmd_save_token` / `cmd_load_token`
// / `cmd_delete_token` commands. The actual token lives in the OS
// keychain via `keyring` on the Rust side, not in localStorage — see
// src-tauri/src/main.rs.
import { writable } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";

function create() {
  const { subscribe, set } = writable<string | null>(null);

  return {
    subscribe,
    /** Load from the keychain. Called once on app startup. */
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
    /** Save to the keychain and update the store. */
    async save(token: string): Promise<void> {
      await invoke("cmd_save_token", { token });
      set(token);
    },
    /** Remove from the keychain. */
    async clear(): Promise<void> {
      await invoke("cmd_delete_token").catch(() => undefined);
      set(null);
    },
  };
}

export const token = create();
