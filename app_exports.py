# ============================================
# EXPORTS ET RAPPORTS - GESTION MATÉRIEL IUT GEII
# ============================================
# Exports Excel et PDF pour le dashboard admin
# ============================================

from flask import send_file, jsonify
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from config import get_db_connection
from datetime import datetime
import os

# ============================================
# FONCTIONS UTILITAIRES
# ============================================

def FormaterDateFrancaise(date):
    """Formater une date en format français JJ/MM/AAAA"""
    if date is None:
        return '-'
    if isinstance(date, str):
        try:
            date = datetime.strptime(date, '%Y-%m-%d')
        except:
            return date
    return date.strftime('%d/%m/%Y')


def FormaterDateHeureFrancaise(date):
    """Formater une date+heure en format français JJ/MM/AAAA HH:MM"""
    if date is None:
        return '-'
    if isinstance(date, str):
        try:
            date = datetime.strptime(date, '%Y-%m-%d %H:%M:%S')
        except:
            return date
    return date.strftime('%d/%m/%Y %H:%M')


def CreerFichierExcel(nomFichier, donnees, colonnes):
    """
    Crée un fichier Excel professionnel avec mise en forme automatique

    Cette fonction génère un fichier Excel (.xlsx) avec:
    - Un en-tête bleu IUT Lyon 1 avec texte blanc
    - Des colonnes ajustées automatiquement à la largeur du contenu
    - Des filtres activés sur la première ligne
    - Un fond beige pour les données

    Paramètres:
        nomFichier (str): Le nom du fichier à créer (ex: "inventaire.xlsx")
        donnees (list): Liste de listes contenant les données
                       Exemple: [["Arduino", "En stock"], ["Multimètre", "Emprunté"]]
        colonnes (list): Liste des noms de colonnes
                        Exemple: ["Nom", "État"]

    Retourne:
        str: Le chemin complet du fichier créé

    Exemple d'utilisation:
        colonnes = ["Nom", "Catégorie", "État"]
        donnees = [
            ["Arduino Uno", "Électronique", "En stock"],
            ["Multimètre", "Mesure", "Emprunté"]
        ]
        chemin = CreerFichierExcel("materiels.xlsx", donnees, colonnes)
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Export"

    # Style pour les en-têtes
    headerFont = Font(bold=True, color="FFFFFF", size=12)
    headerFill = PatternFill(start_color="0051A5", end_color="0051A5", fill_type="solid")
    headerAlignment = Alignment(horizontal="center", vertical="center")

    # Écrire les en-têtes
    for col_num, colonne in enumerate(colonnes, 1):
        cell = ws.cell(row=1, column=col_num, value=colonne)
        cell.font = headerFont
        cell.fill = headerFill
        cell.alignment = headerAlignment

    # Écrire les données
    for row_num, ligne in enumerate(donnees, 2):
        for col_num, valeur in enumerate(ligne, 1):
            ws.cell(row=row_num, column=col_num, value=valeur)

    # Ajuster la largeur des colonnes
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width

    # Activer les filtres
    ws.auto_filter.ref = ws.dimensions

    # Sauvegarder
    cheminFichier = os.path.join('static', 'exports', nomFichier)
    os.makedirs(os.path.dirname(cheminFichier), exist_ok=True)
    wb.save(cheminFichier)

    return cheminFichier


# ============================================
# EXPORT 1 : INVENTAIRE COMPLET DU MATÉRIEL
# ============================================

def ExportInventaireMateriel():
    """
    Exporte l'inventaire complet du matériel en fichier Excel

    Cette fonction génère un fichier Excel téléchargeable contenant tous les matériels
    avec leurs informations principales. Elle utilise la vue SQL vue_materiel_complet
    pour récupérer toutes les données nécessaires.

    Route associée: /api/export/inventaire (GET)

    Colonnes exportées:
        - Nom du matériel
        - Catégorie
        - État (En stock / Emprunté / En maintenance)
        - Localisation (salle/armoire)
        - Date d'ajout au système
        - Personne (emprunteur ou technicien si applicable)
        - Date de retour prévue (si emprunté)
        - Jours de retard (si en retard)

    Retourne:
        Response: Fichier Excel téléchargeable nommé "inventaire_materiel_JJMMAAAA.xlsx"
        ou JSON avec erreur 500 en cas de problème

    Cas d'usage:
        - L'admin veut une vue complète de tout le matériel
        - Nécessaire pour faire un inventaire physique
        - Utile pour les rapports de gestion
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Récupérer les données
        cursor.execute('''
            SELECT
                m.nom,
                m.categorie,
                m.etat,
                m.localisation,
                m.date_ajout,
                CASE
                    WHEN m.etat = 'emprunte' THEN m.emprunteur_nom_complet
                    WHEN m.etat = 'en_maintenance' THEN m.technicien_nom_complet
                    ELSE NULL
                END AS personne,
                CASE
                    WHEN m.etat = 'emprunte' THEN m.date_retour_prevue
                    WHEN m.etat = 'en_maintenance' THEN maint.deadline
                    ELSE NULL
                END AS date_limite,
                m.jours_retard
            FROM vue_materiel_complet m
            LEFT JOIN maintenances maint ON m.id = maint.materiel_id
                AND maint.statut = 'en_cours'
            ORDER BY m.nom
        ''')

        materiels = cursor.fetchall()
        conn.close()

        # Préparer les données
        colonnes = [
            'Nom',
            'Catégorie',
            'État',
            'Localisation',
            'Date ajout',
            'Personne',
            'Date retour prévue',
            'Jours de retard'
        ]

        donnees = []
        for m in materiels:
            # Formater l'état
            etat = m['etat']
            if etat == 'en_stock':
                etat = 'En stock'
            elif etat == 'emprunte':
                etat = 'Emprunté'
            elif etat == 'en_maintenance':
                etat = 'En maintenance'

            donnees.append([
                m['nom'] or '-',
                m['categorie'] or '-',
                etat,
                m['localisation'] or '-',
                FormaterDateFrancaise(m['date_ajout']),
                m['personne'].strip() if m['personne'] else '-',
                FormaterDateFrancaise(m['date_limite']),
                m['jours_retard'] if m['jours_retard'] and m['jours_retard'] > 0 else '-'
            ])

        # Créer le fichier
        nomFichier = f"inventaire_materiel_{datetime.now().strftime('%d%m%Y')}.xlsx"
        cheminFichier = CreerFichierExcel(nomFichier, donnees, colonnes)

        return send_file(cheminFichier, as_attachment=True, download_name=nomFichier)

    except Exception as e:
        print(f"Erreur export inventaire: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# EXPORT 2 : LISTE DES ÉLÈVES
# ============================================

def ExportListeEleves():
    """Export Excel de la liste des élèves"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('''
            SELECT nom, prenom, email, date_creation, email_verifie
            FROM users
            WHERE role = 'eleve'
            ORDER BY nom, prenom
        ''')

        eleves = cursor.fetchall()
        conn.close()

        colonnes = ['Nom', 'Prénom', 'Email', 'Date création', 'Actif']

        donnees = []
        for e in eleves:
            donnees.append([
                e['nom'],
                e['prenom'],
                e['email'],
                FormaterDateHeureFrancaise(e['date_creation']),
                'Oui' if e['email_verifie'] else 'Non'
            ])

        nomFichier = f"liste_eleves_{datetime.now().strftime('%d%m%Y')}.xlsx"
        cheminFichier = CreerFichierExcel(nomFichier, donnees, colonnes)

        return send_file(cheminFichier, as_attachment=True, download_name=nomFichier)

    except Exception as e:
        print(f"Erreur export élèves: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# EXPORT 3 : LISTE DES ENSEIGNANTS
# ============================================

def ExportListeEnseignants():
    """Export Excel de la liste des enseignants"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('''
            SELECT nom, prenom, email, date_creation, email_verifie
            FROM users
            WHERE role = 'enseignant'
            ORDER BY nom, prenom
        ''')

        enseignants = cursor.fetchall()
        conn.close()

        colonnes = ['Nom', 'Prénom', 'Email', 'Date création', 'Actif']

        donnees = []
        for e in enseignants:
            donnees.append([
                e['nom'],
                e['prenom'],
                e['email'],
                FormaterDateHeureFrancaise(e['date_creation']),
                'Oui' if e['email_verifie'] else 'Non'
            ])

        nomFichier = f"liste_enseignants_{datetime.now().strftime('%d%m%Y')}.xlsx"
        cheminFichier = CreerFichierExcel(nomFichier, donnees, colonnes)

        return send_file(cheminFichier, as_attachment=True, download_name=nomFichier)

    except Exception as e:
        print(f"Erreur export enseignants: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# EXPORT 4 : LISTE DES TECHNICIENS
# ============================================

def ExportListeTechniciens():
    """Export Excel de la liste des techniciens"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('''
            SELECT nom, prenom, email, date_creation, email_verifie
            FROM users
            WHERE role = 'technicien'
            ORDER BY nom, prenom
        ''')

        techniciens = cursor.fetchall()
        conn.close()

        colonnes = ['Nom', 'Prénom', 'Email', 'Date création', 'Actif']

        donnees = []
        for t in techniciens:
            donnees.append([
                t['nom'],
                t['prenom'],
                t['email'],
                FormaterDateHeureFrancaise(t['date_creation']),
                'Oui' if t['email_verifie'] else 'Non'
            ])

        nomFichier = f"liste_techniciens_{datetime.now().strftime('%d%m%Y')}.xlsx"
        cheminFichier = CreerFichierExcel(nomFichier, donnees, colonnes)

        return send_file(cheminFichier, as_attachment=True, download_name=nomFichier)

    except Exception as e:
        print(f"Erreur export techniciens: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# EXPORT 5 : HISTORIQUE DES EMPRUNTS
# ============================================

def ExportHistoriqueEmprunts():
    """Export Excel de l'historique complet des emprunts"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('''
            SELECT
                materiel_nom,
                materiel_categorie,
                emprunteur_nom,
                emprunteur_role,
                date_emprunt,
                date_retour_prevue,
                date_retour_effective,
                duree_jours,
                jours_retard
            FROM vue_emprunts_utilisateur
            ORDER BY date_emprunt DESC
            LIMIT 1000
        ''')

        emprunts = cursor.fetchall()
        conn.close()

        colonnes = [
            'Matériel',
            'Catégorie',
            'Emprunteur',
            'Rôle',
            'Date emprunt',
            'Date retour prévue',
            'Date retour effective',
            'Durée (jours)',
            'Jours de retard'
        ]

        donnees = []
        for emp in emprunts:
            donnees.append([
                emp['materiel_nom'],
                emp['materiel_categorie'] or '-',
                emp['emprunteur_nom'],
                emp['emprunteur_role'].capitalize(),
                FormaterDateHeureFrancaise(emp['date_emprunt']),
                FormaterDateFrancaise(emp['date_retour_prevue']),
                FormaterDateHeureFrancaise(emp['date_retour_effective']),
                emp['duree_jours'] or '-',
                emp['jours_retard'] if emp['jours_retard'] and emp['jours_retard'] > 0 else '-'
            ])

        nomFichier = f"historique_emprunts_{datetime.now().strftime('%d%m%Y')}.xlsx"
        cheminFichier = CreerFichierExcel(nomFichier, donnees, colonnes)

        return send_file(cheminFichier, as_attachment=True, download_name=nomFichier)

    except Exception as e:
        print(f"Erreur export emprunts: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# EXPORT 6 : HISTORIQUE DES MAINTENANCES
# ============================================

def ExportHistoriqueMaintenances():
    """Export Excel de l'historique des maintenances"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('''
            SELECT
                materiel_nom,
                materiel_categorie,
                technicien_nom,
                date_debut,
                date_fin,
                duree_jours,
                couts,
                composants_commandes,
                rapport
            FROM vue_maintenances_complet
            WHERE statut = 'terminee'
            ORDER BY date_debut DESC
            LIMIT 1000
        ''')

        maintenances = cursor.fetchall()
        conn.close()

        colonnes = [
            'Matériel',
            'Catégorie',
            'Technicien',
            'Date début',
            'Date fin',
            'Durée (jours)',
            'Coûts (€)',
            'Composants',
            'Rapport'
        ]

        donnees = []
        for maint in maintenances:
            donnees.append([
                maint['materiel_nom'],
                maint['materiel_categorie'] or '-',
                maint['technicien_nom'],
                FormaterDateHeureFrancaise(maint['date_debut']),
                FormaterDateHeureFrancaise(maint['date_fin']),
                maint['duree_jours'] or '-',
                f"{float(maint['couts']):.2f}" if maint['couts'] else '0.00',
                maint['composants_commandes'] or '-',
                maint['rapport'] or '-'
            ])

        nomFichier = f"historique_maintenances_{datetime.now().strftime('%d%m%Y')}.xlsx"
        cheminFichier = CreerFichierExcel(nomFichier, donnees, colonnes)

        return send_file(cheminFichier, as_attachment=True, download_name=nomFichier)

    except Exception as e:
        print(f"Erreur export maintenances: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# EXPORT 7 : RETARDS EN COURS
# ============================================

def ExportRetardsEnCours():
    """Export Excel des retards en cours"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('''
            SELECT
                emprunteur_nom,
                emprunteur_role,
                emprunteur_email,
                materiel_nom,
                jours_retard,
                date_retour_prevue
            FROM vue_emprunts_utilisateur
            WHERE statut_emprunt = 'en_cours'
            AND jours_retard > 0
            ORDER BY jours_retard DESC
        ''')

        retards = cursor.fetchall()
        conn.close()

        colonnes = [
            'Nom complet',
            'Rôle',
            'Email',
            'Matériel',
            'Jours de retard',
            'Date retour prévue'
        ]

        donnees = []
        for r in retards:
            donnees.append([
                r['emprunteur_nom'],
                r['emprunteur_role'].capitalize(),
                r['emprunteur_email'],
                r['materiel_nom'],
                r['jours_retard'],
                FormaterDateFrancaise(r['date_retour_prevue'])
            ])

        nomFichier = f"retards_en_cours_{datetime.now().strftime('%d%m%Y')}.xlsx"
        cheminFichier = CreerFichierExcel(nomFichier, donnees, colonnes)

        return send_file(cheminFichier, as_attachment=True, download_name=nomFichier)

    except Exception as e:
        print(f"Erreur export retards: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# EXPORT 8 : RAPPORT MENSUEL PDF
# ============================================

def ExportRapportMensuel():
    """
    Génère un rapport mensuel complet au format PDF avec toutes les statistiques

    Cette fonction crée un document PDF professionnel de plusieurs pages contenant:

    PAGE 1 - Statistiques générales:
        - Nombre total de matériels (en stock, empruntés, en maintenance)
        - Nombre total d'utilisateurs par rôle (élèves, enseignants, techniciens)
        - Activité du mois (emprunts et maintenances démarrés)
        - Taux d'utilisation du matériel

    PAGE 2 - Top 5 matériel le plus emprunté:
        - Classement des matériels par nombre d'emprunts total
        - Utile pour identifier le matériel populaire et prévoir les achats

    PAGE 3 - Top 5 utilisateurs actifs:
        - Classement des utilisateurs par nombre d'emprunts
        - Permet d'identifier les utilisateurs réguliers

    PAGE 4 - Coûts des maintenances:
        - Coût total des maintenances du mois
        - Détail par catégorie de matériel
        - Aide à budgéter les réparations

    PAGE 5 - Alertes et points d'attention:
        - Liste des matériels en retard avec nombre de jours
        - Liste des maintenances en cours avec deadlines
        - Indicateurs de problèmes potentiels

    Route associée: /api/export/rapport-mensuel (GET)

    Format du fichier:
        - PDF format A4
        - Nom: "rapport_mensuel_MMAAAA.pdf"
        - Couleurs IUT Lyon 1 (bleu #0051A5)
        - Tableaux stylisés avec grilles

    Retourne:
        Response: Fichier PDF téléchargeable
        ou JSON avec erreur 500 en cas de problème

    Cas d'usage:
        - Réunion mensuelle de l'équipe GEII
        - Rapport à présenter à la direction
        - Archivage des statistiques mensuelles
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Date du rapport
        maintenant = datetime.now()
        mois = maintenant.strftime('%B %Y')
        dateGeneration = maintenant.strftime('%d/%m/%Y à %H:%M')

        # Nom du fichier
        nomFichier = f"rapport_mensuel_{maintenant.strftime('%m%Y')}.pdf"
        cheminFichier = os.path.join('static', 'exports', nomFichier)
        os.makedirs(os.path.dirname(cheminFichier), exist_ok=True)

        # Créer le PDF
        doc = SimpleDocTemplate(cheminFichier, pagesize=A4,
                                leftMargin=2*cm, rightMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)

        # Styles
        styles = getSampleStyleSheet()
        styleTitle = ParagraphStyle('CustomTitle',
                                    parent=styles['Heading1'],
                                    fontSize=24,
                                    textColor=colors.HexColor('#0051A5'),
                                    spaceAfter=30,
                                    alignment=1)

        styleHeading = ParagraphStyle('CustomHeading',
                                     parent=styles['Heading2'],
                                     fontSize=16,
                                     textColor=colors.HexColor('#003366'),
                                     spaceAfter=12,
                                     spaceBefore=20)

        styleNormal = styles['Normal']

        # Contenu du PDF
        story = []

        # === PAGE 1 : EN-TÊTE ET STATISTIQUES GÉNÉRALES ===
        story.append(Paragraph("RAPPORT MENSUEL", styleTitle))
        story.append(Paragraph("IUT LYON 1 - DÉPARTEMENT GEII", styleTitle))
        story.append(Paragraph("Gestion du Matériel", styleTitle))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(f"Période : {mois}", styleNormal))
        story.append(Paragraph(f"Généré le : {dateGeneration}", styleNormal))
        story.append(Spacer(1, 1*cm))

        # Statistiques générales
        story.append(Paragraph("STATISTIQUES GENERALES", styleHeading))
        story.append(Paragraph("=" * 80, styleNormal))

        # Matériels
        cursor.execute('SELECT COUNT(*) as total FROM materiel')
        totalMateriels = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) as nb FROM materiel WHERE etat = 'en_stock'")
        nbStock = cursor.fetchone()['nb']

        cursor.execute("SELECT COUNT(*) as nb FROM materiel WHERE etat = 'emprunte'")
        nbEmprunte = cursor.fetchone()['nb']

        cursor.execute("SELECT COUNT(*) as nb FROM materiel WHERE etat = 'en_maintenance'")
        nbMaintenance = cursor.fetchone()['nb']

        dataMateriels = [
            ['', 'Quantité'],
            ['Matériels total', str(totalMateriels)],
            ['En stock', str(nbStock)],
            ['Empruntés', str(nbEmprunte)],
            ['En maintenance', str(nbMaintenance)]
        ]

        tableMateriels = Table(dataMateriels, colWidths=[12*cm, 4*cm])
        tableMateriels.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0051A5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tableMateriels)
        story.append(Spacer(1, 0.5*cm))

        # Utilisateurs
        cursor.execute('SELECT COUNT(*) as total FROM users')
        totalUsers = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) as nb FROM users WHERE role = 'eleve'")
        nbEleves = cursor.fetchone()['nb']

        cursor.execute("SELECT COUNT(*) as nb FROM users WHERE role = 'enseignant'")
        nbEnseignants = cursor.fetchone()['nb']

        cursor.execute("SELECT COUNT(*) as nb FROM users WHERE role = 'technicien'")
        nbTechniciens = cursor.fetchone()['nb']

        dataUsers = [
            ['', 'Quantité'],
            ['Utilisateurs total', str(totalUsers)],
            ['Élèves', str(nbEleves)],
            ['Enseignants', str(nbEnseignants)],
            ['Techniciens', str(nbTechniciens)]
        ]

        tableUsers = Table(dataUsers, colWidths=[12*cm, 4*cm])
        tableUsers.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0051A5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tableUsers)
        story.append(Spacer(1, 0.5*cm))

        # Emprunts et maintenances du mois
        cursor.execute('''
            SELECT COUNT(*) as nb FROM emprunts
            WHERE MONTH(date_emprunt) = MONTH(CURDATE())
            AND YEAR(date_emprunt) = YEAR(CURDATE())
        ''')
        empruntsMois = cursor.fetchone()['nb']

        cursor.execute('''
            SELECT COUNT(*) as nb FROM maintenances
            WHERE MONTH(date_debut) = MONTH(CURDATE())
            AND YEAR(date_debut) = YEAR(CURDATE())
        ''')
        maintenancesMois = cursor.fetchone()['nb']

        tauxUtilisation = round((nbEmprunte / totalMateriels * 100) if totalMateriels > 0 else 0, 1)

        dataActivite = [
            ['', 'Valeur'],
            ['Emprunts ce mois', str(empruntsMois)],
            ['Maintenances ce mois', str(maintenancesMois)],
            ["Taux d'utilisation", f"{tauxUtilisation}%"]
        ]

        tableActivite = Table(dataActivite, colWidths=[12*cm, 4*cm])
        tableActivite.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0051A5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tableActivite)

        # === PAGE 2 : TOP MATÉRIEL ===
        story.append(PageBreak())
        story.append(Paragraph("TOP 5 MATERIEL LE PLUS EMPRUNTE", styleHeading))
        story.append(Paragraph("=" * 80, styleNormal))
        story.append(Spacer(1, 0.5*cm))

        cursor.execute('''
            SELECT m.nom, COUNT(e.id) as nb_emprunts
            FROM materiel m
            LEFT JOIN emprunts e ON m.id = e.materiel_id
            GROUP BY m.id
            ORDER BY nb_emprunts DESC
            LIMIT 5
        ''')
        topMateriels = cursor.fetchall()

        dataTopMat = [['Matériel', 'Nombre d\'emprunts']]
        for mat in topMateriels:
            dataTopMat.append([mat['nom'], str(mat['nb_emprunts'])])

        tableTopMat = Table(dataTopMat, colWidths=[12*cm, 4*cm])
        tableTopMat.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0051A5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tableTopMat)

        # === PAGE 3 : TOP UTILISATEURS ===
        story.append(PageBreak())
        story.append(Paragraph("TOP 5 UTILISATEURS ACTIFS", styleHeading))
        story.append(Paragraph("=" * 80, styleNormal))
        story.append(Spacer(1, 0.5*cm))

        cursor.execute('''
            SELECT CONCAT(u.prenom, ' ', u.nom) as nom_complet,
                   u.role,
                   COUNT(e.id) as nb_emprunts
            FROM users u
            LEFT JOIN emprunts e ON u.id = e.emprunteur_id
            WHERE u.role IN ('eleve', 'enseignant')
            GROUP BY u.id
            ORDER BY nb_emprunts DESC
            LIMIT 5
        ''')
        topUsers = cursor.fetchall()

        dataTopUsers = [['Utilisateur', 'Rôle', 'Nombre d\'emprunts']]
        for user in topUsers:
            dataTopUsers.append([
                user['nom_complet'],
                user['role'].capitalize(),
                str(user['nb_emprunts'])
            ])

        tableTopUsers = Table(dataTopUsers, colWidths=[8*cm, 4*cm, 4*cm])
        tableTopUsers.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0051A5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tableTopUsers)

        # === PAGE 4 : COÛTS MAINTENANCES ===
        story.append(PageBreak())
        story.append(Paragraph("COUTS DES MAINTENANCES", styleHeading))
        story.append(Paragraph("=" * 80, styleNormal))
        story.append(Spacer(1, 0.5*cm))

        cursor.execute('''
            SELECT SUM(couts) as total
            FROM maintenances
            WHERE MONTH(date_debut) = MONTH(CURDATE())
            AND YEAR(date_debut) = YEAR(CURDATE())
        ''')
        totalCouts = cursor.fetchone()['total'] or 0

        story.append(Paragraph(f"<b>Total ce mois : {float(totalCouts):.2f} €</b>", styleNormal))
        story.append(Spacer(1, 0.5*cm))

        cursor.execute('''
            SELECT m.categorie, SUM(maint.couts) as total
            FROM maintenances maint
            INNER JOIN materiel m ON maint.materiel_id = m.id
            WHERE MONTH(maint.date_debut) = MONTH(CURDATE())
            AND YEAR(maint.date_debut) = YEAR(CURDATE())
            GROUP BY m.categorie
            ORDER BY total DESC
        ''')
        coutsParCategorie = cursor.fetchall()

        dataCouts = [['Catégorie', 'Coûts (€)']]
        for cat in coutsParCategorie:
            dataCouts.append([
                cat['categorie'] or 'Non catégorisé',
                f"{float(cat['total']):.2f} €"
            ])

        tableCouts = Table(dataCouts, colWidths=[12*cm, 4*cm])
        tableCouts.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0051A5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tableCouts)

        # === PAGE 5 : ALERTES ===
        story.append(PageBreak())
        story.append(Paragraph("ALERTES ET POINTS D'ATTENTION", styleHeading))
        story.append(Paragraph("=" * 80, styleNormal))
        story.append(Spacer(1, 0.5*cm))

        # Retards
        cursor.execute('''
            SELECT COUNT(*) as nb FROM vue_emprunts_utilisateur
            WHERE statut_emprunt = 'en_cours' AND jours_retard > 0
        ''')
        nbRetards = cursor.fetchone()['nb']

        story.append(Paragraph(f"<b>Matériels en retard : {nbRetards}</b>", styleNormal))
        story.append(Spacer(1, 0.3*cm))

        cursor.execute('''
            SELECT emprunteur_nom, materiel_nom, jours_retard
            FROM vue_emprunts_utilisateur
            WHERE statut_emprunt = 'en_cours' AND jours_retard > 0
            ORDER BY jours_retard DESC
            LIMIT 10
        ''')
        retards = cursor.fetchall()

        dataRetards = [['Emprunteur', 'Matériel', 'Jours de retard']]
        for r in retards:
            dataRetards.append([
                r['emprunteur_nom'],
                r['materiel_nom'],
                str(r['jours_retard'])
            ])

        tableRetards = Table(dataRetards, colWidths=[6*cm, 6*cm, 4*cm])
        tableRetards.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF6B35')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tableRetards)
        story.append(Spacer(1, 1*cm))

        # Maintenances en cours
        cursor.execute('''
            SELECT COUNT(*) as nb FROM maintenances WHERE statut = 'en_cours'
        ''')
        nbMaintenancesEnCours = cursor.fetchone()['nb']

        story.append(Paragraph(f"<b>Maintenances en cours : {nbMaintenancesEnCours}</b>", styleNormal))
        story.append(Spacer(1, 0.3*cm))

        cursor.execute('''
            SELECT materiel_nom, technicien_nom, deadline
            FROM vue_maintenances_complet
            WHERE statut = 'en_cours'
            ORDER BY deadline
            LIMIT 10
        ''')
        maintenancesEnCours = cursor.fetchall()

        dataMaint = [['Matériel', 'Technicien', 'Deadline']]
        for m in maintenancesEnCours:
            dataMaint.append([
                m['materiel_nom'],
                m['technicien_nom'],
                FormaterDateFrancaise(m['deadline'])
            ])

        tableMaint = Table(dataMaint, colWidths=[6*cm, 6*cm, 4*cm])
        tableMaint.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF6B35')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(tableMaint)

        # Générer le PDF
        doc.build(story)

        conn.close()

        return send_file(cheminFichier, as_attachment=True, download_name=nomFichier)

    except Exception as e:
        print(f"Erreur export rapport mensuel: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
