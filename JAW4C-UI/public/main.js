function toggleDetails(hash) {
    const details = document.getElementById(`details-${hash}`);
    const icon = document.getElementById(`icon-${hash}`);
    
    if (details.classList.contains('open')) {
        details.classList.remove('open');
        icon.textContent = '+';
    } else {
        details.classList.add('open');
        icon.textContent = '-';
    }
}

async function loadFile(hash, file) {
    const contentEl = document.getElementById(`content-${hash}`);
    contentEl.textContent = 'Loading...';

    try {
        const response = await fetch(`/api/file-content?hash=${encodeURIComponent(hash)}&file=${encodeURIComponent(file)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        contentEl.textContent = text;
    } catch (error) {
        contentEl.textContent = `Error loading file: ${error.message}`;
    }
}
