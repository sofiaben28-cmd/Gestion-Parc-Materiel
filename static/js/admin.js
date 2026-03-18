// ============================================
// DASHBOARD ADMIN - Gestion Matériel IUT GEII
// ============================================
// Inclut: Stats, graphiques, recherche, filtres, tri, toasts
// ============================================

// Variables globales
let materielCourant = null;
let materielIdPopupInfo = null;
let materielIdModifier = null;
let listeUtilisateurs = [];
let listeMateriels = [];
let listeTousUtilisateurs = [];
let chartCategories = null;
let chartEvolution = null;
let utilisateurIdRole = null;

// Variables pour la recherche et les filtres
let rechercheTimeout = null;
let filtreEtat = '';
let filtreCategorie = '';
let rechercheTerm = '';
let triColonne = null;
let triOrdre = 'asc';

// Variables pour les filtres utilisateurs
let rechercheUtilisateurTimeout = null;
let rechercheUtilisateurTerm = '';
let filtreRole = '';
let filtreActif = '';

// Variables pour la pagination
const ITEMS_PAR_PAGE = 10;
let pageActuelle = 1;
let totalPages = 1;
let materielsFiltres = [];

// Variables pour le popup de confirmation
let confirmationCallback = null;

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    VerifierSession();
    ChargerStatistiques();
    ChargerMateriels();
    ChargerUtilisateurs();

    // Navigation sidebar
    InitialiserNavigation();

    // Menu mobile
    InitialiserMenuMobile();

    // Formulaire ajout matériel
    document.getElementById('form-ajout-materiel').addEventListener('submit', AjouterMateriel);

    // Bouton ajouter rapide
    document.getElementById('btn-ajouter-rapide').addEventListener('click', function() {
        ChangerOnglet('gestion');
        document.getElementById('ajout-nom').focus();
    });

    // Bouton déconnexion
    document.getElementById('btn-deconnexion').addEventListener('click', Deconnexion);

    // Popups
    document.getElementById('popup-info-close').addEventListener('click', FermerPopupInfo);
    document.getElementById('popup-etat-close').addEventListener('click', FermerPopupEtat);
    document.getElementById('btn-annuler-etat').addEventListener('click', FermerPopupEtat);

    // Formulaire changement d'état
    document.getElementById('form-changer-etat').addEventListener('submit', ValiderChangementEtat);
    document.getElementById('popup-etat-select').addEventListener('change', GererAffichageChamps);

    // Upload photo
    document.getElementById('btn-ajouter-photo').addEventListener('click', function() {
        document.getElementById('input-photo').click();
    });
    document.getElementById('input-photo').addEventListener('change', AjouterPhoto);

    // Popup détails personne
    document.getElementById('popup-personne-close').addEventListener('click', FermerPopupPersonne);
    document.getElementById('btn-fermer-personne').addEventListener('click', FermerPopupPersonne);

    // Recherche avec debounce
    document.getElementById('search-materiel').addEventListener('input', function(e) {
        clearTimeout(rechercheTimeout);
        rechercheTimeout = setTimeout(() => {
            rechercheTerm = e.target.value.toLowerCase();
            AfficherMaterielsFilters();
        }, 300);
    });

    // Filtres
    document.getElementById('filter-etat').addEventListener('change', function(e) {
        filtreEtat = e.target.value;
        AfficherMaterielsFilters();
    });

    document.getElementById('filter-categorie').addEventListener('change', function(e) {
        filtreCategorie = e.target.value;
        AfficherMaterielsFilters();
    });

    // Tri colonnes
    InitialiserTri();

    // Boutons exports Excel
    document.getElementById('btn-export-inventaire').addEventListener('click', () => {
        window.location.href = '/api/export/inventaire';
    });
    document.getElementById('btn-export-eleves').addEventListener('click', () => {
        window.location.href = '/api/export/eleves';
    });
    document.getElementById('btn-export-enseignants').addEventListener('click', () => {
        window.location.href = '/api/export/enseignants';
    });
    document.getElementById('btn-export-techniciens').addEventListener('click', () => {
        window.location.href = '/api/export/techniciens';
    });
    document.getElementById('btn-export-emprunts').addEventListener('click', () => {
        window.location.href = '/api/export/emprunts';
    });
    document.getElementById('btn-export-maintenances').addEventListener('click', () => {
        window.location.href = '/api/export/maintenances';
    });
    document.getElementById('btn-export-retards').addEventListener('click', () => {
        window.location.href = '/api/export/retards';
    });

    // Bouton export PDF
    document.getElementById('btn-export-rapport-mensuel').addEventListener('click', () => {
        window.location.href = '/api/export/rapport-mensuel';
    });

    // ============================================
    // GESTION UTILISATEURS - Event listeners
    // ============================================

    // Recherche utilisateurs avec debounce
    document.getElementById('search-utilisateur').addEventListener('input', function(e) {
        clearTimeout(rechercheUtilisateurTimeout);
        rechercheUtilisateurTimeout = setTimeout(() => {
            rechercheUtilisateurTerm = e.target.value.toLowerCase();
            AfficherUtilisateursFiltres();
        }, 300);
    });

    // Filtre par rôle
    document.getElementById('filter-role').addEventListener('change', function(e) {
        filtreRole = e.target.value;
        AfficherUtilisateursFiltres();
    });

    // Filtre par statut (actif/inactif)
    document.getElementById('filter-actif').addEventListener('change', function(e) {
        filtreActif = e.target.value;
        AfficherUtilisateursFiltres();
    });

    // Popup modification rôle
    document.getElementById('popup-role-close').addEventListener('click', FermerPopupRole);
    document.getElementById('btn-annuler-role').addEventListener('click', FermerPopupRole);
    document.getElementById('form-modifier-role').addEventListener('submit', ValiderModificationRole);

    // Popup modification matériel
    document.getElementById('popup-modifier-close').addEventListener('click', FermerPopupModifier);
    document.getElementById('btn-annuler-modifier').addEventListener('click', FermerPopupModifier);
    document.getElementById('form-modifier-materiel').addEventListener('submit', ValiderModificationMateriel);

    // Popup confirmation
    document.getElementById('btn-confirmation-annuler').addEventListener('click', FermerPopupConfirmation);
    document.getElementById('btn-confirmation-valider').addEventListener('click', ValiderConfirmation);
});

// ============================================
// NAVIGATION SIDEBAR
// ============================================

/**
 * Initialise la navigation par onglets dans la sidebar
 *
 * Les onglets permettent de naviguer entre:
 * - Dashboard: Statistiques et graphiques
 * - Gestion: Ajout et liste du matériel
 * - Rapports: Exports Excel et PDF
 */
function InitialiserNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');

    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            ChangerOnglet(tabName);
        });
    });
}

/**
 * Change l'onglet actif
 *
 * @param {string} tabName - Nom de l'onglet ('dashboard', 'gestion', 'rapports')
 */
function ChangerOnglet(tabName) {
    // Mettre à jour les liens de navigation
    document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === tabName) {
            link.classList.add('active');
        }
    });

    // Mettre à jour les contenus
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('tab-' + tabName).classList.add('active');

    // Mettre à jour le titre
    const titres = {
        'dashboard': { titre: 'Dashboard', subtitle: 'Vue d\'ensemble de la gestion du matériel' },
        'gestion': { titre: 'Gestion Matériel', subtitle: 'Ajout, modification et suppression du matériel' },
        'rapports': { titre: 'Rapports & Exports', subtitle: 'Exportez vos données en Excel ou PDF' },
        'utilisateurs': { titre: 'Gestion Utilisateurs', subtitle: 'Gérer les comptes utilisateurs' }
    };

    // Charger les utilisateurs si on va sur l'onglet utilisateurs
    if (tabName === 'utilisateurs' && listeTousUtilisateurs.length === 0) {
        ChargerTousUtilisateurs();
    }

    if (titres[tabName]) {
        document.getElementById('page-title').textContent = titres[tabName].titre;
        document.getElementById('page-subtitle').textContent = titres[tabName].subtitle;
    }

    // Fermer le menu mobile si ouvert
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ============================================
// MENU MOBILE
// ============================================

/**
 * Initialise le menu hamburger pour mobile
 */
function InitialiserMenuMobile() {
    const btnMenu = document.getElementById('btn-menu-mobile');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    btnMenu.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });
}

// ============================================
// TRI DES COLONNES
// ============================================

/**
 * Initialise les colonnes triables du tableau
 */
function InitialiserTri() {
    const headers = document.querySelectorAll('th.sortable');

    headers.forEach(header => {
        header.addEventListener('click', function() {
            const colonne = this.dataset.sort;

            // Retirer les classes de tri des autres colonnes
            headers.forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
            });

            // Basculer l'ordre de tri
            if (triColonne === colonne) {
                triOrdre = triOrdre === 'asc' ? 'desc' : 'asc';
            } else {
                triColonne = colonne;
                triOrdre = 'asc';
            }

            // Ajouter la classe de tri
            this.classList.add('sort-' + triOrdre);

            // Réafficher avec le tri
            AfficherMaterielsFilters();
        });
    });
}

// ============================================
// VÉRIFIER SESSION
// ============================================
async function VerifierSession() {
    try {
        const reponse = await fetch('/api/auth/check-session');
        const data = await reponse.json();

        if (!data.connected || data.role !== 'admin') {
            window.location.href = '/';
        } else {
            // Afficher le nom
            document.getElementById('user-nom').textContent = data.nom;

            // Avatar avec initiales
            const initiales = data.nom.split(' ')
                .map(mot => mot.charAt(0).toUpperCase())
                .join('')
                .substring(0, 2);
            document.getElementById('user-avatar').textContent = initiales;
        }
    } catch (erreur) {
        console.error('Erreur vérification session:', erreur);
        window.location.href = '/';
    }
}

// ============================================
// DÉCONNEXION
// ============================================
async function Deconnexion() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (erreur) {
        console.error('Erreur déconnexion:', erreur);
    }
}

// ============================================
// STATISTIQUES ET GRAPHIQUES
// ============================================

/**
 * Charge les statistiques depuis l'API et met à jour le dashboard
 *
 * Cette fonction récupère:
 * - Les compteurs (total, stock, emprunts, maintenance, retards)
 * - Les données pour les graphiques (catégories et évolution)
 */
async function ChargerStatistiques() {
    try {
        const reponse = await fetch('/api/stats/dashboard');
        const stats = await reponse.json();

        // Mettre à jour les cartes stats
        document.getElementById('stat-total').textContent = stats.total_materiel;
        document.getElementById('stat-stock').textContent = stats.en_stock;
        document.getElementById('stat-emprunts').textContent = stats.emprunts_actifs;
        document.getElementById('stat-maintenance').textContent = stats.en_maintenance;
        document.getElementById('stat-retards').textContent = stats.retards;

        // Créer les graphiques
        CreerGraphiqueCategories(stats.categories, stats.par_categorie);
        CreerGraphiqueEvolution(stats.evolution_labels, stats.evolution_data);

    } catch (erreur) {
        console.error('Erreur chargement statistiques:', erreur);
        Toast.error('Erreur lors du chargement des statistiques');
    }
}

/**
 * Crée le graphique camembert des catégories
 *
 * @param {Array} labels - Noms des catégories
 * @param {Array} data - Nombres par catégorie
 */
function CreerGraphiqueCategories(labels, data) {
    const ctx = document.getElementById('chart-categories');
    if (!ctx) return;

    // Détruire le graphique existant si présent
    if (chartCategories) {
        chartCategories.destroy();
    }

    // Couleurs pour le camembert
    const couleurs = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    chartCategories = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: couleurs.slice(0, labels.length),
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

/**
 * Crée le graphique ligne de l'évolution des emprunts
 *
 * @param {Array} labels - Dates (format JJ/MM)
 * @param {Array} data - Nombre d'emprunts par jour
 */
function CreerGraphiqueEvolution(labels, data) {
    const ctx = document.getElementById('chart-evolution');
    if (!ctx) return;

    // Détruire le graphique existant si présent
    if (chartEvolution) {
        chartEvolution.destroy();
    }

    chartEvolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Emprunts',
                data: data,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#3B82F6',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ============================================
// CHARGER MATÉRIELS
// ============================================

/**
 * Charge et affiche tous les matériels dans le tableau de l'admin
 *
 * Cette fonction est le coeur du dashboard admin. Elle:
 * 1. Affiche un skeleton loader pendant le chargement
 * 2. Récupère tous les matériels depuis l'API /api/materiels
 * 3. Stocke les matériels dans la variable globale listeMateriels
 * 4. Remplit le select des catégories pour les filtres
 * 5. Affiche les matériels filtrés/triés
 */
async function ChargerMateriels() {
    // Afficher le skeleton pendant le chargement
    AfficherSkeletonMateriels();

    try {
        const reponse = await fetch('/api/materiels');
        listeMateriels = await reponse.json();

        // Remplir le select des catégories
        RemplirSelectCategories();

        // Afficher les matériels
        AfficherMaterielsFilters();

    } catch (erreur) {
        console.error('Erreur chargement matériels:', erreur);
        Toast.error('Erreur lors du chargement des matériels');
    }
}

/**
 * Remplit le select des catégories avec les valeurs uniques
 */
function RemplirSelectCategories() {
    const select = document.getElementById('filter-categorie');
    const categories = [...new Set(listeMateriels.map(m => m.categorie).filter(c => c))];

    // Garder la première option "Toutes"
    select.innerHTML = '<option value="">Toutes</option>';

    categories.sort().forEach(categorie => {
        const option = document.createElement('option');
        option.value = categorie;
        option.textContent = categorie;
        select.appendChild(option);
    });
}

/**
 * Affiche les matériels avec les filtres et le tri appliqués
 */
function AfficherMaterielsFilters() {
    let materiels = [...listeMateriels];

    // Filtrer par recherche
    if (rechercheTerm) {
        materiels = materiels.filter(m =>
            m.nom.toLowerCase().includes(rechercheTerm) ||
            (m.categorie && m.categorie.toLowerCase().includes(rechercheTerm)) ||
            (m.description && m.description.toLowerCase().includes(rechercheTerm))
        );
    }

    // Filtrer par état
    if (filtreEtat) {
        materiels = materiels.filter(m => m.etat === filtreEtat);
    }

    // Filtrer par catégorie
    if (filtreCategorie) {
        materiels = materiels.filter(m => m.categorie === filtreCategorie);
    }

    // Trier
    if (triColonne) {
        materiels.sort((a, b) => {
            let valA, valB;

            switch (triColonne) {
                case 'nom':
                    valA = a.nom.toLowerCase();
                    valB = b.nom.toLowerCase();
                    break;
                case 'categorie':
                    valA = (a.categorie || '').toLowerCase();
                    valB = (b.categorie || '').toLowerCase();
                    break;
                case 'etat':
                    valA = a.etat;
                    valB = b.etat;
                    break;
                case 'retard':
                    valA = a.jours_retard || 0;
                    valB = b.jours_retard || 0;
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
            if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Stocker les matériels filtrés pour la pagination
    materielsFiltres = materiels;

    // Réinitialiser à la page 1 quand les filtres changent
    pageActuelle = 1;

    // Calculer le nombre total de pages
    totalPages = Math.ceil(materiels.length / ITEMS_PAR_PAGE);
    if (totalPages === 0) totalPages = 1;

    // Afficher la page courante
    AfficherPageMateriels();
}

/**
 * Affiche une page de matériels avec pagination
 */
function AfficherPageMateriels() {
    // Calculer les indices de début et fin
    const debut = (pageActuelle - 1) * ITEMS_PAR_PAGE;
    const fin = debut + ITEMS_PAR_PAGE;

    // Extraire les matériels de la page courante
    const materielsPage = materielsFiltres.slice(debut, fin);

    // Afficher les matériels
    AfficherMateriels(materielsPage);

    // Mettre à jour les contrôles de pagination
    MettreAJourPagination();
}

/**
 * Met à jour les contrôles de pagination
 */
function MettreAJourPagination() {
    const paginationContainer = document.getElementById('pagination-materiel');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    // Afficher le nombre total d'éléments
    const infoTotal = document.createElement('span');
    infoTotal.className = 'pagination-info';
    infoTotal.textContent = `${materielsFiltres.length} élément(s)`;
    paginationContainer.appendChild(infoTotal);

    // Si une seule page, pas besoin d'afficher les boutons
    if (totalPages <= 1) return;

    const paginationBtns = document.createElement('div');
    paginationBtns.className = 'pagination-buttons';

    // Bouton précédent
    const btnPrev = document.createElement('button');
    btnPrev.className = 'btn-pagination';
    btnPrev.innerHTML = '<i data-lucide="chevron-left"></i>';
    btnPrev.disabled = pageActuelle === 1;
    btnPrev.onclick = () => ChangerPage(pageActuelle - 1);
    paginationBtns.appendChild(btnPrev);

    // Numéros de pages
    const debut = Math.max(1, pageActuelle - 2);
    const fin = Math.min(totalPages, pageActuelle + 2);

    if (debut > 1) {
        paginationBtns.appendChild(CreerBoutonPage(1));
        if (debut > 2) {
            const dots = document.createElement('span');
            dots.className = 'pagination-dots';
            dots.textContent = '...';
            paginationBtns.appendChild(dots);
        }
    }

    for (let i = debut; i <= fin; i++) {
        paginationBtns.appendChild(CreerBoutonPage(i));
    }

    if (fin < totalPages) {
        if (fin < totalPages - 1) {
            const dots = document.createElement('span');
            dots.className = 'pagination-dots';
            dots.textContent = '...';
            paginationBtns.appendChild(dots);
        }
        paginationBtns.appendChild(CreerBoutonPage(totalPages));
    }

    // Bouton suivant
    const btnNext = document.createElement('button');
    btnNext.className = 'btn-pagination';
    btnNext.innerHTML = '<i data-lucide="chevron-right"></i>';
    btnNext.disabled = pageActuelle === totalPages;
    btnNext.onclick = () => ChangerPage(pageActuelle + 1);
    paginationBtns.appendChild(btnNext);

    paginationContainer.appendChild(paginationBtns);

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Crée un bouton de numéro de page
 */
function CreerBoutonPage(numero) {
    const btn = document.createElement('button');
    btn.className = 'btn-pagination' + (numero === pageActuelle ? ' active' : '');
    btn.textContent = numero;
    btn.onclick = () => ChangerPage(numero);
    return btn;
}

/**
 * Change la page courante
 */
function ChangerPage(nouvellePage) {
    if (nouvellePage < 1 || nouvellePage > totalPages) return;
    pageActuelle = nouvellePage;
    AfficherPageMateriels();

    // Scroll vers le haut du tableau
    document.getElementById('table-materiel').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Affiche la liste des matériels dans le tableau
 *
 * @param {Array} materiels - Liste des matériels à afficher
 */
function AfficherMateriels(materiels) {
    const tbody = document.querySelector('#table-materiel tbody');
    const msgAucun = document.getElementById('msg-aucun-resultat');

    tbody.innerHTML = '';

    if (materiels.length === 0) {
        msgAucun.style.display = 'block';
        return;
    }

    msgAucun.style.display = 'none';

    materiels.forEach(materiel => {
        const tr = document.createElement('tr');

        // Colonne Info
        const tdInfo = document.createElement('td');
        tdInfo.setAttribute('data-label', 'Info');
        const btnInfo = document.createElement('button');
        btnInfo.className = 'btn-icon';
        btnInfo.innerHTML = '<i data-lucide="info"></i>';
        btnInfo.onclick = () => AfficherPopupInfo(materiel.id);
        tdInfo.appendChild(btnInfo);
        tr.appendChild(tdInfo);

        // Colonne Nom
        const tdNom = document.createElement('td');
        tdNom.setAttribute('data-label', 'Nom');
        tdNom.textContent = materiel.nom;
        tr.appendChild(tdNom);

        // Colonne Catégorie
        const tdCategorie = document.createElement('td');
        tdCategorie.setAttribute('data-label', 'Catégorie');
        tdCategorie.textContent = materiel.categorie || '-';
        tr.appendChild(tdCategorie);

        // Colonne État (badge coloré)
        const tdEtat = document.createElement('td');
        tdEtat.setAttribute('data-label', 'État');
        const badgeEtat = document.createElement('span');
        badgeEtat.className = 'badge badge-' + materiel.etat;
        badgeEtat.textContent = FormaterEtat(materiel.etat);
        tdEtat.appendChild(badgeEtat);
        tr.appendChild(tdEtat);

        // Colonne Personne
        const tdPersonne = document.createElement('td');
        tdPersonne.setAttribute('data-label', 'Personne');
        if (materiel.etat === 'emprunte' && materiel.emprunteur_nom_complet) {
            tdPersonne.textContent = materiel.emprunteur_nom_complet;
            tdPersonne.style.cursor = 'pointer';
            tdPersonne.style.color = 'var(--bleu-principal)';
            tdPersonne.style.textDecoration = 'underline';
            tdPersonne.onclick = () => AfficherDetailsPersonne(materiel.emprunteur_id);
        } else if (materiel.etat === 'en_maintenance' && materiel.technicien_nom_complet) {
            tdPersonne.textContent = materiel.technicien_nom_complet;
            tdPersonne.style.cursor = 'pointer';
            tdPersonne.style.color = 'var(--bleu-principal)';
            tdPersonne.style.textDecoration = 'underline';
            tdPersonne.onclick = () => AfficherDetailsPersonne(materiel.technicien_id);
        } else {
            tdPersonne.textContent = '-';
        }
        tr.appendChild(tdPersonne);

        // Colonne Retard
        const tdRetard = document.createElement('td');
        tdRetard.setAttribute('data-label', 'Retard');
        if (materiel.jours_retard > 0) {
            const badgeRetard = document.createElement('span');
            badgeRetard.className = 'badge badge-danger';
            badgeRetard.textContent = materiel.jours_retard + ' jours';
            tdRetard.appendChild(badgeRetard);
        } else {
            tdRetard.textContent = '-';
        }
        tr.appendChild(tdRetard);

        // Colonne Actions
        const tdActions = document.createElement('td');
        tdActions.setAttribute('data-label', 'Actions');

        // Bouton modifier
        const btnModifier = document.createElement('button');
        btnModifier.className = 'btn-icon';
        btnModifier.title = 'Modifier';
        btnModifier.innerHTML = '<i data-lucide="pencil"></i>';
        btnModifier.onclick = () => AfficherPopupModifier(materiel);
        tdActions.appendChild(btnModifier);

        // Bouton changer état
        const btnEtat = document.createElement('button');
        btnEtat.className = 'btn-icon';
        btnEtat.title = 'Changer état';
        btnEtat.innerHTML = '<i data-lucide="repeat"></i>';
        btnEtat.onclick = () => AfficherPopupEtat(materiel);
        tdActions.appendChild(btnEtat);

        // Bouton supprimer
        const btnSupprimer = document.createElement('button');
        btnSupprimer.className = 'btn-icon btn-danger';
        btnSupprimer.title = 'Supprimer';
        btnSupprimer.innerHTML = '<i data-lucide="trash-2"></i>';
        btnSupprimer.onclick = () => SupprimerMateriel(materiel.id, materiel.nom);
        tdActions.appendChild(btnSupprimer);

        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ============================================
// CHARGER UTILISATEURS (pour les selects)
// ============================================
async function ChargerUtilisateurs() {
    try {
        const reponse = await fetch('/api/users');
        listeUtilisateurs = await reponse.json();
    } catch (erreur) {
        console.error('Erreur chargement utilisateurs:', erreur);
    }
}

// ============================================
// AJOUTER MATÉRIEL
// ============================================

/**
 * Ajoute un nouveau matériel dans la base de données
 *
 * @async
 * @param {Event} e - L'événement de soumission du formulaire
 */
async function AjouterMateriel(e) {
    e.preventDefault();

    const nom = document.getElementById('ajout-nom').value.trim();
    const categorie = document.getElementById('ajout-categorie').value.trim();
    const localisation = document.getElementById('ajout-localisation').value.trim();
    const description = document.getElementById('ajout-description').value.trim();

    try {
        const reponse = await fetch('/api/materiels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nom, categorie, localisation, description })
        });

        if (reponse.ok) {
            Toast.success('Matériel ajouté avec succès !');
            document.getElementById('form-ajout-materiel').reset();
            ChargerMateriels();
            ChargerStatistiques();
        } else {
            const data = await reponse.json();
            Toast.error(data.error || 'Erreur lors de l\'ajout');
        }
    } catch (erreur) {
        console.error('Erreur ajout matériel:', erreur);
        Toast.error('Erreur lors de l\'ajout du matériel');
    }
}

// ============================================
// SUPPRIMER MATÉRIEL
// ============================================
function SupprimerMateriel(id, nom) {
    AfficherPopupConfirmation(
        'Confirmer la suppression',
        `Êtes-vous sûr de vouloir supprimer "${nom}" ?`,
        async () => {
            try {
                const reponse = await fetch(`/api/materiels/${id}`, {
                    method: 'DELETE'
                });

                if (reponse.ok) {
                    Toast.success('Matériel supprimé');
                    ChargerMateriels();
                    ChargerStatistiques();
                } else {
                    Toast.error('Erreur lors de la suppression');
                }
            } catch (erreur) {
                console.error('Erreur suppression:', erreur);
                Toast.error('Erreur lors de la suppression');
            }
        }
    );
}

// ============================================
// POPUP MODIFICATION MATÉRIEL
// ============================================

/**
 * Affiche la popup pour modifier un matériel
 *
 * @param {Object} materiel - L'objet matériel à modifier
 */
function AfficherPopupModifier(materiel) {
    materielIdModifier = materiel.id;

    // Pré-remplir les champs
    document.getElementById('modifier-nom').value = materiel.nom || '';
    document.getElementById('modifier-categorie').value = materiel.categorie || '';
    document.getElementById('modifier-localisation').value = materiel.localisation || '';
    document.getElementById('modifier-description').value = materiel.description || '';

    // Afficher la popup
    document.getElementById('popup-modifier').style.display = 'flex';

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function FermerPopupModifier() {
    document.getElementById('popup-modifier').style.display = 'none';
    materielIdModifier = null;
}

/**
 * Valide et envoie la modification du matériel
 */
async function ValiderModificationMateriel(e) {
    e.preventDefault();

    const nom = document.getElementById('modifier-nom').value.trim();
    const categorie = document.getElementById('modifier-categorie').value.trim();
    const localisation = document.getElementById('modifier-localisation').value.trim();
    const description = document.getElementById('modifier-description').value.trim();

    if (!nom) {
        Toast.warning('Le nom est obligatoire');
        return;
    }

    try {
        const reponse = await fetch(`/api/materiels/${materielIdModifier}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nom, categorie, localisation, description })
        });

        const data = await reponse.json();

        if (reponse.ok) {
            Toast.success(data.message || 'Matériel modifié !');
            FermerPopupModifier();
            ChargerMateriels();
        } else {
            Toast.error(data.error || 'Erreur lors de la modification');
        }
    } catch (erreur) {
        console.error('Erreur modification matériel:', erreur);
        Toast.error('Erreur lors de la modification');
    }
}

// ============================================
// POPUP INFO MATÉRIEL
// ============================================
async function AfficherPopupInfo(materielId) {
    materielIdPopupInfo = materielId;

    try {
        const materiel = listeMateriels.find(m => m.id === materielId);

        if (!materiel) {
            Toast.error('Matériel introuvable');
            return;
        }

        // Remplir les infos
        document.getElementById('info-nom').textContent = materiel.nom || '-';
        document.getElementById('info-categorie').textContent = materiel.categorie || '-';
        document.getElementById('info-localisation').textContent = materiel.localisation || '-';
        document.getElementById('info-description').textContent = materiel.description || '-';
        document.getElementById('info-date-retour').textContent = materiel.date_retour_prevue || '-';
        document.getElementById('info-mouvement').textContent = materiel.date_mouvement || '-';

        // Charger les photos
        ChargerPhotos(materielId);

        // Afficher la popup
        document.getElementById('popup-info').style.display = 'flex';

        // Réinitialiser les icônes
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (erreur) {
        console.error('Erreur chargement infos:', erreur);
        Toast.error('Erreur lors du chargement des informations');
    }
}

function FermerPopupInfo() {
    document.getElementById('popup-info').style.display = 'none';
}

// ============================================
// POPUP DÉTAILS PERSONNE
// ============================================
async function AfficherDetailsPersonne(personneId) {
    try {
        const personne = listeUtilisateurs.find(u => u.id === personneId);

        if (!personne) {
            Toast.error('Personne introuvable');
            return;
        }

        // Remplir les infos
        document.getElementById('personne-nom').textContent = personne.nom_complet;
        document.getElementById('personne-email').textContent = personne.email;
        document.getElementById('personne-role').textContent = personne.role.charAt(0).toUpperCase() + personne.role.slice(1);

        // Afficher la popup
        document.getElementById('popup-personne-details').style.display = 'flex';
    } catch (erreur) {
        console.error('Erreur chargement détails personne:', erreur);
        Toast.error('Erreur lors du chargement des informations');
    }
}

function FermerPopupPersonne() {
    document.getElementById('popup-personne-details').style.display = 'none';
}

// ============================================
// PHOTOS
// ============================================

/**
 * Charge et affiche les photos d'un matériel dans la popup d'information
 *
 * @async
 * @param {number} materielId - L'ID du matériel dont on veut afficher les photos
 */
async function ChargerPhotos(materielId) {
    try {
        const reponse = await fetch(`/api/materiels/${materielId}/photos`);
        const photos = await reponse.json();

        const galerie = document.getElementById('galerie-photos');
        galerie.innerHTML = '';

        if (photos.length === 0) {
            galerie.innerHTML = '<p class="text-muted">Aucune photo</p>';
            return;
        }

        photos.forEach(photo => {
            const divPhoto = document.createElement('div');
            divPhoto.className = 'photo-item';

            const img = document.createElement('img');
            img.src = '/' + photo.chemin_photo;
            img.alt = 'Photo matériel';

            const btnSupprimer = document.createElement('button');
            btnSupprimer.textContent = '×';
            btnSupprimer.className = 'btn-supprimer-photo';
            btnSupprimer.onclick = () => SupprimerPhoto(materielId, photo.id);

            divPhoto.appendChild(img);
            divPhoto.appendChild(btnSupprimer);
            galerie.appendChild(divPhoto);
        });
    } catch (erreur) {
        console.error('Erreur chargement photos:', erreur);
    }
}

async function AjouterPhoto(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;

    const formData = new FormData();
    formData.append('photo', fichier);

    try {
        const reponse = await fetch(`/api/materiels/${materielIdPopupInfo}/photos`, {
            method: 'POST',
            body: formData
        });

        if (reponse.ok) {
            Toast.success('Photo ajoutée !');
            ChargerPhotos(materielIdPopupInfo);
            e.target.value = '';
        } else {
            const data = await reponse.json();
            Toast.error(data.error || 'Erreur lors de l\'ajout de la photo');
        }
    } catch (erreur) {
        console.error('Erreur ajout photo:', erreur);
        Toast.error('Erreur lors de l\'ajout de la photo');
    }
}

async function SupprimerPhoto(materielId, photoId) {
    if (!confirm('Supprimer cette photo ?')) {
        return;
    }

    try {
        const reponse = await fetch(`/api/materiels/${materielId}/photos/${photoId}`, {
            method: 'DELETE'
        });

        if (reponse.ok) {
            Toast.success('Photo supprimée');
            ChargerPhotos(materielId);
        } else {
            Toast.error('Erreur lors de la suppression');
        }
    } catch (erreur) {
        console.error('Erreur suppression photo:', erreur);
        Toast.error('Erreur lors de la suppression');
    }
}

// ============================================
// POPUP CHANGEMENT ÉTAT
// ============================================

/**
 * Affiche la popup pour changer l'état d'un matériel
 *
 * @param {Object} materiel - L'objet matériel à modifier
 */
function AfficherPopupEtat(materiel) {
    materielCourant = materiel;
    document.getElementById('popup-etat-nom-materiel').textContent = materiel.nom;
    document.getElementById('popup-etat-select').value = '';
    document.getElementById('groupe-personne').style.display = 'none';
    document.getElementById('groupe-date').style.display = 'none';
    document.getElementById('popup-etat').style.display = 'flex';
}

function FermerPopupEtat() {
    document.getElementById('popup-etat').style.display = 'none';
    materielCourant = null;
}

function GererAffichageChamps() {
    const nouvelEtat = document.getElementById('popup-etat-select').value;
    const groupePersonne = document.getElementById('groupe-personne');
    const groupeDate = document.getElementById('groupe-date');
    const selectPersonne = document.getElementById('popup-personne');
    const labelPersonne = document.getElementById('label-personne');

    // Réinitialiser
    groupePersonne.style.display = 'none';
    groupeDate.style.display = 'none';
    selectPersonne.innerHTML = '<option value="">-- Choisir --</option>';

    if (nouvelEtat === 'en_stock') {
        selectPersonne.removeAttribute('required');
        return;
    } else if (nouvelEtat === 'emprunte') {
        labelPersonne.textContent = 'Emprunteur *';
        selectPersonne.setAttribute('required', 'required');
        groupePersonne.style.display = 'block';
        groupeDate.style.display = 'block';

        listeUtilisateurs
            .filter(u => u.role === 'eleve' || u.role === 'enseignant')
            .forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.nom_complet + ' (' + user.role + ')';
                selectPersonne.appendChild(option);
            });

    } else if (nouvelEtat === 'en_maintenance') {
        labelPersonne.textContent = 'Technicien *';
        selectPersonne.setAttribute('required', 'required');
        groupePersonne.style.display = 'block';

        listeUtilisateurs
            .filter(u => u.role === 'technicien')
            .forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.nom_complet;
                selectPersonne.appendChild(option);
            });
    }
}

/**
 * Valide et envoie le changement d'état d'un matériel
 *
 * @async
 * @param {Event} e - L'événement de soumission du formulaire
 */
async function ValiderChangementEtat(e) {
    e.preventDefault();

    const nouvelEtat = document.getElementById('popup-etat-select').value;
    const personneId = document.getElementById('popup-personne').value;
    const dateRetourPrevue = document.getElementById('popup-date-retour').value;

    // Validation
    if (nouvelEtat === 'emprunte' && !personneId) {
        Toast.warning('Veuillez sélectionner un emprunteur');
        return;
    }
    if (nouvelEtat === 'en_maintenance' && !personneId) {
        Toast.warning('Veuillez sélectionner un technicien');
        return;
    }

    try {
        const reponse = await fetch(`/api/materiels/${materielCourant.id}/etat`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                etat: nouvelEtat,
                personneId: personneId || null,
                dateRetourPrevue: dateRetourPrevue || null
            })
        });

        if (reponse.ok) {
            Toast.success('État modifié !');
            FermerPopupEtat();
            ChargerMateriels();
            ChargerStatistiques();
        } else {
            const data = await reponse.json();
            Toast.error(data.error || 'Erreur lors de la modification');
        }
    } catch (erreur) {
        console.error('Erreur modification état:', erreur);
        Toast.error('Erreur lors de la modification');
    }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================
function FormaterEtat(etat) {
    if (etat === 'en_stock') return 'En stock';
    if (etat === 'emprunte') return 'Emprunté';
    if (etat === 'en_maintenance') return 'Maintenance';
    return etat;
}

// ============================================
// GESTION DES UTILISATEURS
// ============================================

/**
 * Charge tous les utilisateurs depuis l'API /api/users/all
 *
 * Cette fonction est réservée aux administrateurs.
 * Elle récupère tous les utilisateurs (actifs et inactifs)
 * avec leurs informations complètes.
 */
async function ChargerTousUtilisateurs() {
    try {
        const reponse = await fetch('/api/users/all');

        if (!reponse.ok) {
            const data = await reponse.json();
            Toast.error(data.error || 'Erreur lors du chargement des utilisateurs');
            return;
        }

        listeTousUtilisateurs = await reponse.json();
        AfficherUtilisateursFiltres();

    } catch (erreur) {
        console.error('Erreur chargement utilisateurs:', erreur);
        Toast.error('Erreur lors du chargement des utilisateurs');
    }
}

/**
 * Affiche les utilisateurs avec les filtres appliqués
 */
function AfficherUtilisateursFiltres() {
    let utilisateurs = [...listeTousUtilisateurs];

    // Filtrer par recherche
    if (rechercheUtilisateurTerm) {
        utilisateurs = utilisateurs.filter(u =>
            u.nom_complet.toLowerCase().includes(rechercheUtilisateurTerm) ||
            u.email.toLowerCase().includes(rechercheUtilisateurTerm)
        );
    }

    // Filtrer par rôle
    if (filtreRole) {
        utilisateurs = utilisateurs.filter(u => u.role === filtreRole);
    }

    // Filtrer par statut actif
    if (filtreActif !== '') {
        const actifBool = filtreActif === '1';
        utilisateurs = utilisateurs.filter(u => u.actif === actifBool);
    }

    AfficherUtilisateurs(utilisateurs);
}

/**
 * Affiche la liste des utilisateurs dans le tableau
 *
 * @param {Array} utilisateurs - Liste des utilisateurs à afficher
 */
function AfficherUtilisateurs(utilisateurs) {
    const tbody = document.querySelector('#table-utilisateurs tbody');
    const msgAucun = document.getElementById('msg-aucun-utilisateur');

    tbody.innerHTML = '';

    if (utilisateurs.length === 0) {
        msgAucun.style.display = 'block';
        return;
    }

    msgAucun.style.display = 'none';

    utilisateurs.forEach(user => {
        const tr = document.createElement('tr');

        // Colonne Nom
        const tdNom = document.createElement('td');
        tdNom.setAttribute('data-label', 'Nom');
        tdNom.textContent = user.nom_complet;
        tr.appendChild(tdNom);

        // Colonne Email
        const tdEmail = document.createElement('td');
        tdEmail.setAttribute('data-label', 'Email');
        tdEmail.textContent = user.email;
        tr.appendChild(tdEmail);

        // Colonne Rôle (badge)
        const tdRole = document.createElement('td');
        tdRole.setAttribute('data-label', 'Rôle');
        const badgeRole = document.createElement('span');
        badgeRole.className = 'badge badge-' + user.role;
        badgeRole.textContent = FormaterRole(user.role);
        tdRole.appendChild(badgeRole);
        tr.appendChild(tdRole);

        // Colonne Statut (actif/inactif)
        const tdStatut = document.createElement('td');
        tdStatut.setAttribute('data-label', 'Statut');
        const badgeStatut = document.createElement('span');
        badgeStatut.className = 'badge ' + (user.actif ? 'badge-success' : 'badge-danger');
        badgeStatut.textContent = user.actif ? 'Actif' : 'Inactif';
        tdStatut.appendChild(badgeStatut);
        tr.appendChild(tdStatut);

        // Colonne Email vérifié
        const tdVerifie = document.createElement('td');
        tdVerifie.setAttribute('data-label', 'Email vérifié');
        const badgeVerifie = document.createElement('span');
        badgeVerifie.className = 'badge ' + (user.email_verifie ? 'badge-success' : 'badge-warning');
        badgeVerifie.textContent = user.email_verifie ? 'Oui' : 'Non';
        tdVerifie.appendChild(badgeVerifie);
        tr.appendChild(tdVerifie);

        // Colonne Dernière connexion
        const tdConnexion = document.createElement('td');
        tdConnexion.setAttribute('data-label', 'Dernière connexion');
        tdConnexion.textContent = user.date_derniere_connexion || 'Jamais';
        tr.appendChild(tdConnexion);

        // Colonne Actions
        const tdActions = document.createElement('td');
        tdActions.setAttribute('data-label', 'Actions');

        // Bouton activer/désactiver
        const btnToggle = document.createElement('button');
        btnToggle.className = 'btn-icon ' + (user.actif ? 'btn-warning' : 'btn-success');
        btnToggle.title = user.actif ? 'Désactiver' : 'Activer';
        btnToggle.innerHTML = user.actif ? '<i data-lucide="user-x"></i>' : '<i data-lucide="user-check"></i>';
        btnToggle.onclick = () => BasculerActifUtilisateur(user.id, user.nom_complet, user.actif);
        tdActions.appendChild(btnToggle);

        // Bouton modifier rôle
        const btnRole = document.createElement('button');
        btnRole.className = 'btn-icon';
        btnRole.title = 'Modifier rôle';
        btnRole.innerHTML = '<i data-lucide="shield"></i>';
        btnRole.onclick = () => AfficherPopupRole(user);
        tdActions.appendChild(btnRole);

        // Bouton supprimer
        const btnSupprimer = document.createElement('button');
        btnSupprimer.className = 'btn-icon btn-danger';
        btnSupprimer.title = 'Supprimer';
        btnSupprimer.innerHTML = '<i data-lucide="trash-2"></i>';
        btnSupprimer.onclick = () => SupprimerUtilisateur(user.id, user.nom_complet);
        tdActions.appendChild(btnSupprimer);

        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Formate le rôle pour l'affichage
 */
function FormaterRole(role) {
    const roles = {
        'admin': 'Admin',
        'eleve': 'Élève',
        'enseignant': 'Enseignant',
        'technicien': 'Technicien'
    };
    return roles[role] || role;
}

/**
 * Active ou désactive un utilisateur
 */
async function BasculerActifUtilisateur(id, nom, actifActuel) {
    const action = actifActuel ? 'désactiver' : 'activer';
    if (!confirm(`Voulez-vous ${action} l'utilisateur "${nom}" ?`)) {
        return;
    }

    try {
        const reponse = await fetch(`/api/users/${id}/toggle-actif`, {
            method: 'PATCH'
        });

        const data = await reponse.json();

        if (reponse.ok) {
            Toast.success(data.message);
            ChargerTousUtilisateurs();
        } else {
            Toast.error(data.error || 'Erreur lors de la modification');
        }
    } catch (erreur) {
        console.error('Erreur toggle actif:', erreur);
        Toast.error('Erreur lors de la modification');
    }
}

/**
 * Affiche la popup pour modifier le rôle d'un utilisateur
 */
function AfficherPopupRole(user) {
    utilisateurIdRole = user.id;
    document.getElementById('popup-role-user-name').textContent = user.nom_complet;
    document.getElementById('popup-role-select').value = user.role;
    document.getElementById('popup-role').style.display = 'flex';
}

function FermerPopupRole() {
    document.getElementById('popup-role').style.display = 'none';
    utilisateurIdRole = null;
}

/**
 * Valide et envoie la modification du rôle
 */
async function ValiderModificationRole(e) {
    e.preventDefault();

    const nouveauRole = document.getElementById('popup-role-select').value;

    try {
        const reponse = await fetch(`/api/users/${utilisateurIdRole}/role`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: nouveauRole })
        });

        const data = await reponse.json();

        if (reponse.ok) {
            Toast.success(data.message);
            FermerPopupRole();
            ChargerTousUtilisateurs();
            // Recharger aussi la liste pour les selects
            ChargerUtilisateurs();
        } else {
            Toast.error(data.error || 'Erreur lors de la modification');
        }
    } catch (erreur) {
        console.error('Erreur modification rôle:', erreur);
        Toast.error('Erreur lors de la modification');
    }
}

/**
 * Supprime un utilisateur
 */
function SupprimerUtilisateur(id, nom) {
    AfficherPopupConfirmation(
        'Confirmer la suppression',
        `Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur "${nom}" ? Cette action est irréversible.`,
        async () => {
            try {
                const reponse = await fetch(`/api/users/${id}`, {
                    method: 'DELETE'
                });

                const data = await reponse.json();

                if (reponse.ok) {
                    Toast.success(data.message);
                    ChargerTousUtilisateurs();
                    // Recharger aussi la liste pour les selects
                    ChargerUtilisateurs();
                } else {
                    Toast.error(data.error || 'Erreur lors de la suppression');
                }
            } catch (erreur) {
                console.error('Erreur suppression utilisateur:', erreur);
                Toast.error('Erreur lors de la suppression');
            }
        }
    );
}

// ============================================
// POPUP CONFIRMATION
// ============================================

/**
 * Affiche le popup de confirmation
 *
 * @param {string} titre - Titre du popup
 * @param {string} message - Message de confirmation
 * @param {Function} callback - Fonction à exécuter si confirmé
 */
function AfficherPopupConfirmation(titre, message, callback) {
    document.getElementById('confirmation-titre').textContent = titre;
    document.getElementById('confirmation-message').textContent = message;
    confirmationCallback = callback;
    document.getElementById('popup-confirmation').style.display = 'flex';

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function FermerPopupConfirmation() {
    document.getElementById('popup-confirmation').style.display = 'none';
    confirmationCallback = null;
}

function ValiderConfirmation() {
    if (confirmationCallback) {
        confirmationCallback();
    }
    FermerPopupConfirmation();
}

// ============================================
// SKELETON LOADERS
// ============================================

/**
 * Affiche un skeleton loader dans le tableau des matériels
 */
function AfficherSkeletonMateriels() {
    const tbody = document.querySelector('#table-materiel tbody');
    tbody.innerHTML = '';

    // Créer 5 lignes de skeleton
    for (let i = 0; i < 5; i++) {
        const tr = document.createElement('tr');
        tr.className = 'skeleton-row';

        // Info
        tr.innerHTML += '<td class="skeleton-cell"><div class="skeleton skeleton-btn"></div></td>';
        // Nom
        tr.innerHTML += '<td class="skeleton-cell"><div class="skeleton skeleton-text medium"></div></td>';
        // Catégorie
        tr.innerHTML += '<td class="skeleton-cell"><div class="skeleton skeleton-text short"></div></td>';
        // État
        tr.innerHTML += '<td class="skeleton-cell"><div class="skeleton skeleton-badge"></div></td>';
        // Personne
        tr.innerHTML += '<td class="skeleton-cell"><div class="skeleton skeleton-text short"></div></td>';
        // Retard
        tr.innerHTML += '<td class="skeleton-cell"><div class="skeleton skeleton-text short"></div></td>';
        // Actions
        tr.innerHTML += '<td class="skeleton-cell"><div style="display: flex; gap: 5px;"><div class="skeleton skeleton-btn"></div><div class="skeleton skeleton-btn"></div><div class="skeleton skeleton-btn"></div></div></td>';

        tbody.appendChild(tr);
    }
}
