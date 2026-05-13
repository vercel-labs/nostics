<script setup lang="ts">
import { ref } from 'vue'
import { add, divide, factorial, sum } from '@posva/lib-demo'

const addA = ref(2)
const addB = ref(3)
const addResult = ref<number>()

const divA = ref(10)
const divB = ref(3)
const divResult = ref<number>()

const factN = ref(5)
const factResult = ref<number>()

const sumA = ref(1)
const sumB = ref(2)
const sumResult = ref<number>()

function runAdd() {
  addResult.value = add(addA.value, addB.value)
}

function runDivide(a?: number, b?: number) {
  divResult.value = divide(a ?? divA.value, b ?? divB.value)
}

function runFactorial(n?: number) {
  factResult.value = factorial(n ?? factN.value)
}

function runSum(a?: number, b?: number) {
  sumResult.value = sum(a ?? sumA.value, b ?? sumB.value)
}
</script>

<template>
  <h1>nostics playground</h1>

  <section>
    <h2><code>add(a, b)</code></h2>
    <label>a <input v-model.number="addA" type="number" /></label>
    <label>b <input v-model.number="addB" type="number" /></label>
    <button @click="runAdd()">Run</button>
    <span v-if="addResult !== undefined" class="result">= {{ addResult }}</span>
  </section>

  <section>
    <h2><code>divide(a, b)</code></h2>
    <label>a <input v-model.number="divA" type="number" /></label>
    <label>b <input v-model.number="divB" type="number" /></label>
    <button @click="runDivide()">Run</button>
    <button class="warn" @click="runDivide(1, 0)">Divide by zero</button>
    <span v-if="divResult !== undefined" class="result">= {{ divResult }}</span>
  </section>

  <section>
    <h2><code>factorial(n)</code></h2>
    <label>n <input v-model.number="factN" type="number" /></label>
    <button @click="runFactorial()">Run</button>
    <button class="warn" @click="runFactorial(-5)">Negative (-5)</button>
    <button class="warn" @click="runFactorial(200)">Overflow (200)</button>
    <span v-if="factResult !== undefined" class="result">= {{ factResult }}</span>
  </section>

  <section>
    <h2><code>sum(a, b)</code></h2>
    <label>a <input v-model.number="sumA" type="number" /></label>
    <label>b <input v-model.number="sumB" type="number" /></label>
    <button @click="runSum()">Run</button>
    <span v-if="sumResult !== undefined" class="result">= {{ sumResult }}</span>
  </section>
</template>

<style>
#app {
  max-width: 640px;
  margin: 2rem auto;
  padding: 0 1rem;
}

section {
  margin: 1.5rem 0;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

h2 {
  margin-top: 0;
}

label {
  margin-right: 0.5rem;
}

input[type='number'] {
  width: 5rem;
  padding: 0.25rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.result {
  margin-left: 0.5rem;
  font-weight: bold;
  font-family: monospace;
}

small {
  color: var(--color-text-muted);
}
</style>
