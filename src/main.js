// 1. Define the HTML structure with a button inside a template literal
const layoutHTML = `
  <main style="font-family: sans-serif; text-align: center; margin-top: 20px;">
      <h1>Talk is under maintanece</h1>
    <p>We @developers are sorry for the inconvinience we hope that it works soon till then you can play our dino game if you want</p>
    <p>Click the button below to load and play the dino game.</p>
    
    <!-- This button will trigger the game loading function -->
    <button id="launch-btn" style="
      padding: 12px 24px; 
      font-size: 16px; 
      font-weight: bold; 
      color: white; 
      background-color: #238636; 
      border: none; 
      border-radius: 6px; 
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      Activate Dino Game
    </button>

    <!-- A container where the iframe will be inserted later -->
    <div id="game-container" style="margin-top: 20px;"></div>
  </main>
`;

// 2. Inject the initial button layout into the page
document.body.innerHTML = layoutHTML;

// 3. Find the button and container we just created
const launchButton = document.getElementById('launch-btn');
const gameContainer = document.getElementById('game-container');

// 4. Listen for the button click event
launchButton.addEventListener('click', function() {
  // Check if the iframe already exists to prevent duplicate loading
  if (document.getElementById('dino-frame')) return;

  // Create the iframe element
  const dinoIframe = document.createElement('iframe');
  dinoIframe.id = 'dino-frame';
  dinoIframe.src = 'dino.html';

  // Style the iframe
  dinoIframe.style.width = '90%';
  dinoIframe.style.height = '500px';
  dinoIframe.style.border = '2px solid #333';
  dinoIframe.style.borderRadius = '8px';
  dinoIframe.style.display = 'block';
  dinoIframe.style.margin = '0 auto';

  // Insert the iframe into our game container
  gameContainer.appendChild(dinoIframe);

  // Optional: Hide or change the button text after launching
  launchButton.textContent = "Game Loaded!";
  launchButton.style.backgroundColor = "#555";
  launchButton.style.cursor = "default";
});
