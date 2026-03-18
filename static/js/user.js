// ============================================
// DASHBOARD USER - Gestion Matériel IUT GEII
// ============================================
// Dashboard pour élèves et enseignants
// Inclut navigation sidebar, catalogue, toasts
// ============================================

// Variables globales
let listeMaterielsCatalogue = [];
let filtreCategorieCatalogue = '';
let rechercheCatalogue = '';
let rechercheTimeout = null;

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    VerifierSession();
    ChargerEmpruntsEnCours();
    ChargerHistorique();
    ChargerRetards();

    // Navigation sidebar
    InitialiserNavigation();

    // Menu mobile
    InitialiserMenuMobile();

    // Bouton déconnexion
    document.getElementById('btn-deconnexion').addEventListener('click', Deconnexion);

    // Catalogue - Recherche avec debounce
    const searchInput = document.getElementById('search-catalogue');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(rechercheTimeout);
            rechercheTimeout = setTimeout(() => {
                rechercheCatalogue = e.target.value.toLowerCase();
                AfficherCatalogueFiltre();
            }, 300);
        });
    }

    // Catalogue - Filtre catégorie
    const filterCategorie = document.getElementById('filter-categorie');
    if (filterCategorie) {
        filterCategorie.addEventListener('change', function(e) {
            filtreCategorieCatalogue = e.target.value;
            AfficherCatalogueFiltre();
        });
    }
});

// ============================================
// NAVIGATION SIDEBAR
// ============================================

/**
 * Initialise la navigation par onglets dans la sidebar
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
 * @param {string} tabName - Nom de l'onglet ('emprunts', 'catalogue')
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
        'emprunts': { titre: 'Mes Emprunts', subtitle: 'Gérez vos emprunts de matériel' },
        'catalogue': { titre: 'Catalogue', subtitle: 'Consultez le matériel disponible' }
    };

    if (titres[tabName]) {
        document.getElementById('page-title').textContent = titres[tabName].titre;
        document.getElementById('page-subtitle').textContent = titres[tabName].subtitle;
    }

    // Charger le catalogue si c'est l'onglet sélectionné
    if (tabName === 'catalogue' && listeMaterielsCatalogue.length === 0) {
        ChargerCatalogue();
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

    if (btnMenu && sidebar && overlay) {
        btnMenu.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
}

// ============================================
// VÉRIFIER SESSION
// ============================================
async function VerifierSession() {
    try {
        const reponse = await fetch('/api/auth/check-session');
        const data = await reponse.json();

        if (!data.connected) {
            window.location.href = '/';
        } else if (data.role === 'admin') {
            window.location.href = '/dashboard-admin';
        } else if (data.role === 'technicien') {
            window.location.href = '/dashboard-technicien';
        } else {
            // Afficher le nom
            document.getElementById('user-nom').textContent = data.nom;

            // Avatar avec initiales
            const initiales = data.nom.split(' ')
                .map(mot => mot.charAt(0).toUpperCase())
                .join('')
                .substring(0, 2);
            document.getElementById('user-avatar').textContent = initiales;

            // Rôle affiché
            const roleAffiche = data.role === 'eleve' ? 'Étudiant' : 'Enseignant';
            document.getElementById('user-role').textContent = roleAffiche;
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
// CHARGER EMPRUNTS EN COURS
// ============================================

/**
 * Charge et affiche les emprunts en cours de l'utilisateur connecté
 *
 * Cette fonction récupère tous les emprunts actifs de l'utilisateur
 * et les affiche dans un tableau avec des indicateurs visuels.
 *
 * @async
 */
async function ChargerEmpruntsEnCours() {
    try {
        const reponse = await fetch('/api/mes-emprunts/en-cours');
        const emprunts = await reponse.json();

        const tbody = document.querySelector('#table-emprunts-cours tbody');
        const msgAucun = document.getElementById('msg-aucun-emprunt');

        tbody.innerHTML = '';

        if (emprunts.length === 0) {
            msgAucun.style.display = 'block';
            return;
        }

        msgAucun.style.display = 'none';

        emprunts.forEach(emprunt => {
            const tr = document.createElement('tr');

            // Matériel
            const tdMateriel = document.createElement('td');
            tdMateriel.setAttribute('data-label', 'Matériel');
            tdMateriel.textContent = emprunt.materiel_nom;
            tr.appendChild(tdMateriel);

            // Catégorie
            const tdCategorie = document.createElement('td');
            tdCategorie.setAttribute('data-label', 'Catégorie');
            tdCategorie.textContent = emprunt.materiel_categorie || '-';
            tr.appendChild(tdCategorie);

            // Date emprunt
            const tdDateEmprunt = document.createElement('td');
            tdDateEmprunt.setAttribute('data-label', 'Date emprunt');
            tdDateEmprunt.textContent = emprunt.date_emprunt;
            tr.appendChild(tdDateEmprunt);

            // Retour prévu
            const tdRetourPrevu = document.createElement('td');
            tdRetourPrevu.setAttribute('data-label', 'Retour prévu');
            tdRetourPrevu.textContent = emprunt.date_retour_prevue;
            tr.appendChild(tdRetourPrevu);

            // Jours restants
            const tdJoursRestants = document.createElement('td');
            tdJoursRestants.setAttribute('data-label', 'Jours restants');
            const joursRestants = CalculerJoursRestants(emprunt.date_retour_prevue);
            if (joursRestants < 0) {
                const badge = document.createElement('span');
                badge.className = 'badge badge-danger';
                badge.textContent = 'Retard : ' + Math.abs(joursRestants) + ' jours';
                tdJoursRestants.appendChild(badge);
            } else {
                const badge = document.createElement('span');
                badge.className = 'badge badge-success';
                badge.textContent = joursRestants + ' jours';
                tdJoursRestants.appendChild(badge);
            }
            tr.appendChild(tdJoursRestants);

            tbody.appendChild(tr);
        });
    } catch (erreur) {
        console.error('Erreur chargement emprunts en cours:', erreur);
        if (typeof Toast !== 'undefined') {
            Toast.error('Erreur lors du chargement des emprunts');
        }
    }
}

// ============================================
// CHARGER HISTORIQUE
// ============================================
async function ChargerHistorique() {
    try {
        const reponse = await fetch('/api/mes-emprunts/historique');
        const emprunts = await reponse.json();

        const tbody = document.querySelector('#table-emprunts-historique tbody');
        const msgAucun = document.getElementById('msg-aucun-historique');

        tbody.innerHTML = '';

        if (emprunts.length === 0) {
            msgAucun.style.display = 'block';
            return;
        }

        msgAucun.style.display = 'none';

        emprunts.forEach(emprunt => {
            const tr = document.createElement('tr');

            // Matériel
            const tdMateriel = document.createElement('td');
            tdMateriel.setAttribute('data-label', 'Matériel');
            tdMateriel.textContent = emprunt.materiel_nom;
            tr.appendChild(tdMateriel);

            // Catégorie
            const tdCategorie = document.createElement('td');
            tdCategorie.setAttribute('data-label', 'Catégorie');
            tdCategorie.textContent = emprunt.materiel_categorie || '-';
            tr.appendChild(tdCategorie);

            // Date emprunt
            const tdDateEmprunt = document.createElement('td');
            tdDateEmprunt.setAttribute('data-label', 'Date emprunt');
            tdDateEmprunt.textContent = emprunt.date_emprunt;
            tr.appendChild(tdDateEmprunt);

            // Date retour
            const tdDateRetour = document.createElement('td');
            tdDateRetour.setAttribute('data-label', 'Date retour');
            tdDateRetour.textContent = emprunt.date_retour_effective;
            tr.appendChild(tdDateRetour);

            // Durée
            const tdDuree = document.createElement('td');
            tdDuree.setAttribute('data-label', 'Durée');
            tdDuree.textContent = emprunt.duree_jours + ' jours';
            tr.appendChild(tdDuree);

            tbody.appendChild(tr);
        });
    } catch (erreur) {
        console.error('Erreur chargement historique:', erreur);
    }
}

// ============================================
// CHARGER RETARDS
// ============================================
async function ChargerRetards() {
    try {
        const reponse = await fetch('/api/mes-emprunts/retards');
        const emprunts = await reponse.json();

        const tbody = document.querySelector('#table-emprunts-retards tbody');
        const msgAucun = document.getElementById('msg-aucun-retard');

        tbody.innerHTML = '';

        if (emprunts.length === 0) {
            msgAucun.style.display = 'block';
            return;
        }

        msgAucun.style.display = 'none';

        emprunts.forEach(emprunt => {
            const tr = document.createElement('tr');

            // Matériel
            const tdMateriel = document.createElement('td');
            tdMateriel.setAttribute('data-label', 'Matériel');
            tdMateriel.textContent = emprunt.materiel_nom;
            tr.appendChild(tdMateriel);

            // Catégorie
            const tdCategorie = document.createElement('td');
            tdCategorie.setAttribute('data-label', 'Catégorie');
            tdCategorie.textContent = emprunt.materiel_categorie || '-';
            tr.appendChild(tdCategorie);

            // Retour prévu
            const tdRetourPrevu = document.createElement('td');
            tdRetourPrevu.setAttribute('data-label', 'Retour prévu');
            tdRetourPrevu.textContent = emprunt.date_retour_prevue;
            tr.appendChild(tdRetourPrevu);

            // Retour effectif
            const tdRetourEffectif = document.createElement('td');
            tdRetourEffectif.setAttribute('data-label', 'Retour effectif');
            tdRetourEffectif.textContent = emprunt.date_retour_effective;
            tr.appendChild(tdRetourEffectif);

            // Jours de retard
            const tdJoursRetard = document.createElement('td');
            tdJoursRetard.setAttribute('data-label', 'Retard');
            const badge = document.createElement('span');
            badge.className = 'badge badge-danger';
            badge.textContent = emprunt.jours_retard + ' jours';
            tdJoursRetard.appendChild(badge);
            tr.appendChild(tdJoursRetard);

            tbody.appendChild(tr);
        });
    } catch (erreur) {
        console.error('Erreur chargement retards:', erreur);
    }
}

// ============================================
// CATALOGUE
// ============================================

/**
 * Charge le catalogue des matériels depuis l'API
 */
async function ChargerCatalogue() {
    try {
        const reponse = await fetch('/api/materiels');
        listeMaterielsCatalogue = await reponse.json();

        // Remplir le select des catégories
        RemplirSelectCategories();

        // Afficher le catalogue
        AfficherCatalogueFiltre();
    } catch (erreur) {
        console.error('Erreur chargement catalogue:', erreur);
        if (typeof Toast !== 'undefined') {
            Toast.error('Erreur lors du chargement du catalogue');
        }
    }
}

/**
 * Remplit le select des catégories avec les valeurs uniques
 */
function RemplirSelectCategories() {
    const select = document.getElementById('filter-categorie');
    if (!select) return;

    const categories = [...new Set(listeMaterielsCatalogue.map(m => m.categorie).filter(c => c))];

    select.innerHTML = '<option value="">Toutes</option>';

    categories.sort().forEach(categorie => {
        const option = document.createElement('option');
        option.value = categorie;
        option.textContent = categorie;
        select.appendChild(option);
    });
}

/**
 * Affiche le catalogue avec les filtres appliqués
 */
function AfficherCatalogueFiltre() {
    let materiels = [...listeMaterielsCatalogue];

    // Filtrer par recherche
    if (rechercheCatalogue) {
        materiels = materiels.filter(m =>
            m.nom.toLowerCase().includes(rechercheCatalogue) ||
            (m.categorie && m.categorie.toLowerCase().includes(rechercheCatalogue)) ||
            (m.localisation && m.localisation.toLowerCase().includes(rechercheCatalogue))
        );
    }

    // Filtrer par catégorie
    if (filtreCategorieCatalogue) {
        materiels = materiels.filter(m => m.categorie === filtreCategorieCatalogue);
    }

    // Afficher
    AfficherCatalogue(materiels);
}

/**
 * Affiche la liste des matériels dans le tableau du catalogue
 *
 * @param {Array} materiels - Liste des matériels à afficher
 */
function AfficherCatalogue(materiels) {
    const tbody = document.querySelector('#table-catalogue tbody');
    const msgAucun = document.getElementById('msg-aucun-catalogue');

    if (!tbody) return;

    tbody.innerHTML = '';

    if (materiels.length === 0) {
        if (msgAucun) msgAucun.style.display = 'block';
        return;
    }

    if (msgAucun) msgAucun.style.display = 'none';

    materiels.forEach(materiel => {
        const tr = document.createElement('tr');

        // Nom
        const tdNom = document.createElement('td');
        tdNom.setAttribute('data-label', 'Nom');
        tdNom.textContent = materiel.nom;
        tr.appendChild(tdNom);

        // Catégorie
        const tdCategorie = document.createElement('td');
        tdCategorie.setAttribute('data-label', 'Catégorie');
        tdCategorie.textContent = materiel.categorie || '-';
        tr.appendChild(tdCategorie);

        // Localisation
        const tdLocalisation = document.createElement('td');
        tdLocalisation.setAttribute('data-label', 'Localisation');
        tdLocalisation.textContent = materiel.localisation || '-';
        tr.appendChild(tdLocalisation);

        // État
        const tdEtat = document.createElement('td');
        tdEtat.setAttribute('data-label', 'État');
        const badgeEtat = document.createElement('span');
        badgeEtat.className = 'badge badge-' + materiel.etat;
        badgeEtat.textContent = FormaterEtat(materiel.etat);
        tdEtat.appendChild(badgeEtat);
        tr.appendChild(tdEtat);

        tbody.appendChild(tr);
    });

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Calcule le nombre de jours restants avant une date de retour
 *
 * @param {string} dateRetourPrevue - Date au format JJ/MM/AAAA
 * @returns {number} Nombre de jours (positif ou négatif)
 */
function CalculerJoursRestants(dateRetourPrevue) {
    // Format : JJ/MM/AAAA
    const parties = dateRetourPrevue.split('/');
    const dateRetour = new Date(parties[2], parties[1] - 1, parties[0]);
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    const diffTemps = dateRetour - aujourdhui;
    const diffJours = Math.ceil(diffTemps / (1000 * 60 * 60 * 24));

    return diffJours;
}

/**
 * Formate l'état pour l'affichage
 *
 * @param {string} etat - L'état technique
 * @returns {string} L'état formaté pour l'affichage
 */
function FormaterEtat(etat) {
    if (etat === 'en_stock') return 'Disponible';
    if (etat === 'emprunte') return 'Emprunté';
    if (etat === 'en_maintenance') return 'Maintenance';
    return etat;
}
