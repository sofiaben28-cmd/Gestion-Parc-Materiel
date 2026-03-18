// ============================================
// GESTION DU THÈME CLAIR/SOMBRE
// ============================================
// Utilise localStorage pour persister le choix
// ============================================

/**
 * Gestionnaire de thème clair/sombre
 *
 * Ce module gère le basculement entre thème clair et sombre.
 * Le choix est sauvegardé dans localStorage pour persister
 * entre les sessions et les pages.
 *
 * Utilisation:
 * 1. Inclure ce script dans la page
 * 2. Ajouter un élément avec id="theme-toggle" ou classe "theme-toggle"
 * 3. Le thème sera automatiquement appliqué au chargement
 */

// ============================================
// CONSTANTES
// ============================================
const CLE_THEME = 'materiel_theme';
const THEME_CLAIR = 'light';
const THEME_SOMBRE = 'dark';

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

/**
 * Récupère le thème actuel depuis localStorage ou les préférences système
 *
 * Priorité:
 * 1. Thème sauvegardé dans localStorage
 * 2. Préférences système (prefers-color-scheme)
 * 3. Par défaut: thème clair
 *
 * @returns {string} 'light' ou 'dark'
 */
function ObtenirTheme() {
    // Vérifier si un thème est sauvegardé
    const themeSauvegarde = localStorage.getItem(CLE_THEME);
    if (themeSauvegarde) {
        return themeSauvegarde;
    }

    // Vérifier les préférences système
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return THEME_SOMBRE;
    }

    // Par défaut: thème clair
    return THEME_CLAIR;
}

/**
 * Applique un thème à la page
 *
 * Cette fonction:
 * 1. Définit l'attribut data-theme sur <html>
 * 2. Sauvegarde le choix dans localStorage
 * 3. Met à jour les éléments UI (toggle, icônes)
 *
 * @param {string} theme - 'light' ou 'dark'
 */
function AppliquerTheme(theme) {
    // Appliquer sur l'élément <html>
    document.documentElement.setAttribute('data-theme', theme);

    // Sauvegarder dans localStorage
    localStorage.setItem(CLE_THEME, theme);

    // Mettre à jour les toggles
    MettreAJourToggles(theme);

    // Mettre à jour les icônes de thème
    MettreAJourIcones(theme);

    // Émettre un événement personnalisé pour que d'autres scripts puissent réagir
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }));
}

/**
 * Bascule entre thème clair et sombre
 *
 * Cette fonction est appelée quand l'utilisateur clique
 * sur le bouton de changement de thème.
 */
function BasculerTheme() {
    const themeActuel = ObtenirTheme();
    const nouveauTheme = themeActuel === THEME_CLAIR ? THEME_SOMBRE : THEME_CLAIR;
    AppliquerTheme(nouveauTheme);
}

/**
 * Met à jour l'état des toggles switch
 *
 * @param {string} theme - 'light' ou 'dark'
 */
function MettreAJourToggles(theme) {
    // Toggle switch dans la sidebar
    const toggleInputs = document.querySelectorAll('.toggle-switch input, #theme-switch');
    toggleInputs.forEach(input => {
        input.checked = theme === THEME_SOMBRE;
    });
}

/**
 * Met à jour les icônes de thème (soleil/lune)
 *
 * @param {string} theme - 'light' ou 'dark'
 */
function MettreAJourIcones(theme) {
    const icones = document.querySelectorAll('.theme-toggle-icon, .auth-theme-toggle');
    icones.forEach(icone => {
        if (theme === THEME_SOMBRE) {
            // Mode sombre: afficher soleil (pour passer en clair)
            icone.innerHTML = '<i data-lucide="sun"></i>';
            icone.setAttribute('title', 'Passer en mode clair');
        } else {
            // Mode clair: afficher lune (pour passer en sombre)
            icone.innerHTML = '<i data-lucide="moon"></i>';
            icone.setAttribute('title', 'Passer en mode sombre');
        }
    });

    // Réinitialiser les icônes Lucide si disponible
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Initialise les écouteurs d'événements pour le thème
 */
function InitialiserEcouteursTheme() {
    // Toggle bouton simple (page auth)
    const toggleBouton = document.querySelector('.auth-theme-toggle');
    if (toggleBouton) {
        toggleBouton.addEventListener('click', BasculerTheme);
    }

    // Toggle switch (sidebar)
    const toggleSwitch = document.querySelector('.toggle-switch input, #theme-switch');
    if (toggleSwitch) {
        toggleSwitch.addEventListener('change', BasculerTheme);
    }

    // Zone cliquable du toggle dans la sidebar
    const toggleZone = document.querySelector('.theme-toggle');
    if (toggleZone) {
        toggleZone.addEventListener('click', function(e) {
            // Ne pas déclencher si on clique sur l'input (déjà géré)
            if (e.target.tagName !== 'INPUT') {
                BasculerTheme();
            }
        });
    }

    // Écouter les changements de préférences système
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            // Seulement si l'utilisateur n'a pas fait de choix explicite
            if (!localStorage.getItem(CLE_THEME)) {
                AppliquerTheme(e.matches ? THEME_SOMBRE : THEME_CLAIR);
            }
        });
    }
}

// ============================================
// INITIALISATION AU CHARGEMENT
// ============================================

/**
 * Initialise le système de thème
 *
 * Appelé automatiquement au chargement du DOM.
 * Peut aussi être appelé manuellement si nécessaire.
 */
function InitialiserTheme() {
    // Appliquer le thème sauvegardé ou par défaut
    const theme = ObtenirTheme();
    AppliquerTheme(theme);

    // Initialiser les écouteurs
    InitialiserEcouteursTheme();
}

// Exécuter dès que le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', InitialiserTheme);
} else {
    // DOM déjà chargé
    InitialiserTheme();
}

// Exposer les fonctions pour une utilisation externe
window.Theme = {
    obtenir: ObtenirTheme,
    appliquer: AppliquerTheme,
    basculer: BasculerTheme,
    initialiser: InitialiserTheme
};
