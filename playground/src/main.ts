import { setupCounter } from './counter'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1>logs-sdk playground</h1>
  <button id="counter" type="button"></button>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
