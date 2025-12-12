// enemy-generator.js
// Handles enemy generation logic for Enemy Generator.html

const form = document.getElementById('enemy-form');
const resultSection = document.getElementById('enemy-result');

// Map PC level to a rough CR for Open5e API (very basic, can be improved)
function levelToCR(level) {
    if (level < 3) return 0.25;
    if (level < 5) return 1;
    if (level < 7) return 2;
    if (level < 9) return 3;
    if (level < 11) return 5;
    if (level < 13) return 7;
    if (level < 15) return 9;
    if (level < 17) return 12;
    if (level < 19) return 15;
    return 18;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultSection.innerHTML = '<em>Generating enemy...</em>';
    const level = parseInt(document.getElementById('enemy-level').value, 10);
    const enemyClass = document.getElementById('enemy-class').value;
    const source = document.getElementById('enemy-source').value;
    const cr = levelToCR(level);

    if (source === 'open5e') {
        // Try to fetch a monster from Open5e API
        try {
            const response = await fetch(`https://api.open5e.com/monsters/?challenge_rating=${cr}`);
            const data = await response.json();
            if (!data.results.length) {
                // Fallback: try homebrew
                resultSection.innerHTML = 'No monsters found for this level in Open5e. Trying homebrew...';
                fetchHomebrew(level, enemyClass);
                return;
            }
            // Pick a random monster
            const monster = data.results[Math.floor(Math.random() * data.results.length)];
            renderEnemy(monster, level, enemyClass);
        } catch (err) {
            resultSection.innerHTML = 'Error fetching enemy data.';
        }
    } else {
        fetchHomebrew(level, enemyClass);
    }
});

async function fetchHomebrew(level, enemyClass) {
    try {
        const response = await fetch('../../assets/homebrew-enemies.json');
        const data = await response.json();
        // Find homebrew enemies matching level and class
        const matches = data.filter(e => e.level === level && e.class === enemyClass);
        if (!matches.length) {
            resultSection.innerHTML = 'No homebrew enemies found for this level/class.';
            return;
        }
        const enemy = matches[Math.floor(Math.random() * matches.length)];
        renderEnemy(enemy, level, enemyClass);
    } catch (err) {
        resultSection.innerHTML = 'Error loading homebrew enemies.';
    }
}

function renderEnemy(monster, level, enemyClass) {
    // Display monster info, and note the chosen class/level for homebrew flavor
    resultSection.innerHTML = `
    <h2>${monster.name} (Level ${level} ${capitalize(enemyClass)})</h2>
    <p><strong>Type:</strong> ${monster.type} | <strong>CR:</strong> ${monster.challenge_rating}</p>
    <p><strong>HP:</strong> ${monster.hit_points} | <strong>AC:</strong> ${monster.armor_class}</p>
    <p><strong>Alignment:</strong> ${monster.alignment}</p>
    <p><strong>Abilities:</strong> STR ${monster.strength}, DEX ${monster.dexterity}, CON ${monster.constitution}, INT ${monster.intelligence}, WIS ${monster.wisdom}, CHA ${monster.charisma}</p>
    <p><strong>Actions:</strong></p>
    <ul>${monster.actions ? monster.actions.map(a => `<li>${a.name}: ${a.desc}</li>`).join('') : '<li>None listed</li>'}</ul>
    <p style="font-style:italic;">(Flavor as a level ${level} ${capitalize(enemyClass)} for your campaign!)</p>
  `;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
