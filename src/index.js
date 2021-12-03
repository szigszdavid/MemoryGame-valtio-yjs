import * as Y from "yjs";
import { proxy, subscribe } from 'valtio';
import { bindProxyAndYMap } from "valtio-yjs";
import { WebsocketProvider } from 'y-websocket'

// Application (game) state and its functions
const ydoc = new Y.Doc();
const ymap = ydoc.getMap("memorygame");
const wsProvider = new WebsocketProvider('wss://demos.yjs.dev', 'memorygame-1', ydoc)
console.log(wsProvider);
wsProvider.on('status', event => {
  console.log(event.status) // logs "connected" or "disconnected"
})

const state = proxy({});
subscribe(state, () => {
  render();
  console.log("Meghívva " + ydoc.clientID);
  console.log(state.gamers);
  if(!state.gamers.includes(ydoc.clientID))
  {
    state.gamers.push(ydoc.clientID)
    state.gamersPoints.push(0)
    console.log(state.gamers);
  }
  console.log("Currentplayer: " + state.currentPlayer);
  console.log("CurrentIndex: " + state.currentIndex); 
  console.log("Player points: " + state.gamersPoints[0] + " " + state.gamersPoints[1]);
});

state.gamers = []
state.gamersPoints = []
state.colors = ["Kék","Piros","Zöld", "Sárga", "Lila", "Narancs"]

bindProxyAndYMap(state, ymap);

function initState() {
   
}

let board = []
let gameState = 0 // 0, 1, 2

function init() {
  board = []
  gameState = 0
}
function initBoard(n, m) {
  const numbers = Array(n * m / 2).fill(0).map((e, i) => i + 1)
  const values = [...numbers, ...numbers].sort((a, b) => Math.random() < 0.5 ? 1 : -1)
  board = Array(n).fill(0).map(() => Array(m).fill(0).map(() => ({
    value: values.shift(),
    flipped: false,
    solved: false,
  })))
  gameState = 1
  state.board = board
  state.gameState = gameState
  state.player = ydoc.clientID
  console.log("Boardok: " + board[0][0].value + " " + state.board[0][0].value);
  console.log("Ez a játékos vagyok: " + state.player);

  state.gamers = []
  state.gamersPoints = []
  state.gamersPoints.push(0)
  if(!state.gamers.includes(ydoc.clientID))
  {
    state.gamers.push(ydoc.clientID)
    state.gamersPoints.push(0)
    console.log(state.gamers);
  }
  state.currentPlayer = state.gamers[0]
  state.currentIndex = 0
}
function selectCard(i, j) {
  const flipped = flippedCards()
  if (isFlipped(i, j) || isSolved(i, j) || flipped.length === 2) {
    return
  }
  // flip over
  //board[i][j].flipped = true
  state.board[i][j].flipped = true
  flipped.push(state.board[i][j])
  // check cards
  if (flipped.length === 2 && flipped[0].value === flipped[1].value) {
    flipped.forEach(card => {
      card.solved = true
      card.flipped = false
    })
    state.gamersPoints[state.currentIndex]++
    console.log("Idáig eljut");
  }
  // check win
  if (isWin()) {
    gameState = 2
    state.gameState = 2
  }
}
function isFlipped(i, j) {
  return state.board[i][j].flipped
}
function isSolved(i, j) {
  return state.board[i][j].solved
}
function turnBack() {
  //board.forEach(row => row.forEach(card => card.flipped = false))
  state.board.forEach(row => row.forEach(card => card.flipped = false))
}
function isWin() {
  return state.board.every(row => row.every(card => card.solved))
}
function flippedCards() {
  return state.board.flatMap(row => row.filter(card => card.flipped))
}
function countSolved() {
  return state.board.flatMap(row => row.filter(card => card.solved)).length
}

const form = document.querySelector('form')
const button = form.querySelector('button')
const boardDiv = document.querySelector('#board')
const statusDiv = document.querySelector('#status')

function xyCoord(card) {
  const td = card.closest('td')
  const x = td.cellIndex
  const tr = td.parentNode
  const y = tr.sectionRowIndex
  return { x, y }
}

button.addEventListener('click', onGenerate)
function onGenerate(e) {
  e.preventDefault()
  const n = form.querySelector('#n').valueAsNumber
  const m = form.querySelector('#m').valueAsNumber
  if (n * m % 2 !== 0) {
    return
  }
  initBoard(n, m)
  render()
}

boardDiv.addEventListener('click', onSelectCard)
function onSelectCard(e) {
  if(state.currentPlayer != ydoc.clientID)
  {
    return;
  }
  const card = e.target.closest('.card')
  if (boardDiv.contains(card)) {
    if (flippedCards().length === 2) {
      return
    }
    const {x, y} = xyCoord(card)
    selectCard(y, x)
    render()
    if (flippedCards().length === 2) {
      setTimeout(turnBackAndRender, 1000)

      if (state.currentIndex + 1 < state.gamers.length) {
        state.currentIndex++
           
      }
      else
      {
        state.currentIndex = 0
      }

      state.currentPlayer = state.gamers[state.currentIndex]
    }
}

}
function turnBackAndRender() {
  turnBack()
  render()
}

function render() {
  renderBoard(state.board)
  renderStatus(countSolved(), state.gameState)
}

function renderBoard(board) {
  boardDiv.innerHTML = `
    <table>
      ${board.map(row => `
        <tr>
          ${row.map(card => `
            <td>
              <div class="card ${card.flipped || card.solved ? 'flipped' : ''} ${card.solved ? 'solved' : ''}">
                <div class="front">${card.value}</div>
                <div class="back"></div>
              </div>
            </td>
          `).join('')}
        </tr>
      `).join('')}
    </table>`
}

function renderStatus(solved, gameState) {
  statusDiv.innerHTML = `
    <p>Your points: ${state.gamersPoints[state.gamers.indexOf(ydoc.clientID)]}</p>
    <p>Enemy points: ${state.gamersPoints[state.gamers.indexOf(ydoc.clientID) + 1 == 2 ? 0 : 1]}</p>
    <p>Game state: ${state.gameState == 2 ? "Vége a játéknak" : "Megy a játék"}</p>
    <p style="display:${state.gameState == 2 ? "block" : "none"};color:${state.gamers[state.gamersPoints.indexOf(Math.max(...state.gamersPoints))] == ydoc.clientID ? "green" : "red"}">${state.gamers[state.gamersPoints.indexOf(Math.max(...state.gamersPoints))] == ydoc.clientID ? "You won" : "You lost"}</p>
    <p>Aktuális játékos : </p><p style="color: ${state.currentPlayer == ydoc.clientID ? "green" : "red"}">${state.currentPlayer == ydoc.clientID ? "Te vagy az aktuális játékos" : "A másik játékos az aktuális játékos"}</p>
  `
}
initState()