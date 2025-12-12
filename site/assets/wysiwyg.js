// --- In-place HTML Editing (WYSIWYG) ---
(function () {
    const btnEdit = document.getElementById('btnEditPage');
    const main = document.querySelector('main.main');
    if (!btnEdit || !main) return;
    let originalHtml = '';
    let editor = null;
    let toolbar = null;
    let saveBtn = null;
    let cancelBtn = null;
    let status = null;

    function createToolbar(ed) {
        const bar = document.createElement('div');
        bar.className = 'wysiwyg-toolbar';
        bar.style.marginBottom = '0.5em';
        function btn(label, cmd, arg) {
            const b = document.createElement('button');
            b.type = 'button';
            b.innerHTML = label;
            b.className = 'wysiwyg-btn';
            b.onclick = (e) => {
                e.preventDefault();
                ed.focus();
                document.execCommand(cmd, false, arg);
            };
            return b;
        }

        // Custom button function for headings that creates sections
        function headingBtn(label, tag) {
            const b = document.createElement('button');
            b.type = 'button';
            b.innerHTML = label;
            b.className = 'wysiwyg-btn';
            b.onclick = (e) => {
                e.preventDefault();
                ed.focus();

                // Get the current selection
                const selection = window.getSelection();
                if (!selection.rangeCount) return;

                const range = selection.getRangeAt(0);
                const selectedText = range.toString() || 'New Section';

                // Generate section ID from selected text
                const sectionId = selectedText.trim().toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .substring(0, 50) || 'section-' + Date.now();

                // Create section with heading
                const section = document.createElement('section');
                section.id = sectionId;

                const heading = document.createElement(tag.toLowerCase());
                heading.textContent = selectedText;

                section.appendChild(heading);

                // Add a paragraph for content after the heading
                const content = document.createElement('p');
                content.innerHTML = '<br>'; // Empty paragraph for user to type in
                section.appendChild(content);

                // Insert the section at cursor/selection
                range.deleteContents();

                // Find if we're inside another section and if so, insert after it instead of nesting
                let insertPoint = range.startContainer;
                if (insertPoint.nodeType === Node.TEXT_NODE) {
                    insertPoint = insertPoint.parentNode;
                }

                // Find the closest parent section
                const parentSection = insertPoint.closest('section[id]');

                if (parentSection) {
                    // Insert after the parent section instead of inside it
                    parentSection.parentNode.insertBefore(section, parentSection.nextSibling);
                } else {
                    // No parent section, insert at cursor position
                    range.insertNode(section);
                }

                // Place cursor in the content paragraph
                const newRange = document.createRange();
                newRange.setStart(content, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            };
            return b;
        }

        bar.appendChild(btn('<b>B</b>', 'bold'));
        bar.appendChild(btn('<i>I</i>', 'italic'));
        bar.appendChild(headingBtn('H1', 'H1'));
        bar.appendChild(headingBtn('H2', 'H2'));
        bar.appendChild(btn('• List', 'insertUnorderedList'));
        bar.appendChild(btn('1. List', 'insertOrderedList'));
        bar.appendChild(btn('⎘', 'insertHTML', '<hr>'));
        return bar;
    }

    // Helper function to wrap H1/H2 headings in section tags
    function wrapHeadingsInSections(htmlString) {
        const temp = document.createElement('div');
        temp.innerHTML = htmlString;

        // Find all H1 and H2 elements that aren't already in sections
        const headings = Array.from(temp.querySelectorAll('h1, h2')).filter(h => {
            return !h.closest('section[id]');
        });

        headings.forEach((heading, index) => {
            // Create a section
            const section = document.createElement('section');

            // Generate ID from heading text or use generic ID
            const headingText = heading.textContent.trim().toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 50);
            section.id = headingText || `section-${index + 1}`;

            // Insert section before heading
            heading.parentNode.insertBefore(section, heading);

            // Move heading into section
            section.appendChild(heading);

            // Move all following siblings until next H1/H2 into section
            let nextSibling = section.nextSibling;
            while (nextSibling && nextSibling.tagName !== 'H1' && nextSibling.tagName !== 'H2') {
                const current = nextSibling;
                nextSibling = nextSibling.nextSibling;
                section.appendChild(current);
            }
        });

        return temp.innerHTML;
    }

    function createImageUploadUI(editor) {
        const entityHeader = editor ? editor.querySelector('.entity-header') : document.querySelector('.entity-header');
        const entityAvatar = editor ? editor.querySelector('.entity-avatar img') : document.querySelector('.entity-avatar img');

        if (!entityHeader) return null;

        const uploadUI = document.createElement('div');
        uploadUI.className = 'image-upload-ui';
        uploadUI.style.cssText = 'margin-bottom: 1em; padding: 1em; background: var(--panel); border: 1px solid var(--border); border-radius: 4px;';

        const title = document.createElement('h3');
        title.textContent = 'Page Images';
        title.style.marginTop = '0';
        uploadUI.appendChild(title);

        // Header image upload
        const headerSection = document.createElement('div');
        headerSection.style.marginBottom = '1em';

        const headerLabel = document.createElement('label');
        headerLabel.textContent = 'Header Image: ';
        headerLabel.style.fontWeight = 'bold';

        const headerInput = document.createElement('input');
        headerInput.type = 'file';
        headerInput.accept = 'image/*';
        headerInput.style.marginLeft = '0.5em';

        const headerStatus = document.createElement('span');
        headerStatus.style.marginLeft = '1em';
        headerStatus.style.color = 'var(--meta)';

        headerSection.appendChild(headerLabel);
        headerSection.appendChild(headerInput);
        headerSection.appendChild(headerStatus);

        // Header position controls
        const headerPosSection = document.createElement('div');
        headerPosSection.style.cssText = 'margin-top: 0.5em; margin-left: 1.5em; display: flex; gap: 1em; align-items: center;';

        const headerPosLabel = document.createElement('span');
        headerPosLabel.textContent = 'Position:';
        headerPosLabel.style.fontSize = '0.9em';
        headerPosLabel.style.color = 'var(--meta)';

        const headerPosX = document.createElement('input');
        headerPosX.type = 'range';
        headerPosX.min = '0';
        headerPosX.max = '100';
        headerPosX.value = '50';
        headerPosX.title = 'Horizontal position';
        headerPosX.style.width = '120px';

        const headerPosY = document.createElement('input');
        headerPosY.type = 'range';
        headerPosY.min = '0';
        headerPosY.max = '100';
        headerPosY.value = '50';
        headerPosY.title = 'Vertical position';
        headerPosY.style.width = '120px';

        const headerPosReset = document.createElement('button');
        headerPosReset.textContent = 'Center';
        headerPosReset.type = 'button';
        headerPosReset.className = 'chip';
        headerPosReset.style.fontSize = '0.8em';

        headerPosSection.appendChild(headerPosLabel);
        headerPosSection.appendChild(document.createTextNode('H: '));
        headerPosSection.appendChild(headerPosX);
        headerPosSection.appendChild(document.createTextNode('V: '));
        headerPosSection.appendChild(headerPosY);
        headerPosSection.appendChild(headerPosReset);

        // Get current position from inline style or CSS variable if it exists
        const currentStyle = entityHeader.getAttribute('style') || '';
        let bgPosMatch = currentStyle.match(/--header-position:\s*([0-9]+)%\s+([0-9]+)%/);
        if (!bgPosMatch) {
            bgPosMatch = currentStyle.match(/background-position:\s*([0-9]+)%\s+([0-9]+)%/);
        }
        if (bgPosMatch) {
            headerPosX.value = bgPosMatch[1];
            headerPosY.value = bgPosMatch[2];
        }

        const updateHeaderPosition = () => {
            const x = headerPosX.value;
            const y = headerPosY.value;
            // Store position in CSS variable so the ::before pseudo-element can use it
            entityHeader.style.setProperty('--header-position', `${x}% ${y}%`);
            // Debug: log position updates when developer console is open
            if (window && window.console && window.console.debug) {
                console.debug('header-position set', entityHeader, x + '%', y + '%');
            }
        };
        // Also apply a direct inline fallback to ensure visible elements update
        // in environments where pseudo-element variable usage might not repaint.
        const applyPositionFallback = () => {
            const x = headerPosX.value;
            const y = headerPosY.value;
            try {
                // set on host as a fallback
                entityHeader.style.backgroundPosition = `${x}% ${y}%`;
                // set on landing-hero child if present
                const hero = entityHeader.querySelector('.landing-hero');
                if (hero) {
                    // Always set background-image and background-position directly
                    let headerUrl = '';
                    // Try to get the --header variable from the entityHeader style
                    const styleVal = entityHeader.style.getPropertyValue('--header');
                    if (styleVal) {
                        headerUrl = styleVal.trim();
                    } else {
                        // fallback: try computed style
                        headerUrl = getComputedStyle(entityHeader).getPropertyValue('--header').trim();
                    }
                    if (headerUrl) {
                        hero.style.backgroundImage = headerUrl.startsWith('url') ? headerUrl : `url('${headerUrl}')`;
                    }
                    hero.style.backgroundPosition = `${x}% ${y}%`;
                    // Hide the ::before pseudo-element by adding a class
                    entityHeader.classList.add('no-header-bg');
                } else {
                    entityHeader.classList.remove('no-header-bg');
                }
            } catch (e) {
                // swallow errors silently
            }
        };

        // call fallback whenever sliders change as well
        headerPosX.addEventListener('input', applyPositionFallback);
        headerPosY.addEventListener('input', applyPositionFallback);
        // also call once on init
        applyPositionFallback();

        headerPosX.addEventListener('input', updateHeaderPosition);
        headerPosY.addEventListener('input', updateHeaderPosition);
        headerPosReset.addEventListener('click', () => {
            headerPosX.value = '50';
            headerPosY.value = '50';
            updateHeaderPosition();
        });

        // Apply the current position immediately so the editor preview reflects it
        try {
            updateHeaderPosition();
        } catch (err) {
            console.error('updateHeaderPosition error', err);
        }

        uploadUI.appendChild(headerSection);
        uploadUI.appendChild(headerPosSection);

        // Profile image upload (only if avatar exists)
        if (entityAvatar) {
            const avatarSection = document.createElement('div');

            const avatarLabel = document.createElement('label');
            avatarLabel.textContent = 'Profile Image: ';
            avatarLabel.style.fontWeight = 'bold';

            const avatarInput = document.createElement('input');
            avatarInput.type = 'file';
            avatarInput.accept = 'image/*';
            avatarInput.style.marginLeft = '0.5em';

            const avatarStatus = document.createElement('span');
            avatarStatus.style.marginLeft = '1em';
            avatarStatus.style.color = 'var(--meta)';

            avatarSection.appendChild(avatarLabel);
            avatarSection.appendChild(avatarInput);
            avatarSection.appendChild(avatarStatus);
            uploadUI.appendChild(avatarSection);

            // Avatar position controls
            const avatarPosSection = document.createElement('div');
            avatarPosSection.style.cssText = 'margin-top: 0.5em; margin-left: 1.5em; display: flex; gap: 1em; align-items: center;';

            const avatarPosLabel = document.createElement('span');
            avatarPosLabel.textContent = 'Position:';
            avatarPosLabel.style.fontSize = '0.9em';
            avatarPosLabel.style.color = 'var(--meta)';

            const avatarPosX = document.createElement('input');
            avatarPosX.type = 'range';
            avatarPosX.min = '0';
            avatarPosX.max = '100';
            avatarPosX.value = '50';
            avatarPosX.title = 'Horizontal position';
            avatarPosX.style.width = '120px';

            const avatarPosY = document.createElement('input');
            avatarPosY.type = 'range';
            avatarPosY.min = '0';
            avatarPosY.max = '100';
            avatarPosY.value = '50';
            avatarPosY.title = 'Vertical position';
            avatarPosY.style.width = '120px';

            const avatarPosReset = document.createElement('button');
            avatarPosReset.textContent = 'Center';
            avatarPosReset.type = 'button';
            avatarPosReset.className = 'chip';
            avatarPosReset.style.fontSize = '0.8em';

            avatarPosSection.appendChild(avatarPosLabel);
            avatarPosSection.appendChild(document.createTextNode('H: '));
            avatarPosSection.appendChild(avatarPosX);
            avatarPosSection.appendChild(document.createTextNode('V: '));
            avatarPosSection.appendChild(avatarPosY);
            avatarPosSection.appendChild(avatarPosReset);

            // Get current position from inline style if it exists
            const currentAvatarStyle = entityAvatar.getAttribute('style') || '';
            const objPosMatch = currentAvatarStyle.match(/object-position:\s*(\d+)%\s+(\d+)%/);
            if (objPosMatch) {
                avatarPosX.value = objPosMatch[1];
                avatarPosY.value = objPosMatch[2];
            }

            const updateAvatarPosition = () => {
                const x = avatarPosX.value;
                const y = avatarPosY.value;
                const currentStyle = entityAvatar.getAttribute('style') || '';

                // Update or add object-position to inline style
                let newStyle = currentStyle;
                if (newStyle.includes('object-position:')) {
                    newStyle = newStyle.replace(/object-position:[^;]+;?/, `object-position: ${x}% ${y}%;`);
                } else {
                    newStyle += `object-position: ${x}% ${y};`;
                }

                entityAvatar.setAttribute('style', newStyle.trim());
            };

            avatarPosX.addEventListener('input', updateAvatarPosition);
            avatarPosY.addEventListener('input', updateAvatarPosition);
            avatarPosReset.addEventListener('click', () => {
                avatarPosX.value = '50';
                avatarPosY.value = '50';
                updateAvatarPosition();
            });

            uploadUI.appendChild(avatarPosSection);

            avatarInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                avatarStatus.textContent = 'Uploading...';

                const formData = new FormData();
                formData.append('image', file);
                formData.append('type', 'avatar');

                try {
                    const resp = await fetch('/api/upload-image', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await resp.json();

                    if (data.ok) {
                        avatarStatus.textContent = '✓ Uploaded';
                        avatarStatus.style.color = 'green';
                        entityAvatar.src = data.url;
                        setTimeout(() => { avatarStatus.textContent = ''; }, 3000);
                    } else {
                        avatarStatus.textContent = '✗ ' + (data.error || 'Upload failed');
                        avatarStatus.style.color = 'red';
                    }
                } catch (err) {
                    avatarStatus.textContent = '✗ Upload error';
                    avatarStatus.style.color = 'red';
                }
            });
        }

        headerInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            headerStatus.textContent = 'Uploading...';

            const formData = new FormData();
            formData.append('image', file);
            formData.append('type', 'header');

            try {
                const resp = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData
                });

                const data = await resp.json();

                if (data.ok) {
                    headerStatus.textContent = '✓ Uploaded';
                    headerStatus.style.color = 'green';
                    entityHeader.style.setProperty('--header', `url('${data.url}')`);
                    setTimeout(() => { headerStatus.textContent = ''; }, 3000);
                } else {
                    headerStatus.textContent = '✗ ' + (data.error || 'Upload failed');
                    headerStatus.style.color = 'red';
                }
            } catch (err) {
                headerStatus.textContent = '✗ Upload error';
                headerStatus.style.color = 'red';
            }
        });

        return uploadUI;
    }

    function startEdit() {
        originalHtml = main.innerHTML;
        // Create contenteditable div for WYSIWYG editing
        editor = document.createElement('div');
        editor.className = 'inplace-wysiwyg-editor';
        editor.contentEditable = 'true';
        editor.style.width = '100%';
        editor.style.minHeight = '350px';
        editor.style.border = '1px solid #ccc';
        editor.style.background = '#fff';
        editor.style.padding = '1em';
        editor.style.fontSize = '1.1em';
        editor.innerHTML = originalHtml.trim();

        // Toolbar
        toolbar = createToolbar(editor);

        // Image upload UI - pass editor so it updates the correct elements
        const imageUploadUI = createImageUploadUI(editor);

        // Save/Cancel buttons
        saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'btn-primary';
        cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'btn-secondary';
        status = document.createElement('div');
        status.style.marginTop = '0.5em';
        status.style.display = 'none';
        const btnWrap = document.createElement('div');
        btnWrap.style.marginTop = '1em';
        btnWrap.appendChild(saveBtn);
        btnWrap.appendChild(cancelBtn);
        btnWrap.appendChild(status);

        main.innerHTML = '';
        if (imageUploadUI) main.appendChild(imageUploadUI);
        main.appendChild(toolbar);
        main.appendChild(editor);
        main.appendChild(btnWrap);

        saveBtn.onclick = async function () {
            saveBtn.disabled = true;
            status.textContent = 'Saving...';
            status.style.display = 'block';

            // Wrap H1/H2 headings in sections before saving
            const processedHtml = wrapHeadingsInSections(editor.innerHTML);

            try {
                const resp = await fetch('/api/edit-page', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: window.location.pathname, html: processedHtml })
                });
                if (!resp.ok) {
                    status.textContent = 'Save failed: ' + resp.status + ' ' + resp.statusText;
                    saveBtn.disabled = false;
                    return;
                }
                const data = await resp.json();
                if (data && data.ok) {
                    status.textContent = 'Saved! Reloading...';
                    setTimeout(() => { window.location.reload(); }, 800);
                } else {
                    status.textContent = (data && data.error) || 'Save failed';
                    saveBtn.disabled = false;
                }
            } catch (err) {
                status.textContent = 'Network error: ' + err.message;
                saveBtn.disabled = false;
            }
        };
        cancelBtn.onclick = async function () {
            const confirmed = await showConfirmModal(
                'Discard Changes?',
                'Are you sure you want to discard your changes? This cannot be undone.'
            );
            if (confirmed) {
                main.innerHTML = originalHtml;
            }
        };

        // Add keyboard shortcut: Cmd+Enter to save
        editor.addEventListener('keydown', function (e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!saveBtn.disabled) {
                    saveBtn.click();
                }
            }
        });

        // Add keyboard shortcut: Escape to cancel editing with confirmation
        const escapeHandler = async function (e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                const confirmed = await showConfirmModal(
                    'Discard Changes?',
                    'Are you sure you want to discard your changes? This cannot be undone.'
                );
                if (confirmed) {
                    main.innerHTML = originalHtml;
                    document.removeEventListener('keydown', escapeHandler);
                }
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    btnEdit.addEventListener('click', startEdit);
})();
// --- End In-place HTML Editing ---
