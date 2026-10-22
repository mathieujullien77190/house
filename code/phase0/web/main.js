// WebApp minimale : un seul appel, pour vérifier que l'API répond.
const result = document.querySelector('#result')

const callWelcome = async () => {
  result.textContent = '…'
  try {
    const res = await fetch('/welcome')
    const data = await res.json()
    result.textContent = `${res.status} : ${data.message}`
  } catch {
    result.textContent = 'API injoignable'
  }
}

document.querySelector('#retry').addEventListener('click', callWelcome)
callWelcome()
