

export const GlobalStyles = () => (
  <style>{`
    :root {
      --font-main: 'Outfit', sans-serif;
      
      /* Default to Dark (Reference Design) */
      --bg-dark: #000000;
      --surface-dark: #121212;
      --surface-highlight-dark: #1E1E1E;
      --text-main-dark: #FFFFFF;
      --text-sec-dark: #A1A1AA;
      --accent-color: #1DB954; /* Spotify/Shazam Green */
      
      /* Light Theme (Inverted) */
      --bg-light: #FFFFFF;
      --surface-light: #F4F4F5;
      --surface-highlight-light: #E4E4E7;
      --text-main-light: #000000;
      --text-sec-light: #52525B;

      /* Initial Global Variables (Dark Default) */
      --surface-highlight: var(--surface-highlight-dark);
    }

    body {
      font-family: var(--font-main);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .theme-dark {
      background-color: var(--bg-dark);
      color: var(--text-main-dark);
      --bg: var(--bg-dark);
      --surface: var(--surface-dark);
      --highlight: var(--surface-highlight-dark);
      --surface-highlight: var(--surface-highlight-dark);
      --text: var(--text-main-dark);
      --text-sec: var(--text-sec-dark);
      --accent: var(--accent-color);
      --ring-color: #333333;
      
      /* New: Button Background for Dark Mode (Lighter than surface) */
      --btn-bg: #1E1E1E; 
    }

    .theme-light {
      background-color: var(--bg-light);
      color: var(--text-main-light);
      --bg: var(--bg-light);
      --surface: var(--surface-light);
      --highlight: var(--surface-highlight-light);
      --surface-highlight: var(--surface-highlight-light);
      --text: var(--text-main-light);
      --text-sec: var(--text-sec-light);
      --accent: #6366F1;
      --ring-color: #E5E7EB;

      /* New: Button Background for Light Mode (White) */
      --btn-bg: #FFFFFF;
    }

    /* Scrollbar hiding */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);
