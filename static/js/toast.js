// ============================================
// SYSTÈME DE NOTIFICATIONS TOAST
// ============================================
// Remplace les alert() par des notifications élégantes
// ============================================

/**
 * Gestionnaire de notifications Toast
 *
 * Ce module fournit des notifications non-bloquantes
 * qui apparaissent en haut à droite de l'écran.
 *
 * Types disponibles:
 * - success: Confirmation d'action réussie (vert)
 * - error: Erreur ou échec (rouge)
 * - warning: Avertissement (orange)
 * - info: Information neutre (bleu)
 *
 * Utilisation:
 * Toast.success('Matériel ajouté !');
 * Toast.error('Erreur lors de la suppression');
 * Toast.warning('Attention: retard de 3 jours');
 * Toast.info('5 éléments chargés');
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG_TOAST = {
    duree: 4000,        // Durée d'affichage en ms (4 secondes)
    maxToasts: 5,       // Nombre max de toasts affichés
    position: 'top-right' // Position (top-right, top-left, bottom-right, bottom-left)
};

// Icônes SVG pour chaque type de toast
const ICONES_TOAST = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
};

// Titres par défaut pour chaque type
const TITRES_TOAST = {
    success: 'Succès',
    error: 'Erreur',
    warning: 'Attention',
    info: 'Information'
};

// ============================================
// CRÉATION DU CONTAINER
// ============================================

/**
 * Crée ou récupère le container des toasts
 *
 * Le container est un élément fixe en position absolue
 * où tous les toasts seront ajoutés.
 *
 * @returns {HTMLElement} Le container des toasts
 */
function ObtenirContainerToast() {
    let container = document.getElementById('toast-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    return container;
}

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

/**
 * Affiche une notification toast
 *
 * Cette fonction crée et affiche un toast avec les paramètres fournis.
 * Le toast disparaît automatiquement après la durée configurée.
 *
 * @param {Object} options - Options du toast
 * @param {string} options.type - Type: 'success', 'error', 'warning', 'info'
 * @param {string} options.titre - Titre du toast (optionnel)
 * @param {string} options.message - Message à afficher
 * @param {number} options.duree - Durée en ms (optionnel)
 * @returns {HTMLElement} L'élément toast créé
 */
function AfficherToast(options) {
    const container = ObtenirContainerToast();

    // Options par défaut
    const type = options.type || 'info';
    const titre = options.titre || TITRES_TOAST[type];
    const message = options.message || '';
    const duree = options.duree || CONFIG_TOAST.duree;

    // Limiter le nombre de toasts
    const toasts = container.querySelectorAll('.toast');
    if (toasts.length >= CONFIG_TOAST.maxToasts) {
        // Supprimer le plus ancien
        SupprimerToast(toasts[0]);
    }

    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <div class="toast-icon">
            ${ICONES_TOAST[type]}
        </div>
        <div class="toast-content">
            <div class="toast-title">${titre}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Fermer">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    // Ajouter au container
    container.appendChild(toast);

    // Écouteur pour fermer manuellement
    const btnClose = toast.querySelector('.toast-close');
    btnClose.addEventListener('click', () => SupprimerToast(toast));

    // Auto-suppression après la durée
    const timeoutId = setTimeout(() => {
        SupprimerToast(toast);
    }, duree);

    // Stocker le timeout pour pouvoir l'annuler si fermeture manuelle
    toast.dataset.timeoutId = timeoutId;

    return toast;
}

/**
 * Supprime un toast avec animation
 *
 * @param {HTMLElement} toast - L'élément toast à supprimer
 */
function SupprimerToast(toast) {
    if (!toast || toast.classList.contains('toast-exit')) return;

    // Annuler le timeout si existant
    const timeoutId = toast.dataset.timeoutId;
    if (timeoutId) {
        clearTimeout(parseInt(timeoutId));
    }

    // Ajouter classe d'animation de sortie
    toast.classList.add('toast-exit');

    // Supprimer après l'animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300); // Durée de l'animation
}

/**
 * Supprime tous les toasts affichés
 */
function SupprimerTousLesToasts() {
    const container = document.getElementById('toast-container');
    if (container) {
        const toasts = container.querySelectorAll('.toast');
        toasts.forEach(toast => SupprimerToast(toast));
    }
}

// ============================================
// FONCTIONS RACCOURCIS
// ============================================

/**
 * Affiche un toast de succès
 *
 * @param {string} message - Message à afficher
 * @param {string} titre - Titre (optionnel)
 * @example Toast.success('Matériel ajouté avec succès !');
 */
function ToastSuccess(message, titre = null) {
    return AfficherToast({
        type: 'success',
        titre: titre,
        message: message
    });
}

/**
 * Affiche un toast d'erreur
 *
 * @param {string} message - Message à afficher
 * @param {string} titre - Titre (optionnel)
 * @example Toast.error('Erreur lors de la suppression');
 */
function ToastError(message, titre = null) {
    return AfficherToast({
        type: 'error',
        titre: titre,
        message: message
    });
}

/**
 * Affiche un toast d'avertissement
 *
 * @param {string} message - Message à afficher
 * @param {string} titre - Titre (optionnel)
 * @example Toast.warning('Ce matériel est en retard de 5 jours');
 */
function ToastWarning(message, titre = null) {
    return AfficherToast({
        type: 'warning',
        titre: titre,
        message: message
    });
}

/**
 * Affiche un toast d'information
 *
 * @param {string} message - Message à afficher
 * @param {string} titre - Titre (optionnel)
 * @example Toast.info('10 éléments chargés');
 */
function ToastInfo(message, titre = null) {
    return AfficherToast({
        type: 'info',
        titre: titre,
        message: message
    });
}

// ============================================
// API PUBLIQUE
// ============================================

/**
 * Objet Toast exposé globalement
 *
 * Utilisation:
 * - Toast.success('Message')
 * - Toast.error('Message')
 * - Toast.warning('Message')
 * - Toast.info('Message')
 * - Toast.show({ type, titre, message, duree })
 * - Toast.clearAll()
 */
window.Toast = {
    success: ToastSuccess,
    error: ToastError,
    warning: ToastWarning,
    info: ToastInfo,
    show: AfficherToast,
    clearAll: SupprimerTousLesToasts,

    // Configuration
    config: CONFIG_TOAST
};

// ============================================
// INITIALISATION
// ============================================

// Créer le container au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ObtenirContainerToast);
} else {
    ObtenirContainerToast();
}
