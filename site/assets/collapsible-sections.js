// Make Entity Body Sections Collapsible
(function makeEntitySectionsCollapsible() {
    const entityBody = document.querySelector('.entity-body');
    const article = document.querySelector('article');
    const main = document.querySelector('main.main');
    const target = entityBody || article || main;
    if (!target) return;

    // For regular articles or main without entity-body, wrap H1 and H2 headings in sections first
    if (!entityBody && (article || main)) {
        const topLevelHeadings = Array.from((article || main).querySelectorAll('h1, h2'));
        topLevelHeadings.forEach((heading, index) => {
            // Skip if already in a section
            if (heading.closest('section[id]')) return;

            const section = document.createElement('section');
            section.id = 'section-' + (index + 1);

            // Insert section before heading
            heading.parentNode.insertBefore(section, heading);

            // Move heading and all following content until next h1/h2 into section
            const toMove = [heading];
            let el = heading.nextSibling;
            while (el && el.tagName !== 'H1' && el.tagName !== 'H2') {
                const next = el.nextSibling;
                toMove.push(el);
                el = next;
            }

            toMove.forEach(node => section.appendChild(node));
        });
    }

    // Make top-level sections (with IDs like #overview, #connections) collapsible
    const sections = target.querySelectorAll('section[id]');
    sections.forEach(section => {
        const heading = section.querySelector('h1, h2');
        if (!heading) return;

        // Wrap all content after heading in a container
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'section-content';

        let el = heading.nextSibling;
        const toMove = [];
        while (el) {
            const next = el.nextSibling;
            toMove.push(el);
            el = next;
        }

        toMove.forEach(node => contentWrapper.appendChild(node));
        section.appendChild(contentWrapper);

        // Add click handler to heading
        heading.style.cursor = 'pointer';
        heading.setAttribute('tabindex', '0');
        heading.setAttribute('role', 'button');
        heading.setAttribute('aria-expanded', 'true');

        function toggleSection() {
            const isCollapsed = section.classList.contains('collapsed');
            section.classList.toggle('collapsed');
            heading.setAttribute('aria-expanded', String(isCollapsed));

            // Save state to localStorage
            const sectionId = section.id;
            const collapsedSections = JSON.parse(localStorage.getItem('collapsedSections') || '{}');
            const pageKey = location.pathname;
            if (!collapsedSections[pageKey]) collapsedSections[pageKey] = [];

            if (isCollapsed) {
                collapsedSections[pageKey] = collapsedSections[pageKey].filter(id => id !== sectionId);
            } else {
                if (!collapsedSections[pageKey].includes(sectionId)) {
                    collapsedSections[pageKey].push(sectionId);
                }
            }
            localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
        }

        heading.addEventListener('click', toggleSection);
        heading.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection();
            }
        });

        // Restore collapsed state from localStorage
        const collapsedSections = JSON.parse(localStorage.getItem('collapsedSections') || '{}');
        const pageKey = location.pathname;
        if (collapsedSections[pageKey]?.includes(section.id)) {
            section.classList.add('collapsed');
            heading.setAttribute('aria-expanded', 'false');
        }
    });

    // Make h1-h4 headings within sections also collapsible (for nested headings)
    const levels = ['H1', 'H2', 'H3', 'H4'];
    const headings = [...target.querySelectorAll(levels.join(','))].filter(h => {
        // Skip headings that are already part of the section toggle (direct children)
        return !h.parentElement.classList.contains('entity') &&
            !h.parentElement.matches('section[id]');
    });
    headings.forEach(h => {
        const container = document.createElement('div');
        container.className = 'collapsible-section';
        const content = document.createElement('div');
        content.className = 'collapsible-content';

        let el = h.nextSibling;
        const stopAt = (tag) => levels.indexOf(tag) <= levels.indexOf(h.tagName);
        const toMove = [];

        while (el) {
            if (el.nodeType === 1 && levels.includes(el.tagName) && stopAt(el.tagName)) break;
            const next = el.nextSibling;
            toMove.push(el);
            el = next;
        }

        if (!toMove.length) return;

        h.classList.add('collapsible-toggle');
        h.setAttribute('tabindex', '0');
        h.setAttribute('role', 'button');
        h.setAttribute('aria-expanded', 'true');
        h.parentNode.insertBefore(container, h);
        container.appendChild(h);
        toMove.forEach(n => content.appendChild(n));
        container.appendChild(content);

        function toggle() {
            const open = h.getAttribute('aria-expanded') === 'true';
            h.setAttribute('aria-expanded', String(!open));
            content.style.display = open ? 'none' : 'block';
        }

        h.addEventListener('click', toggle);
        h.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        });
    });
})();
