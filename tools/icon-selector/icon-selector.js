// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  const { actions } = await DA_SDK;

  const searchInput = document.getElementById('searchInput');
  const iconsContainer = document.getElementById('iconsContainer');
  const resultsCount = document.getElementById('resultsCount');
  const loadingIndicator = document.getElementById('loadingIndicator');

  loadingIndicator.style.display = 'none';

  async function loadIconsFromCSS() {
    try {
      const response = await fetch('/styles/icons.css');

      if (!response.ok) {
        throw new Error(`Failed to load CSS: ${response.status} ${response.statusText}`);
      }

      const cssContent = await response.text();

      const iconRegex = /\.icon__([^:]+)::before/g;
      const icons = [...cssContent.matchAll(iconRegex)].map((match) => match[1]);

      return icons.sort();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load icons from CSS:', error);
      throw new Error('Aw shucks! Unable to load icon library.');
    }
  }

  function createIconPreview(iconName) {
    const iconElement = document.createElement('div');
    iconElement.className = 'icon-preview';
    iconElement.innerHTML = `
      <div class="icon-display">
        <i class="icon icon__${iconName}"></i>
      </div>
      <div class="icon-name">${iconName}</div>
      <div class="icon-code">:${iconName}:</div>
    `;

    iconElement.addEventListener('click', () => {
      actions.sendText(`:${iconName}:`);
      actions.closeLibrary();
    });

    return iconElement;
  }

  function displayIcons(icons, filter = '') {
    const filteredIcons = icons.filter((icon) => icon
      .toLowerCase().includes(filter.toLowerCase()));

    iconsContainer.innerHTML = '';

    if (filteredIcons.length === 0) {
      iconsContainer.innerHTML = '<div class="no-results">No icons found matching your search.</div>';
      resultsCount.textContent = '0 results';
      return;
    }

    filteredIcons.forEach((iconName) => {
      iconsContainer.appendChild(createIconPreview(iconName));
    });

    resultsCount.textContent = `${filteredIcons.length} icon${filteredIcons.length !== 1 ? 's' : ''} found`;
  }

  try {
    const icons = await loadIconsFromCSS();
    displayIcons(icons);

    searchInput.addEventListener('input', (event) => {
      displayIcons(icons, event.target.value);
    });

    searchInput.focus();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('Error caught:', error);
    iconsContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">❌</div>
        <div class="error-message">${error.message}</div>
        <button class="retry-button" onclick="location.reload()">Retry</button>
      </div>
    `;
    searchInput.disabled = true;
  }
}());
