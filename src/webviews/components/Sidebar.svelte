<script lang="ts">
  let questions: Array<string> = [];
  let question: string = "";
</script>

<h1>dAppForge Chat</h1>

<form
  on:submit|preventDefault={() => {
    questions = [...questions, question];
    question = "";
  }}
>
  <input type="text" bind:value={question} placeholder="Ask a question" />
  <button type="submit">Ask</button>
</form>

<ul>
  {#each questions as question}
    <li>{question}</li>
  {/each}
</ul>

<style>
  h1 {
    color: #fff;
    font-size: 1.5rem;
    margin: 0;
    padding: 1rem;
    background-color: #333;
  }
</style>
