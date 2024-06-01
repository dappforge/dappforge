<script lang="ts">
  import { onMount } from "svelte";
  import type { User } from "../types";

  let loading = true;
  let user: User | null = null;
  let vscode = tsvscode;

  onMount(async () => {
    window.addEventListener("message", async (event) => {
      const message = event.data;
      switch (message.type) {
        case "token":
          const tokens = JSON.parse(message.value);
          if (tokens.userId && tokens.userId !== "") {
            const response = await fetch(
              `${apiBaseUrl}/user/${tokens.userId}`,
              {
                headers: {
                  authorization: `Basic ${tokens.basicAuthToken}`,
                },
              }
            );
            const data = await response.json();
            user = data;
          }
          loading = false;
          tsvscode.postMessage({ type: "logged-in-out", value: user !== null });
      }
    });

    tsvscode.postMessage({ type: "get-token", value: undefined });
  });
</script>

<h1>dAppForge</h1>

{#if loading}
  <div>loading...</div>
{:else if user}
  <div class="name">
    {user.name}
  </div>
  <div class="token-count">
    Tokens: {user.tokenCount}
  </div>
  <button
    on:click={() => {
      user = null;
      vscode.postMessage({ type: "logout", value: undefined });
    }}>logout</button
  >
{:else}
  <button
    on:click={() => {
      vscode.postMessage({ type: "authenticate", value: undefined });
    }}>login with GitHub</button
  >
{/if}

<style>
  h1 {
    color: #fff;
    font-size: 1.5rem;
    margin: 0;
    padding: 1rem;
    background-color: #333;
    text-align: center;
  }
</style>
