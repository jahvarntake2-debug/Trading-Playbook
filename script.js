const MOVIES = [
  { title: 'Spider-Man: Homecoming', clue: 'A young hero finds his place', image: 'https://upload.wikimedia.org/wikipedia/en/f/f9/Spider-Man_Homecoming_poster.jpg' },
  { title: 'Avengers: Endgame', clue: 'The final stand begins', image: 'https://upload.wikimedia.org/wikipedia/en/0/0d/Avengers_Endgame_poster.jpg' },
  { title: 'Black Panther', clue: 'A kingdom hidden in plain sight', image: 'https://upload.wikimedia.org/wikipedia/en/d/d6/Black_Panther_%28film%29_poster.jpg' },
  { title: 'Wonder Woman', clue: 'A warrior leaves the island', image: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Wonder_Woman_%282017_film%29.jpg' },
  { title: 'Iron Man', clue: 'A suit of high-tech armor', image: 'https://upload.wikimedia.org/wikipedia/en/7/70/Iron_Man_%282008_film%29_poster.jpg' },
  { title: 'The Dark Knight', clue: 'A city faces its greatest test', image: 'https://upload.wikimedia.org/wikipedia/en/8/8a/Dark_Knight.jpg' },
  { title: 'Avengers: Infinity War', clue: 'The universe faces a new threat', image: 'https://upload.wikimedia.org/wikipedia/en/4/4d/Avengers_Infinity_War_poster.jpg' },
  { title: 'Logan', clue: 'One last journey for a legend', image: 'https://upload.wikimedia.org/wikipedia/en/3/37/Logan_2017_poster.jpg' },
  { title: 'Kick-Ass', clue: 'An unlikely hero steps up', image: 'https://upload.wikimedia.org/wikipedia/en/8/8b/Kick-Ass_film_poster.jpg' },
  { title: 'X-Men', clue: 'Mutants unite for survival', image: 'https://upload.wikimedia.org/wikipedia/en/8/81/X-Men_%282000_film%29_poster.jpg' },
  { title: 'Guardians of the Galaxy', clue: 'A band of cosmic misfits', image: 'https://upload.wikimedia.org/wikipedia/en/8/8f/Guardians_of_the_Galaxy_poster.jpg' },
  { title: 'Deadpool', clue: 'The mercenary with a mouth', image: 'https://upload.wikimedia.org/wikipedia/en/4/46/Deadpool_poster.jpg' },
  { title: 'Thor', clue: 'A god learns what makes a hero', image: 'https://upload.wikimedia.org/wikipedia/en/d/d3/Thor_%282011_film%29_poster.jpg' },
  { title: 'Aquaman', clue: 'The ocean has a king', image: 'https://upload.wikimedia.org/wikipedia/en/3/3a/Aquaman_poster.jpg' },
  { title: 'Shazam!', clue: 'Say the word and suit up', image: 'https://upload.wikimedia.org/wikipedia/en/6/6d/Shazam%21_%282019_film%29_poster.jpg' },
  { title: 'The Suicide Squad', clue: 'The mission is deliberately impossible', image: 'https://upload.wikimedia.org/wikipedia/en/0/0d/The_Suicide_Squad_film_poster.jpg' },
  { title: 'Captain America: The First Avenger', clue: 'A soldier becomes a symbol', image: 'https://upload.wikimedia.org/wikipedia/en/3/37/Captain_America_The_First_Avenger_poster.jpg' },
];
const MAX_GUESSES = 5;
let roundIndex = 0;
let currentMovie = MOVIES[roundIndex];
let guesses = [];
let streak = 0;
const movieImage = document.querySelector('#movie-image');
const eventTitle = document.querySelector('#event-title');
const movieInput = document.querySelector('#guess-movie');
const movieOptions = document.querySelector('#movie-options');
const guessButton = document.querySelector('#guess-button');
const newRoundButton = document.querySelector('#new-round');
const feedback = document.querySelector('#feedback');
const hintText = document.querySelector('#hint-text');
const history = document.querySelector('#history');
const attemptCount = document.querySelector('#attempt-count');
const scoreElement = document.querySelector('#score');

function renderRound() { currentMovie = MOVIES[roundIndex]; movieImage.src = currentMovie.image; movieImage.alt = `Image from ${currentMovie.title}`; eventTitle.textContent = currentMovie.clue; }
movieOptions.innerHTML = MOVIES.map((movie) => `<option value="${movie.title}"></option>`).join('');
function renderHistory() {
  if (!guesses.length) return;
  history.innerHTML = guesses.map((guess) => `<li><span class="history-date">${guess.answer}</span><span>${guess.message}</span><span class="history-distance ${guess.correct ? 'correct' : ''}">${guess.correct ? 'FOUND IT' : 'TRY AGAIN'}</span></li>`).join('');
}
function normalizeTitle(value) { return value.toLowerCase().replace(/[^a-z0-9]/g, ''); }
function finish(message, won) { feedback.textContent = message; guessButton.disabled = true; guessButton.style.opacity = '.45'; newRoundButton.hidden = false; hintText.textContent = won ? 'A new frame is ready whenever you are.' : `The answer was ${currentMovie.title}.`; }
function submitGuess() {
  const answer = movieInput.value.trim();
  if (!answer || guesses.length >= MAX_GUESSES) { feedback.textContent = 'Type a movie title before locking it in.'; return; }
  const correct = normalizeTitle(answer) === normalizeTitle(currentMovie.title);
  const message = correct ? 'That is the movie.' : 'Not this one. Study the frame again.';
  guesses.push({ answer, correct, message });
  attemptCount.textContent = `${guesses.length} / ${MAX_GUESSES} GUESSES`;
  streak = correct ? streak + 1 : 0;
  scoreElement.textContent = `STREAK ${String(streak).padStart(2, '0')}`;
  renderHistory();
  if (correct) finish(`Frame unlocked. You found it in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`, true);
  else if (guesses.length === MAX_GUESSES) finish(`The reel ends here. The answer was ${currentMovie.title}.`, false);
  else { feedback.textContent = message; hintText.textContent = 'The clue is in the details.'; movieInput.value = ''; }
}
function resetRound() {
  roundIndex = (roundIndex + 1) % MOVIES.length; renderRound(); guesses = [];
  history.innerHTML = '<li class="empty-history">Your guesses will appear here.</li>';
  attemptCount.textContent = `0 / ${MAX_GUESSES} GUESSES`; scoreElement.textContent = `STREAK ${String(streak).padStart(2, '0')}`; feedback.textContent = 'The frame is waiting.'; hintText.textContent = 'Your first guess sets the scene.'; movieInput.value = ''; guessButton.disabled = false; guessButton.style.opacity = '1'; newRoundButton.hidden = true;
}
guessButton.addEventListener('click', submitGuess);
movieInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') submitGuess(); });
newRoundButton.addEventListener('click', resetRound);
renderRound();