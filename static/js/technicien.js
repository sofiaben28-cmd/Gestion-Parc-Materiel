// ============================================
// DASHBOARD TECHNICIEN - Gestion Matériel IUT GEII
// ============================================
// Dashboard pour techniciens (maintenances)
// Inclut navigation sidebar et toasts
// ============================================

// Variables globales
let maintenanceCourante = null;

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    VerifierSession();
    ChargerMaintenancesEnCours();
    ChargerMaterielsStock();
    ChargerHistorique();

    // Navigation sidebar
    InitialiserNavigation();

    // Menu mobile
    InitialiserMenuMobile();

    // Bouton déconnexion
    document.getElementById('btn-deconnexion').addEventListener('click', Deconnexion);

    // Formulaire démarrer maintenance
    document.getElementById('form-demarrer-maintenance').addEventListener('submit', DemarrerMaintenance);

    // Popup maintenance
    document.getElementById('popup-maintenance-close').addEventListener('click', FermerPopupMaintenance);
    document.getElementById('btn-annuler-maintenance').addEventListener('click', FermerPopupMaintenance);
    document.getElementById('form-maintenance').addEventListener('submit', SauvegarderMaintenance);
    document.getElementById('btn-terminer-maintenance').addEventListener('click', TerminerMaintenance);
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
 * @param {string} tabName - Nom de l'onglet
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
        'en-cours': { titre: 'Maintenances en cours', subtitle: 'Gérez vos maintenances actives' },
        'nouvelle': { titre: 'Nouvelle maintenance', subtitle: 'Démarrer une nouvelle intervention' },
        'historique': { titre: 'Historique', subtitle: 'Consultez vos maintenances passées' }
    };

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
        } else if (data.role !== 'technicien') {
            // Rediriger selon le rôle
            if (data.role === 'admin') {
                window.location.href = '/dashboard-admin';
            } else {
                window.location.href = '/dashboard-user';
            }
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
// CHARGER MAINTENANCES EN COURS
// ============================================

/**
 * Charge et affiche les maintenances en cours du technicien connecté
 *
 * @async
 */
async function ChargerMaintenancesEnCours() {
    try {
        const reponse = await fetch('/api/mes-maintenances/en-cours');
        const maintenances = await reponse.json();

        const tbody = document.querySelector('#table-maintenances-cours tbody');
        const msgAucune = document.getElementById('msg-aucune-maintenance');

        tbody.innerHTML = '';

        if (maintenances.length === 0) {
            msgAucune.style.display = 'block';
            return;
        }

        msgAucune.style.display = 'none';

        maintenances.forEach(maintenance => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.onclick = () => AfficherPopupMaintenance(maintenance);

            // Matériel
            const tdMateriel = document.createElement('td');
            tdMateriel.setAttribute('data-label', 'Matériel');
            tdMateriel.textContent = maintenance.materiel_nom;
            tr.appendChild(tdMateriel);

            // Catégorie
            const tdCategorie = document.createElement('td');
            tdCategorie.setAttribute('data-label', 'Catégorie');
            tdCategorie.textContent = maintenance.materiel_categorie || '-';
            tr.appendChild(tdCategorie);

            // Date début
            const tdDateDebut = document.createElement('td');
            tdDateDebut.setAttribute('data-label', 'Date début');
            tdDateDebut.textContent = maintenance.date_debut;
            tr.appendChild(tdDateDebut);

            // Deadline
            const tdDeadline = document.createElement('td');
            tdDeadline.setAttribute('data-label', 'Deadline');
            tdDeadline.textContent = maintenance.deadline;
            tr.appendChild(tdDeadline);

            // Jours restants
            const tdJoursRestants = document.createElement('td');
            tdJoursRestants.setAttribute('data-label', 'Jours restants');
            const joursRestants = maintenance.jours_avant_deadline;
            if (joursRestants !== null) {
                if (joursRestants < 0) {
                    const badge = document.createElement('span');
                    badge.className = 'badge badge-danger';
                    badge.textContent = 'Retard : ' + Math.abs(joursRestants) + ' jours';
                    tdJoursRestants.appendChild(badge);
                } else if (joursRestants <= 3) {
                    const badge = document.createElement('span');
                    badge.className = 'badge badge-warning';
                    badge.textContent = joursRestants + ' jours';
                    tdJoursRestants.appendChild(badge);
                } else {
                    const badge = document.createElement('span');
                    badge.className = 'badge badge-success';
                    badge.textContent = joursRestants + ' jours';
                    tdJoursRestants.appendChild(badge);
                }
            } else {
                tdJoursRestants.textContent = '-';
            }
            tr.appendChild(tdJoursRestants);

            tbody.appendChild(tr);
        });
    } catch (erreur) {
        console.error('Erreur chargement maintenances:', erreur);
        if (typeof Toast !== 'undefined') {
            Toast.error('Erreur lors du chargement des maintenances');
        }
    }
}

// ============================================
// CHARGER MATÉRIELS EN STOCK
// ============================================
async function ChargerMaterielsStock() {
    try {
        const reponse = await fetch('/api/materiels-stock');
        const materiels = await reponse.json();

        const select = document.getElementById('select-materiel-stock');
        select.innerHTML = '<option value="">-- Choisir un matériel --</option>';

        materiels.forEach(materiel => {
            const option = document.createElement('option');
            option.value = materiel.id;
            option.textContent = materiel.nom + (materiel.categorie ? ' (' + materiel.categorie + ')' : '');
            select.appendChild(option);
        });
    } catch (erreur) {
        console.error('Erreur chargement matériels stock:', erreur);
    }
}

// ============================================
// CHARGER HISTORIQUE
// ============================================
async function ChargerHistorique() {
    try {
        const reponse = await fetch('/api/mes-maintenances/historique');
        const maintenances = await reponse.json();

        const tbody = document.querySelector('#table-maintenances-historique tbody');
        const msgAucun = document.getElementById('msg-aucun-historique');

        tbody.innerHTML = '';

        if (maintenances.length === 0) {
            msgAucun.style.display = 'block';
            return;
        }

        msgAucun.style.display = 'none';

        maintenances.forEach(maintenance => {
            const tr = document.createElement('tr');

            // Matériel
            const tdMateriel = document.createElement('td');
            tdMateriel.setAttribute('data-label', 'Matériel');
            tdMateriel.textContent = maintenance.materiel_nom;
            tr.appendChild(tdMateriel);

            // Catégorie
            const tdCategorie = document.createElement('td');
            tdCategorie.setAttribute('data-label', 'Catégorie');
            tdCategorie.textContent = maintenance.materiel_categorie || '-';
            tr.appendChild(tdCategorie);

            // Date début
            const tdDateDebut = document.createElement('td');
            tdDateDebut.setAttribute('data-label', 'Date début');
            tdDateDebut.textContent = maintenance.date_debut;
            tr.appendChild(tdDateDebut);

            // Date fin
            const tdDateFin = document.createElement('td');
            tdDateFin.setAttribute('data-label', 'Date fin');
            tdDateFin.textContent = maintenance.date_fin;
            tr.appendChild(tdDateFin);

            // Durée
            const tdDuree = document.createElement('td');
            tdDuree.setAttribute('data-label', 'Durée');
            tdDuree.textContent = maintenance.duree_jours + ' jours';
            tr.appendChild(tdDuree);

            // Coûts
            const tdCouts = document.createElement('td');
            tdCouts.setAttribute('data-label', 'Coûts');
            tdCouts.textContent = maintenance.couts ? parseFloat(maintenance.couts).toFixed(2) + ' euros' : '0.00 euros';
            tr.appendChild(tdCouts);

            tbody.appendChild(tr);
        });
    } catch (erreur) {
        console.error('Erreur chargement historique:', erreur);
    }
}

// ============================================
// DÉMARRER MAINTENANCE
// ============================================

/**
 * Démarre une nouvelle maintenance sur un matériel en stock
 *
 * @async
 * @param {Event} e - L'événement de soumission du formulaire
 */
async function DemarrerMaintenance(e) {
    e.preventDefault();

    const materielId = document.getElementById('select-materiel-stock').value;
    const deadline = document.getElementById('input-deadline').value;

    if (!materielId || !deadline) {
        Toast.warning('Veuillez sélectionner un matériel et une deadline');
        return;
    }

    try {
        const reponse = await fetch('/api/maintenances/demarrer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ materielId, deadline })
        });

        const data = await reponse.json();

        if (reponse.ok) {
            Toast.success(data.message || 'Maintenance démarrée !');
            document.getElementById('form-demarrer-maintenance').reset();
            ChargerMaintenancesEnCours();
            ChargerMaterielsStock();
            ChangerOnglet('en-cours');
        } else {
            Toast.error(data.error || 'Erreur lors du démarrage de la maintenance');
        }
    } catch (erreur) {
        console.error('Erreur démarrage maintenance:', erreur);
        Toast.error('Erreur lors du démarrage de la maintenance');
    }
}

// ============================================
// POPUP MAINTENANCE
// ============================================
function AfficherPopupMaintenance(maintenance) {
    maintenanceCourante = maintenance;

    // Remplir les champs
    document.getElementById('popup-maintenance-materiel').textContent =
        maintenance.materiel_nom + ' (' + (maintenance.materiel_categorie || 'Sans catégorie') + ')';
    document.getElementById('maintenance-date-debut').value = maintenance.date_debut;
    document.getElementById('maintenance-deadline').value = ConvertirDatePourInput(maintenance.deadline);
    document.getElementById('maintenance-composants').value = maintenance.composants_commandes || '';
    document.getElementById('maintenance-couts').value = maintenance.couts || '0.00';
    document.getElementById('maintenance-rapport').value = maintenance.rapport || '';

    // Charger l'historique des maintenances de ce matériel
    ChargerHistoriqueMaintenanceMateriel(maintenance.materiel_id);

    // Afficher la popup
    document.getElementById('popup-maintenance').style.display = 'flex';

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function FermerPopupMaintenance() {
    document.getElementById('popup-maintenance').style.display = 'none';
    maintenanceCourante = null;
}

// ============================================
// SAUVEGARDER MAINTENANCE
// ============================================
async function SauvegarderMaintenance(e) {
    e.preventDefault();

    if (!maintenanceCourante) return;

    const composantsCommandes = document.getElementById('maintenance-composants').value;
    const couts = parseFloat(document.getElementById('maintenance-couts').value) || 0;
    const rapport = document.getElementById('maintenance-rapport').value;
    const deadline = document.getElementById('maintenance-deadline').value;

    try {
        const reponse = await fetch(`/api/maintenances/${maintenanceCourante.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                composants_commandes: composantsCommandes,
                couts: couts,
                rapport: rapport,
                deadline: deadline
            })
        });

        if (reponse.ok) {
            Toast.success('Maintenance sauvegardée !');
            FermerPopupMaintenance();
            ChargerMaintenancesEnCours();
        } else {
            const data = await reponse.json();
            Toast.error(data.error || 'Erreur lors de la sauvegarde');
        }
    } catch (erreur) {
        console.error('Erreur sauvegarde maintenance:', erreur);
        Toast.error('Erreur lors de la sauvegarde');
    }
}

// ============================================
// TERMINER MAINTENANCE
// ============================================

/**
 * Termine une maintenance et remet le matériel en stock
 *
 * @async
 */
async function TerminerMaintenance() {
    if (!maintenanceCourante) return;

    if (!confirm('Terminer la maintenance et remettre le matériel en stock ?')) {
        return;
    }

    try {
        const reponse = await fetch(`/api/maintenances/${maintenanceCourante.id}/terminer`, {
            method: 'POST'
        });

        const data = await reponse.json();

        if (reponse.ok) {
            Toast.success(data.message || 'Maintenance terminée !');
            FermerPopupMaintenance();
            ChargerMaintenancesEnCours();
            ChargerHistorique();
            ChargerMaterielsStock();
        } else {
            Toast.error(data.error || 'Erreur lors de la finalisation');
        }
    } catch (erreur) {
        console.error('Erreur terminer maintenance:', erreur);
        Toast.error('Erreur lors de la finalisation');
    }
}

// ============================================
// HISTORIQUE MAINTENANCE MATÉRIEL
// ============================================
async function ChargerHistoriqueMaintenanceMateriel(materielId) {
    try {
        const reponse = await fetch(`/api/materiels/${materielId}/maintenances`);
        const maintenances = await reponse.json();

        const divHistorique = document.getElementById('historique-maintenance-materiel');
        divHistorique.innerHTML = '';

        if (maintenances.length === 0) {
            divHistorique.innerHTML = '<p class="text-muted">Aucune maintenance antérieure pour ce matériel</p>';
            return;
        }

        // Créer une liste des maintenances
        maintenances.forEach(maint => {
            const card = document.createElement('div');
            card.style.cssText = 'background: var(--gris-clair); padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--bleu-principal);';

            const statut = maint.statut === 'en_cours' ?
                '<span style="color: var(--orange-accent); font-weight: bold;">EN COURS</span>' :
                '<span style="color: var(--vert-succes); font-weight: bold;">TERMINEE</span>';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <strong>${statut}</strong>
                    <span style="color: var(--text-secondary);">Technicien: ${maint.technicien_nom}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>Période:</strong> ${maint.date_debut} ${maint.date_fin ? '-> ' + maint.date_fin : '(en cours)'}
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>Composants:</strong> ${maint.composants_commandes || '<i>Non spécifié</i>'}
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>Coûts:</strong> ${maint.couts ? parseFloat(maint.couts).toFixed(2) + ' euros' : '0.00 euros'}
                </div>
                <div>
                    <strong>Rapport:</strong> ${maint.rapport || '<i>Aucun rapport</i>'}
                </div>
            `;

            divHistorique.appendChild(card);
        });

    } catch (erreur) {
        console.error('Erreur chargement historique matériel:', erreur);
        document.getElementById('historique-maintenance-materiel').innerHTML =
            '<p style="color: var(--rouge-danger);">Erreur lors du chargement de l\'historique</p>';
    }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================
function ConvertirDatePourInput(dateFrancaise) {
    // Format français : JJ/MM/AAAA
    // Format input date : AAAA-MM-DD
    const parties = dateFrancaise.split('/');
    if (parties.length === 3) {
        return `${parties[2]}-${parties[1]}-${parties[0]}`;
    }
    return '';
}
