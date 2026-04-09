import { add, divide, factorial, sum } from 'playground-lib'

export function setupCounter(element: HTMLButtonElement): void {
  let counter = 0
  function setCounter(count: number): void {
    counter = count
    element.innerHTML = `Count is ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)

  // eslint-disable-next-line no-console
  console.log('add(2, 3) =', add(2, 3))
  // eslint-disable-next-line no-console
  console.log('divide(10, 3) =', divide(10, 3))
  // eslint-disable-next-line no-console
  console.log('divide(1, 0) =', divide(1, 0))
  // eslint-disable-next-line no-console
  console.log('factorial(5) =', factorial(5))
  // eslint-disable-next-line no-console
  console.log('sum(1, 2) =', sum(1, 2))
}
