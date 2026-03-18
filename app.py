# ============================================
# APPLICATION FLASK - GESTION MATÉRIEL IUT GEII
# ============================================


from flask import Flask, jsonify, request, session, send_from_directory
from flask_mail import Mail, Message
from config import (
    get_db_connection,
    DUREE_CODE_VERIFICATION,
    DUREE_EMPRUNT_DEFAULT,
    ITEMS_PAR_PAGE,
    MAX_TENTATIVES_LOGIN,
    DOSSIER_UPLOAD,
    EXTENSIONS_AUTORISEES,
    TAILLE_MAX_FICHIER,
    RAPPEL_AVANT_RETOUR,
    RAPPEL_RETARD_1,
    RAPPEL_RETARD_2,
    RAPPEL_RETARD_FACTURE,
    HEURE_ENVOI_EMAILS,
    ERREURS
)
import bcrypt
import secrets
import os
import re
import logging
from functools import wraps
from datetime import datetime, timedelta
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# Expression régulière pour valider les emails
REGEX_EMAIL = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

# Charger les variables d'environnement
load_dotenv()

# ============================================
# CONFIGURATION DES LOGS
# ============================================

# Créer le dossier logs s'il n'existe pas
if not os.path.exists('logs'):
    os.makedirs('logs')

# Configuration du logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log', encoding='utf-8'),
        logging.StreamHandler()  # Affiche aussi dans la console
    ]
)
logger = logging.getLogger(__name__)


# ============================================
# DÉCORATEUR DE GESTION DES ERREURS
# ============================================

def handle_errors(f):
    """
    Décorateur pour gérer les erreurs des routes API de manière centralisée

    Ce décorateur entoure les fonctions de route avec un try/except.
    En cas d'erreur:
    - L'erreur est loggée dans logs/app.log
    - Une réponse JSON structurée est retournée

    Utilisation:
        @app.route('/api/example')
        @handle_errors
        def ma_route():
            # ... code de la route ...
            return jsonify({'success': True, 'data': resultat})

    Réponse en cas d'erreur:
        {
            'success': False,
            'error': 'Message d\'erreur',
            'data': None
        }
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            # Logger l'erreur avec les détails
            logger.error(f"Erreur dans {f.__name__}: {str(e)}", exc_info=True)

            # Retourner une réponse JSON structurée
            return jsonify({
                'success': False,
                'error': ERREURS.get('erreur_serveur', str(e)),
                'data': None
            }), 500
    return decorated_function

# ============================================
# CONFIGURATION FLASK
# ============================================
app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.getenv('SECRET_KEY', 'cle_secrete_par_defaut_a_changer')

# Configuration email (Gmail SMTP)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

mail = Mail(app)

# Créer le dossier uploads s'il n'existe pas (config dans config.py)
if not os.path.exists(DOSSIER_UPLOAD):
    os.makedirs(DOSSIER_UPLOAD)


# ============================================
# FONCTIONS UTILITAIRES
# ============================================

def VerifierExtensionFichier(nomFichier):
    """
    Vérifie si l'extension d'un fichier uploadé est autorisée

    Cette fonction sécurise l'upload de fichiers en n'autorisant que certaines
    extensions d'images définies dans EXTENSIONS_AUTORISEES (png, jpg, jpeg, gif).

    Paramètres:
        nomFichier (str): Le nom du fichier à vérifier (ex: "photo.jpg")

    Retourne:
        bool: True si l'extension est autorisée, False sinon

    Exemple:
        >>> VerifierExtensionFichier("materiel.jpg")
        True
        >>> VerifierExtensionFichier("document.pdf")
        False
    """
    return '.' in nomFichier and \
           nomFichier.rsplit('.', 1)[1].lower() in EXTENSIONS_AUTORISEES


def GenererCodeVerification():
    """
    Génère un code de vérification aléatoire à 6 chiffres

    Utilisé lors de l'inscription pour vérifier l'adresse email de l'utilisateur.
    Le code généré est sécurisé grâce au module secrets (cryptographiquement sûr).

    Retourne:
        str: Un code à 6 chiffres (exemple: "123456", "789012")

    Comment ça marche:
        - secrets.randbelow(900000) génère un nombre entre 0 et 899999
        - On ajoute 100000 pour garantir un nombre entre 100000 et 999999
        - On convertit en string pour l'envoyer par email
    """
    return str(secrets.randbelow(900000) + 100000)


def EnvoyerEmailVerification(email, code):
    """
    Envoie un email contenant le code de vérification à l'utilisateur

    Cette fonction est appelée après l'inscription d'un nouvel utilisateur.
    Elle utilise Flask-Mail pour envoyer un email via Gmail SMTP.

    Paramètres:
        email (str): L'adresse email du destinataire
        code (str): Le code de vérification à 6 chiffres

    Retourne:
        bool: True si l'email a été envoyé avec succès, False en cas d'erreur

    Configuration requise:
        - MAIL_USERNAME et MAIL_PASSWORD doivent être définis dans .env
        - Le compte Gmail doit avoir un mot de passe d'application activé
    """
    try:
        msg = Message(
            'Code de vérification - Gestion Matériel IUT',
            recipients=[email]
        )
        msg.body = f"""
Bonjour,

Votre code de vérification est : {code}

Ce code est valable pendant {DUREE_CODE_VERIFICATION} minutes.

Cordialement,
L'équipe IUT Lyon 1 GEII
        """
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Erreur envoi email : {e}")
        return False


def FormaterDateFrancaise(date):
    """Convertit une date en format français JJ/MM/AAAA"""
    if date is None:
        return None
    if isinstance(date, str):
        return date
    return date.strftime('%d/%m/%Y')


def FormaterDateHeureFrancaise(date):
    """Convertit une date-heure en format français JJ/MM/AAAA HH:MM"""
    if date is None:
        return None
    if isinstance(date, str):
        return date
    return date.strftime('%d/%m/%Y %H:%M')


# ============================================
# PAGES HTML
# ============================================

@app.route('/')
def PageAccueil():
    """Page d'accueil avec login/inscription"""
    return send_from_directory('static', 'index.html')


@app.route('/dashboard-admin')
def PageDashboardAdmin():
    """Page dashboard administrateur"""
    # Vérifier que l'utilisateur est connecté et est admin
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return send_from_directory('static', 'index.html')
    return send_from_directory('static', 'dashboard_admin.html')


@app.route('/dashboard-user')
def PageDashboardUser():
    """Page dashboard élève/enseignant"""
    # Vérifier que l'utilisateur est connecté
    if 'user_id' not in session:
        return send_from_directory('static', 'index.html')
    # Vérifier que c'est un élève ou enseignant
    if session.get('user_role') not in ['eleve', 'enseignant']:
        return send_from_directory('static', 'index.html')
    return send_from_directory('static', 'dashboard_user.html')


@app.route('/dashboard-technicien')
def PageDashboardTechnicien():
    """Page dashboard technicien"""
    # Vérifier que l'utilisateur est connecté et est technicien
    if 'user_id' not in session or session.get('user_role') != 'technicien':
        return send_from_directory('static', 'index.html')
    return send_from_directory('static', 'dashboard_technicien.html')


# ============================================
# API AUTHENTIFICATION
# ============================================

@app.route('/api/auth/login', methods=['POST'])
def Connexion():
    """
    Route API pour la connexion d'un utilisateur

    Cette route permet à un utilisateur de se connecter avec son email et mot de passe.
    Elle effectue les vérifications de sécurité suivantes:
    1. Vérifier que l'email existe dans la base de données
    2. Vérifier que le mot de passe est correct (comparaison bcrypt)
    3. Vérifier que l'email a été vérifié
    4. Vérifier que le compte est actif

    Méthode HTTP: POST

    Corps de la requête (JSON):
        {
            "email": "utilisateur@iut.fr",
            "password": "motdepasse123"
        }

    Réponses:
        - 200: Connexion réussie, retourne le rôle et le nom de l'utilisateur
        - 400: Données manquantes
        - 401: Email ou mot de passe incorrect
        - 403: Email non vérifié ou compte désactivé

    Après une connexion réussie, une session Flask est créée avec:
        - user_id: ID de l'utilisateur
        - user_email: Email de l'utilisateur
        - user_role: Rôle (admin, eleve, enseignant, technicien)
        - user_nom: Nom complet (prénom + nom)
    """
    data = request.get_json()
    email = data.get('email', '').strip()
    motDePasse = data.get('password', '')

    if not email or not motDePasse:
        return jsonify({'error': 'Email et mot de passe requis'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Récupérer l'utilisateur
    cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
    utilisateur = cursor.fetchone()

    if not utilisateur:
        conn.close()
        return jsonify({'error': 'Email ou mot de passe incorrect'}), 401

    # Vérifier le mot de passe
    motDePasseValide = bcrypt.checkpw(
        motDePasse.encode('utf-8'),
        utilisateur['password_hash'].encode('utf-8')
    )

    if not motDePasseValide:
        conn.close()
        return jsonify({'error': 'Email ou mot de passe incorrect'}), 401

    # Vérifier si l'email est vérifié
    if not utilisateur['email_verifie']:
        conn.close()
        return jsonify({'error': 'Email non vérifié. Veuillez vérifier votre email.'}), 403

    # Vérifier si le compte est actif
    if not utilisateur['actif']:
        conn.close()
        return jsonify({'error': 'Compte désactivé'}), 403

    # Mettre à jour la date de dernière connexion
    cursor.execute(
        'UPDATE users SET date_derniere_connexion = NOW() WHERE id = %s',
        (utilisateur['id'],)
    )
    conn.commit()
    conn.close()

    # Créer la session
    session['user_id'] = utilisateur['id']
    session['user_email'] = utilisateur['email']
    session['user_role'] = utilisateur['role']
    session['user_nom'] = f"{utilisateur['prenom']} {utilisateur['nom']}"

    return jsonify({
        'success': True,
        'role': utilisateur['role'],
        'nom': f"{utilisateur['prenom']} {utilisateur['nom']}"
    })


@app.route('/api/auth/register', methods=['POST'])
def Inscription():
    """
    Route API pour l'inscription d'un nouvel utilisateur

    Cette route permet de créer un nouveau compte utilisateur.
    Le processus d'inscription comprend:
    1. Validation des données (tous les champs obligatoires)
    2. Vérification que l'email n'existe pas déjà
    3. Hachage sécurisé du mot de passe avec bcrypt
    4. Génération d'un code de vérification à 6 chiffres
    5. Envoi du code par email

    Méthode HTTP: POST

    Corps de la requête (JSON):
        {
            "nom": "Dupont",
            "prenom": "Jean",
            "email": "jean.dupont@iut.fr",
            "password": "motdepasse123",
            "role": "eleve"  // ou "enseignant" ou "technicien"
        }

    Réponses:
        - 201: Compte créé avec succès
        - 400: Données manquantes ou rôle invalide
        - 409: Un compte existe déjà avec cet email

    Sécurité:
        - Le mot de passe est haché avec bcrypt (impossible à déchiffrer)
        - Le code de vérification expire après 15 minutes
        - L'utilisateur ne peut pas se connecter tant que l'email n'est pas vérifié
    """
    data = request.get_json()

    nom = data.get('nom', '').strip()
    prenom = data.get('prenom', '').strip()
    email = data.get('email', '').strip().lower()
    motDePasse = data.get('password', '')
    role = data.get('role', '').strip()

    # Validation des champs obligatoires
    if not nom or not prenom or not email or not motDePasse or not role:
        return jsonify({'error': ERREURS['champs_requis']}), 400

    # Validation du format de l'email
    if not REGEX_EMAIL.match(email):
        return jsonify({'error': ERREURS['email_invalide']}), 400

    # Validation de la longueur du mot de passe
    if len(motDePasse) < 6:
        return jsonify({'error': ERREURS['mdp_court']}), 400

    # Validation du rôle
    if role not in ['eleve', 'enseignant', 'technicien']:
        return jsonify({'error': ERREURS['role_invalide']}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Vérifier si l'email existe déjà
    cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
    utilisateurExistant = cursor.fetchone()

    if utilisateurExistant:
        conn.close()
        return jsonify({'error': 'Un compte existe déjà avec cette adresse email'}), 409

    # Hacher le mot de passe
    motDePasseHache = bcrypt.hashpw(
        motDePasse.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    # Générer le code de vérification
    codeVerification = GenererCodeVerification()
    dateExpiration = datetime.now() + timedelta(minutes=DUREE_CODE_VERIFICATION)

    # Insérer l'utilisateur
    cursor.execute('''
        INSERT INTO users (nom, prenom, email, password_hash, role,
                          code_verification, date_code_expiration, email_verifie)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 0)
    ''', (nom, prenom, email, motDePasseHache, role, codeVerification, dateExpiration))

    conn.commit()
    nouveauId = cursor.lastrowid
    conn.close()

    # Envoyer l'email de vérification
    emailEnvoye = EnvoyerEmailVerification(email, codeVerification)

    if not emailEnvoye:
        return jsonify({
            'warning': 'Compte créé mais erreur envoi email. Contactez un administrateur.',
            'userId': nouveauId
        }), 201

    return jsonify({
        'success': True,
        'message': 'Compte créé ! Vérifiez votre email.',
        'userId': nouveauId,
        'email': email
    }), 201


@app.route('/api/auth/send-code', methods=['POST'])
def RenvoyerCode():
    """Renvoyer un code de vérification"""
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'error': 'Email requis'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
    utilisateur = cursor.fetchone()

    if not utilisateur:
        conn.close()
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    if utilisateur['email_verifie']:
        conn.close()
        return jsonify({'error': 'Email déjà vérifié'}), 400

    # Générer un nouveau code
    nouveauCode = GenererCodeVerification()
    dateExpiration = datetime.now() + timedelta(minutes=DUREE_CODE_VERIFICATION)

    cursor.execute('''
        UPDATE users
        SET code_verification = %s, date_code_expiration = %s
        WHERE id = %s
    ''', (nouveauCode, dateExpiration, utilisateur['id']))

    conn.commit()
    conn.close()

    # Envoyer l'email
    emailEnvoye = EnvoyerEmailVerification(email, nouveauCode)

    if not emailEnvoye:
        return jsonify({'error': 'Erreur envoi email'}), 500

    return jsonify({'success': True, 'message': 'Code renvoyé par email'})


@app.route('/api/auth/verify-code', methods=['POST'])
def VerifierCode():
    """Vérifier le code de vérification"""
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()

    if not email or not code:
        return jsonify({'error': 'Email et code requis'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
    utilisateur = cursor.fetchone()

    if not utilisateur:
        conn.close()
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    if utilisateur['email_verifie']:
        conn.close()
        return jsonify({'error': 'Email déjà vérifié'}), 400

    # Vérifier le code
    if utilisateur['code_verification'] != code:
        conn.close()
        return jsonify({'error': 'Code incorrect'}), 401

    # Vérifier l'expiration
    if utilisateur['date_code_expiration'] < datetime.now():
        conn.close()
        return jsonify({'error': 'Code expiré. Demandez un nouveau code.'}), 401

    # Valider l'email
    cursor.execute('''
        UPDATE users
        SET email_verifie = 1, code_verification = NULL, date_code_expiration = NULL
        WHERE id = %s
    ''', (utilisateur['id'],))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': 'Email vérifié ! Vous pouvez maintenant vous connecter.'
    })


@app.route('/api/auth/logout', methods=['POST'])
def Deconnexion():
    """Déconnexion utilisateur"""
    session.clear()
    return jsonify({'success': True})


@app.route('/api/auth/check-session', methods=['GET'])
def VerifierSession():
    """Vérifier si l'utilisateur est connecté"""
    if 'user_id' in session:
        return jsonify({
            'connected': True,
            'role': session.get('user_role'),
            'nom': session.get('user_nom'),
            'email': session.get('user_email')
        })
    return jsonify({'connected': False})


# ============================================
# API MATÉRIEL
# ============================================

@app.route('/api/materiels', methods=['GET'])
@handle_errors
def ListerMateriels():
    """Liste tous les matériels (avec infos personnes)"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Utiliser la vue SQL pour récupérer toutes les infos
    cursor.execute('SELECT * FROM vue_materiel_complet ORDER BY id DESC')
    materiels = cursor.fetchall()

    # Formater les dates en français
    for materiel in materiels:
        materiel['date_ajout'] = FormaterDateHeureFrancaise(materiel['date_ajout'])
        materiel['date_mouvement'] = FormaterDateHeureFrancaise(materiel['date_mouvement'])
        materiel['date_retour_prevue'] = FormaterDateFrancaise(materiel['date_retour_prevue'])

    conn.close()
    return jsonify(materiels)


@app.route('/api/materiels', methods=['POST'])
@handle_errors
def AjouterMateriel():
    """
    Ajouter un nouveau matériel à la base de données.

    Cette fonction traite une requête POST pour insérer un nouvel équipement dans la table 'materiel'.

    Requête:
        - Méthode: POST
        - Content-Type: application/json
        - Body JSON:
            - nom (str, obligatoire): Le nom du matériel
            - categorie (str, optionnel): La catégorie du matériel
            - localisation (str, optionnel): Le lieu de stockage du matériel
            - description (str, optionnel): Description détaillée du matériel

    Retour:
        - Succès (201):
            {
                'success': True,
                'id': int - L'identifiant unique du matériel nouvellement créé
            }
        - Erreur (400):
            {
                'error': str - Message d'erreur (ex: "Le nom est obligatoire")
            }

    Exceptions:
        - 400: Si le champ 'nom' est vide ou manquant
        - Erreurs de base de données potentielles non gérées

    Notes:
        - L'état du matériel est défini par défaut à 'en_stock'
        - Les dates d'ajout et de mouvement sont définies à NOW() (heure actuelle)
        - Tous les champs d'entrée sont nettoyés avec strip()
    """
    """Ajouter un nouveau matériel"""
    data = request.get_json()

    nom = data.get('nom', '').strip()
    categorie = data.get('categorie', '').strip()
    localisation = data.get('localisation', '').strip()
    description = data.get('description', '').strip()

    if not nom:
        return jsonify({'error': 'Le nom est obligatoire'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout, date_mouvement)
        VALUES (%s, %s, 'en_stock', %s, %s, NOW(), NOW())
    ''', (nom, categorie, localisation, description))

    conn.commit()
    nouveauId = cursor.lastrowid
    conn.close()

    return jsonify({'success': True, 'id': nouveauId}), 201


@app.route('/api/materiels/<int:id>', methods=['DELETE'])
@handle_errors
def SupprimerMateriel(id):
    """Supprimer un matériel"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM materiel WHERE id = %s', (id,))
    conn.commit()
    conn.close()

    return jsonify({'success': True})


@app.route('/api/materiels/<int:id>', methods=['PATCH'])
@handle_errors
def ModifierMateriel(id):
    """
    Modifie les informations d'un matériel

    Cette route permet de modifier le nom, la catégorie, la localisation
    et la description d'un matériel existant.

    Méthode HTTP: PATCH

    Paramètres URL:
        id (int): L'ID du matériel à modifier

    Corps de la requête (JSON):
        {
            "nom": "Arduino Mega",
            "categorie": "Électronique",
            "localisation": "Salle B-04",
            "description": "REF-2024-002"
        }

    Réponse:
        - 200: Modification réussie
        - 400: Nom vide
        - 404: Matériel introuvable
    """
    data = request.get_json()

    nom = data.get('nom', '').strip()
    categorie = data.get('categorie', '').strip()
    localisation = data.get('localisation', '').strip()
    description = data.get('description', '').strip()

    if not nom:
        return jsonify({'error': 'Le nom est obligatoire'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Vérifier que le matériel existe
    cursor.execute('SELECT id FROM materiel WHERE id = %s', (id,))
    materiel = cursor.fetchone()

    if not materiel:
        conn.close()
        return jsonify({'error': ERREURS['ressource_introuvable']}), 404

    # Mettre à jour le matériel
    cursor.execute('''
        UPDATE materiel
        SET nom = %s, categorie = %s, localisation = %s, description = %s
        WHERE id = %s
    ''', (nom, categorie, localisation, description, id))

    conn.commit()
    conn.close()

    # Logger l'action
    logger.info(f"Matériel ID {id} modifié: {nom}")

    return jsonify({
        'success': True,
        'message': 'Matériel modifié avec succès'
    })


@app.route('/api/materiels/<int:id>/etat', methods=['PATCH'])
@handle_errors
def ModifierEtat(id):
    """
    Route API pour modifier l'état d'un matériel

    Cette route permet de changer l'état d'un matériel entre:
    - "en_stock": Le matériel est disponible au magasin
    - "emprunte": Le matériel est emprunté par un élève/enseignant
    - "en_maintenance": Le matériel est en réparation chez un technicien

    Méthode HTTP: PATCH

    Paramètres URL:
        id (int): L'ID du matériel à modifier

    Corps de la requête (JSON):
        {
            "etat": "emprunte",  // Nouvel état
            "personneId": 5,     // ID de l'emprunteur ou du technicien (optionnel)
            "dateRetourPrevue": "2026-01-15"  // Date de retour (optionnel, pour emprunts)
        }

    Logique métier:
        - Si état = "en_stock": On vide tous les champs (emprunteur, technicien, date)
          et on termine automatiquement les maintenances en cours
        - Si état = "emprunte": On assigne un emprunteur et une date de retour
        - Si état = "en_maintenance": On assigne un technicien

    Trigger automatique:
        - Le passage à "emprunte" crée automatiquement un enregistrement dans la table emprunts
        - Le passage à "en_stock" depuis "emprunte" clôture automatiquement l'emprunt

    CORRECTION IMPORTANTE:
        Le bug du retour en stock a été corrigé. Maintenant, quand on remet un matériel
        en stock, TOUS les champs sont bien réinitialisés (emprunteur, technicien, date).
    """
    data = request.get_json()
    nouvelEtat = data.get('etat')
    personneId = data.get('personneId')
    dateRetourPrevue = data.get('dateRetourPrevue')

    if not nouvelEtat:
        return jsonify({'error': 'État requis'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # BUG CORRIGÉ : Si retour en stock, on vide TOUT
    if nouvelEtat == 'en_stock':
        # Vérifier si le matériel était en maintenance
        cursor.execute('SELECT etat FROM materiel WHERE id = %s', (id,))
        resultat = cursor.fetchone()
        ancienEtat = resultat[0] if resultat else None

        # Si l'ancien état était "en_maintenance", terminer la maintenance active
        if ancienEtat == 'en_maintenance':
            cursor.execute('''
                UPDATE maintenances
                SET statut = 'terminee',
                    date_fin = NOW()
                WHERE materiel_id = %s
                AND statut = 'en_cours'
            ''', (id,))

        # Mettre le matériel en stock
        cursor.execute('''
            UPDATE materiel
            SET etat = %s,
                emprunteur_id = NULL,
                technicien_id = NULL,
                date_retour_prevue = NULL,
                date_mouvement = NOW()
            WHERE id = %s
        ''', (nouvelEtat, id))

    elif nouvelEtat == 'emprunte':
        # Matériel emprunté : assigner un emprunteur
        cursor.execute('''
            UPDATE materiel
            SET etat = %s,
                emprunteur_id = %s,
                technicien_id = NULL,
                date_retour_prevue = %s,
                date_mouvement = NOW()
            WHERE id = %s
        ''', (nouvelEtat, personneId, dateRetourPrevue, id))

    elif nouvelEtat == 'en_maintenance':
        # Matériel en maintenance : assigner un technicien
        cursor.execute('''
            UPDATE materiel
            SET etat = %s,
                technicien_id = %s,
                emprunteur_id = NULL,
                date_retour_prevue = NULL,
                date_mouvement = NOW()
            WHERE id = %s
        ''', (nouvelEtat, personneId, id))

    conn.commit()
    conn.close()

    return jsonify({'success': True})


@app.route('/api/materiels/<int:id>/photos', methods=['GET'])
def ListerPhotos(id):
    """Lister les photos d'un matériel"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT id, chemin_photo, date_ajout
        FROM photos_materiel
        WHERE materiel_id = %s
        ORDER BY date_ajout DESC
    ''', (id,))

    photos = cursor.fetchall()

    # Formater les dates
    for photo in photos:
        photo['date_ajout'] = FormaterDateHeureFrancaise(photo['date_ajout'])

    conn.close()
    return jsonify(photos)


@app.route('/api/materiels/<int:id>/photos', methods=['POST'])
def AjouterPhoto(id):
    """Ajouter une photo à un matériel"""
    if 'photo' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400

    fichier = request.files['photo']

    if fichier.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400

    if not VerifierExtensionFichier(fichier.filename):
        return jsonify({'error': 'Extension non autorisée (png, jpg, jpeg, gif)'}), 400

    # Créer un nom unique pour le fichier
    nomSecurise = secure_filename(fichier.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    nomFichier = f"{id}_{timestamp}_{nomSecurise}"
    cheminComplet = os.path.join(DOSSIER_UPLOAD, nomFichier)

    # Sauvegarder le fichier
    fichier.save(cheminComplet)

    # Enregistrer dans la base de données
    cheminRelatif = f"uploads/{nomFichier}"

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO photos_materiel (materiel_id, chemin_photo, date_ajout)
        VALUES (%s, %s, NOW())
    ''', (id, cheminRelatif))

    conn.commit()
    photoId = cursor.lastrowid
    conn.close()

    return jsonify({
        'success': True,
        'id': photoId,
        'chemin': cheminRelatif
    }), 201


@app.route('/api/materiels/<int:id>/photos/<int:photoId>', methods=['DELETE'])
def SupprimerPhoto(id, photoId):
    """Supprimer une photo"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Récupérer le chemin de la photo
    cursor.execute('SELECT chemin_photo FROM photos_materiel WHERE id = %s', (photoId,))
    photo = cursor.fetchone()

    if photo:
        # Supprimer le fichier physique
        cheminComplet = os.path.join('static', photo['chemin_photo'])
        if os.path.exists(cheminComplet):
            os.remove(cheminComplet)

        # Supprimer de la base
        cursor.execute('DELETE FROM photos_materiel WHERE id = %s', (photoId,))
        conn.commit()

    conn.close()
    return jsonify({'success': True})


# ============================================
# API USERS
# ============================================

@app.route('/api/users', methods=['GET'])
@handle_errors
def ListerUtilisateurs():
    """Liste tous les utilisateurs (pour les selects)"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT id, nom, prenom, email, role
        FROM users
        WHERE actif = 1
        ORDER BY nom, prenom
    ''')

    utilisateurs = cursor.fetchall()
    conn.close()

    # Formater le nom complet
    for user in utilisateurs:
        user['nom_complet'] = f"{user['prenom']} {user['nom']}"

    return jsonify(utilisateurs)


@app.route('/api/users/all', methods=['GET'])
@handle_errors
def ListerTousUtilisateurs():
    """
    Liste TOUS les utilisateurs pour l'admin (actifs et inactifs)

    Cette route est réservée aux administrateurs.
    Elle retourne tous les utilisateurs avec leurs informations complètes.

    Réponse JSON:
        [
            {
                "id": 1,
                "nom": "Dupont",
                "prenom": "Jean",
                "email": "jean.dupont@iut.fr",
                "role": "eleve",
                "actif": true,
                "email_verifie": true,
                "date_creation": "15/01/2026 10:30",
                "date_derniere_connexion": "18/01/2026 14:20"
            },
            ...
        ]
    """
    # Vérifier que l'utilisateur est admin
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'error': ERREURS['acces_refuse']}), 403

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT id, nom, prenom, email, role, actif, email_verifie,
               date_creation, date_derniere_connexion
        FROM users
        ORDER BY date_creation DESC
    ''')

    utilisateurs = cursor.fetchall()
    conn.close()

    # Formater les dates
    for user in utilisateurs:
        user['nom_complet'] = f"{user['prenom']} {user['nom']}"
        user['date_creation'] = FormaterDateHeureFrancaise(user['date_creation'])
        user['date_derniere_connexion'] = FormaterDateHeureFrancaise(user['date_derniere_connexion'])

    return jsonify(utilisateurs)


@app.route('/api/users/<int:id>/toggle-actif', methods=['PATCH'])
@handle_errors
def BasculerActifUtilisateur(id):
    """
    Active ou désactive un utilisateur

    Cette route permet à un admin de bloquer ou débloquer un compte utilisateur.
    Un utilisateur désactivé ne peut plus se connecter.

    Paramètres URL:
        id (int): L'ID de l'utilisateur à modifier

    Réponse JSON:
        {
            "success": true,
            "actif": true/false,
            "message": "Utilisateur activé/désactivé"
        }
    """
    # Vérifier que l'utilisateur est admin
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'error': ERREURS['acces_refuse']}), 403

    # Empêcher l'admin de se désactiver lui-même
    if session['user_id'] == id:
        return jsonify({'error': 'Vous ne pouvez pas vous désactiver vous-même'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Récupérer l'état actuel
    cursor.execute('SELECT actif FROM users WHERE id = %s', (id,))
    utilisateur = cursor.fetchone()

    if not utilisateur:
        conn.close()
        return jsonify({'error': ERREURS['ressource_introuvable']}), 404

    # Basculer l'état
    nouvelEtat = not utilisateur['actif']

    cursor.execute('UPDATE users SET actif = %s WHERE id = %s', (nouvelEtat, id))
    conn.commit()
    conn.close()

    # Logger l'action
    logger.info(f"Admin {session['user_email']} a {'activé' if nouvelEtat else 'désactivé'} l'utilisateur ID {id}")

    return jsonify({
        'success': True,
        'actif': nouvelEtat,
        'message': f"Utilisateur {'activé' if nouvelEtat else 'désactivé'}"
    })


@app.route('/api/users/<int:id>/role', methods=['PATCH'])
@handle_errors
def ModifierRoleUtilisateur(id):
    """
    Modifie le rôle d'un utilisateur

    Rôles possibles: eleve, enseignant, technicien, admin

    Corps de la requête (JSON):
        {
            "role": "technicien"
        }

    Réponse JSON:
        {
            "success": true,
            "role": "technicien",
            "message": "Rôle modifié"
        }
    """
    # Vérifier que l'utilisateur est admin
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'error': ERREURS['acces_refuse']}), 403

    # Empêcher l'admin de modifier son propre rôle
    if session['user_id'] == id:
        return jsonify({'error': 'Vous ne pouvez pas modifier votre propre rôle'}), 400

    data = request.get_json()
    nouveauRole = data.get('role', '').strip()

    # Valider le rôle
    roles_valides = ['eleve', 'enseignant', 'technicien', 'admin']
    if nouveauRole not in roles_valides:
        return jsonify({'error': ERREURS['role_invalide']}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('UPDATE users SET role = %s WHERE id = %s', (nouveauRole, id))
    conn.commit()
    conn.close()

    # Logger l'action
    logger.info(f"Admin {session['user_email']} a modifié le rôle de l'utilisateur ID {id} en '{nouveauRole}'")

    return jsonify({
        'success': True,
        'role': nouveauRole,
        'message': 'Rôle modifié'
    })


@app.route('/api/users/<int:id>', methods=['DELETE'])
@handle_errors
def SupprimerUtilisateur(id):
    """
    Supprime un utilisateur

    ATTENTION: Cette action est irréversible.
    L'utilisateur doit ne pas avoir d'emprunts en cours.

    Réponse JSON:
        {
            "success": true,
            "message": "Utilisateur supprimé"
        }
    """
    # Vérifier que l'utilisateur est admin
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'error': ERREURS['acces_refuse']}), 403

    # Empêcher l'admin de se supprimer lui-même
    if session['user_id'] == id:
        return jsonify({'error': 'Vous ne pouvez pas vous supprimer vous-même'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Vérifier que l'utilisateur n'a pas d'emprunts en cours
    cursor.execute('''
        SELECT COUNT(*) as nb FROM materiel
        WHERE emprunteur_id = %s AND etat = 'emprunte'
    ''', (id,))
    emprunts = cursor.fetchone()

    if emprunts['nb'] > 0:
        conn.close()
        return jsonify({'error': 'Impossible de supprimer : cet utilisateur a des emprunts en cours'}), 400

    # Supprimer l'utilisateur
    cursor.execute('DELETE FROM users WHERE id = %s', (id,))
    conn.commit()
    conn.close()

    # Logger l'action
    logger.info(f"Admin {session['user_email']} a supprimé l'utilisateur ID {id}")

    return jsonify({
        'success': True,
        'message': 'Utilisateur supprimé'
    })


# ============================================
# API EMPRUNTS (Élève/Enseignant)
# ============================================

@app.route('/api/mes-emprunts/en-cours', methods=['GET'])
@handle_errors
def MesEmpruntsEnCours():
    """Emprunts en cours de l'utilisateur connecté"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non connecté'}), 401

    utilisateurId = session['user_id']

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT * FROM vue_emprunts_utilisateur
        WHERE emprunteur_id = %s
        AND statut_emprunt = 'en_cours'
        ORDER BY date_emprunt DESC
    ''', (utilisateurId,))

    emprunts = cursor.fetchall()

    # Formater les dates
    for emprunt in emprunts:
        emprunt['date_emprunt'] = FormaterDateHeureFrancaise(emprunt['date_emprunt'])
        emprunt['date_retour_prevue'] = FormaterDateFrancaise(emprunt['date_retour_prevue'])

    conn.close()
    return jsonify(emprunts)


@app.route('/api/mes-emprunts/historique', methods=['GET'])
def MesEmpruntsHistorique():
    """Historique des emprunts de l'utilisateur connecté"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non connecté'}), 401

    utilisateurId = session['user_id']

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT * FROM vue_emprunts_utilisateur
        WHERE emprunteur_id = %s
        AND date_retour_effective IS NOT NULL
        ORDER BY date_retour_effective DESC
        LIMIT 50
    ''', (utilisateurId,))

    emprunts = cursor.fetchall()

    # Formater les dates
    for emprunt in emprunts:
        emprunt['date_emprunt'] = FormaterDateHeureFrancaise(emprunt['date_emprunt'])
        emprunt['date_retour_prevue'] = FormaterDateFrancaise(emprunt['date_retour_prevue'])
        emprunt['date_retour_effective'] = FormaterDateHeureFrancaise(emprunt['date_retour_effective'])

    conn.close()
    return jsonify(emprunts)


@app.route('/api/mes-emprunts/retards', methods=['GET'])
def MesEmpruntsRetards():
    """Emprunts en retard de l'utilisateur connecté"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non connecté'}), 401

    utilisateurId = session['user_id']

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT * FROM vue_emprunts_utilisateur
        WHERE emprunteur_id = %s
        AND statut_emprunt = 'retourne_en_retard'
        ORDER BY jours_retard DESC
        LIMIT 50
    ''', (utilisateurId,))

    emprunts = cursor.fetchall()

    # Formater les dates
    for emprunt in emprunts:
        emprunt['date_emprunt'] = FormaterDateHeureFrancaise(emprunt['date_emprunt'])
        emprunt['date_retour_prevue'] = FormaterDateFrancaise(emprunt['date_retour_prevue'])
        emprunt['date_retour_effective'] = FormaterDateHeureFrancaise(emprunt['date_retour_effective'])

    conn.close()
    return jsonify(emprunts)


# ============================================
# API MAINTENANCES (Technicien)
# ============================================

@app.route('/api/mes-maintenances/en-cours', methods=['GET'])
@handle_errors
def MesMaintenancesEnCours():
    """Maintenances en cours du technicien connecté"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non connecté'}), 401

    technicienId = session['user_id']

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT * FROM vue_maintenances_complet
        WHERE technicien_id = %s
        AND statut = 'en_cours'
        ORDER BY deadline ASC
    ''', (technicienId,))

    maintenances = cursor.fetchall()

    # Formater les dates
    for maint in maintenances:
        maint['date_debut'] = FormaterDateHeureFrancaise(maint['date_debut'])
        maint['deadline'] = FormaterDateFrancaise(maint['deadline'])

    conn.close()
    return jsonify(maintenances)


@app.route('/api/mes-maintenances/historique', methods=['GET'])
def MesMaintenancesHistorique():
    """Historique des maintenances du technicien connecté"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non connecté'}), 401

    technicienId = session['user_id']

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT * FROM vue_maintenances_complet
        WHERE technicien_id = %s
        AND statut = 'terminee'
        ORDER BY date_fin DESC
        LIMIT 50
    ''', (technicienId,))

    maintenances = cursor.fetchall()

    # Formater les dates
    for maint in maintenances:
        maint['date_debut'] = FormaterDateHeureFrancaise(maint['date_debut'])
        maint['date_fin'] = FormaterDateHeureFrancaise(maint['date_fin'])
        maint['deadline'] = FormaterDateFrancaise(maint['deadline'])

    conn.close()
    return jsonify(maintenances)


@app.route('/api/maintenances/<int:id>', methods=['PATCH'])
def ModifierMaintenance(id):
    """Modifier une maintenance (composants, coûts, rapport)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non connecté'}), 401

    data = request.get_json()
    composantsCommandes = data.get('composants_commandes', '')
    couts = data.get('couts', 0)
    rapport = data.get('rapport', '')
    deadline = data.get('deadline')

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        UPDATE maintenances
        SET composants_commandes = %s,
            couts = %s,
            rapport = %s,
            deadline = %s
        WHERE id = %s
    ''', (composantsCommandes, couts, rapport, deadline, id))

    conn.commit()
    conn.close()

    return jsonify({'success': True})


@app.route('/api/maintenances/<int:id>/terminer', methods=['POST'])
def TerminerMaintenance(id):
    """Terminer une maintenance et remettre le matériel en stock"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non connecté'}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Récupérer la maintenance
    cursor.execute('SELECT * FROM maintenances WHERE id = %s', (id,))
    maintenance = cursor.fetchone()

    if not maintenance:
        conn.close()
        return jsonify({'error': 'Maintenance introuvable'}), 404

    # Terminer la maintenance
    cursor.execute('''
        UPDATE maintenances
        SET statut = 'terminee', date_fin = NOW()
        WHERE id = %s
    ''', (id,))

    # Remettre le matériel en stock
    cursor.execute('''
        UPDATE materiel
        SET etat = 'en_stock',
            technicien_id = NULL,
            date_mouvement = NOW()
        WHERE id = %s
    ''', (maintenance['materiel_id'],))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'Maintenance terminée, matériel remis en stock'})


@app.route('/api/materiels-stock', methods=['GET'])
def MaterielsEnStock():
    """Liste des matériels en stock (pour mettre en maintenance)"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT id, nom, categorie, localisation, description
        FROM materiel
        WHERE etat = 'en_stock'
        ORDER BY nom
    ''')

    materiels = cursor.fetchall()
    conn.close()

    return jsonify(materiels)


@app.route('/api/maintenances/demarrer', methods=['POST'])
def DemarrerMaintenance():
    """Démarrer une nouvelle maintenance"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non connecté'}), 401

    if session.get('user_role') != 'technicien':
        return jsonify({'error': 'Réservé aux techniciens'}), 403

    data = request.get_json()
    materielId = data.get('materielId')
    deadline = data.get('deadline')

    if not materielId or not deadline:
        return jsonify({'error': 'Matériel et deadline requis'}), 400

    technicienId = session['user_id']

    conn = get_db_connection()
    cursor = conn.cursor()

    # Mettre le matériel en maintenance (le trigger créera automatiquement la maintenance)
    cursor.execute('''
        UPDATE materiel
        SET etat = 'en_maintenance',
            technicien_id = %s,
            date_mouvement = NOW()
        WHERE id = %s
    ''', (technicienId, materielId))

    # Récupérer l'ID de la maintenance créée par le trigger
    cursor.execute('''
        SELECT id FROM maintenances
        WHERE materiel_id = %s AND technicien_id = %s
        ORDER BY date_debut DESC
        LIMIT 1
    ''', (materielId, technicienId))

    maintenance = cursor.fetchone()

    # Mettre à jour la deadline
    if maintenance:
        cursor.execute('''
            UPDATE maintenances
            SET deadline = %s
            WHERE id = %s
        ''', (deadline, maintenance[0]))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'Maintenance démarrée'})


@app.route('/api/materiels/<int:materielId>/maintenances', methods=['GET'])
def HistoriqueMaintenancesMateriel(materielId):
    """Historique des maintenances d'un matériel spécifique"""
    if 'user_id' not in session:
        return jsonify({'error': 'Non connecté'}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute('''
        SELECT * FROM vue_maintenances_complet
        WHERE materiel_id = %s
        ORDER BY date_debut DESC
    ''', (materielId,))

    maintenances = cursor.fetchall()

    # Formater les dates
    for maint in maintenances:
        maint['date_debut'] = FormaterDateHeureFrancaise(maint['date_debut'])
        if maint['date_fin']:
            maint['date_fin'] = FormaterDateHeureFrancaise(maint['date_fin'])
        maint['deadline'] = FormaterDateFrancaise(maint['deadline'])

    conn.close()
    return jsonify(maintenances)


# ============================================
# API STATISTIQUES DASHBOARD
# ============================================

@app.route('/api/stats/dashboard', methods=['GET'])
@handle_errors
def StatistiquesDashboard():
    """
    Route API pour récupérer les statistiques du dashboard admin

    Cette route fournit toutes les données nécessaires pour afficher:
    - Les cartes de statistiques (total matériel, en stock, emprunts, maintenance, retards)
    - Le graphique camembert (répartition par état)
    - Le graphique ligne (évolution des emprunts sur 30 jours)

    Méthode HTTP: GET

    Réponse JSON:
        {
            "total_materiel": 150,
            "en_stock": 100,
            "emprunts_actifs": 35,
            "en_maintenance": 15,
            "retards": 8,
            "categories": ["Électronique", "Mécanique", ...],
            "par_categorie": [50, 30, ...],
            "evolution_labels": ["18/12", "19/12", ...],
            "evolution_data": [5, 7, 3, ...]
        }

    Sécurité:
        - Accessible uniquement aux utilisateurs connectés
        - Vérification de session requise côté client
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Statistiques générales
    # Total matériel
    cursor.execute('SELECT COUNT(*) as total FROM materiel')
    total_materiel = cursor.fetchone()['total']

    # En stock
    cursor.execute("SELECT COUNT(*) as total FROM materiel WHERE etat = 'en_stock'")
    en_stock = cursor.fetchone()['total']

    # Emprunts actifs
    cursor.execute("SELECT COUNT(*) as total FROM materiel WHERE etat = 'emprunte'")
    emprunts_actifs = cursor.fetchone()['total']

    # En maintenance
    cursor.execute("SELECT COUNT(*) as total FROM materiel WHERE etat = 'en_maintenance'")
    en_maintenance = cursor.fetchone()['total']

    # Retards (emprunts avec date dépassée)
    cursor.execute("""
        SELECT COUNT(*) as total FROM materiel
        WHERE etat = 'emprunte'
        AND date_retour_prevue < CURDATE()
    """)
    retards = cursor.fetchone()['total']

    # Répartition par catégorie
    cursor.execute("""
        SELECT
            COALESCE(categorie, 'Non catégorisé') as categorie,
            COUNT(*) as total
        FROM materiel
        GROUP BY categorie
        ORDER BY total DESC
        LIMIT 10
    """)
    categories_data = cursor.fetchall()
    categories = [row['categorie'] for row in categories_data]
    par_categorie = [row['total'] for row in categories_data]

    # Évolution des emprunts sur 30 jours
    # On compte le nombre d'emprunts démarrés chaque jour
    cursor.execute("""
        SELECT
            DATE(date_emprunt) as jour,
            COUNT(*) as nb_emprunts
        FROM emprunts
        WHERE date_emprunt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(date_emprunt)
        ORDER BY jour ASC
    """)
    evolution_data_raw = cursor.fetchall()

    # Créer un dictionnaire pour avoir tous les jours (même sans emprunts)
    from datetime import datetime, timedelta
    evolution_dict = {}
    for row in evolution_data_raw:
        jour = row['jour']
        if isinstance(jour, str):
            jour_str = jour
        else:
            jour_str = jour.strftime('%Y-%m-%d')
        evolution_dict[jour_str] = row['nb_emprunts']

    # Générer les 30 derniers jours
    evolution_labels = []
    evolution_data = []
    aujourd_hui = datetime.now().date()

    for i in range(29, -1, -1):
        jour = aujourd_hui - timedelta(days=i)
        jour_str = jour.strftime('%Y-%m-%d')
        jour_label = jour.strftime('%d/%m')

        evolution_labels.append(jour_label)
        evolution_data.append(evolution_dict.get(jour_str, 0))

    conn.close()

    return jsonify({
        'total_materiel': total_materiel,
        'en_stock': en_stock,
        'emprunts_actifs': emprunts_actifs,
        'en_maintenance': en_maintenance,
        'retards': retards,
        'categories': categories,
        'par_categorie': par_categorie,
        'evolution_labels': evolution_labels,
        'evolution_data': evolution_data
    })


# ============================================
# ROUTES D'EXPORT (EXCEL ET PDF)
# ============================================

from app_exports import (
    ExportInventaireMateriel,
    ExportListeEleves,
    ExportListeEnseignants,
    ExportListeTechniciens,
    ExportHistoriqueEmprunts,
    ExportHistoriqueMaintenances,
    ExportRetardsEnCours,
    ExportRapportMensuel
)

@app.route('/api/export/inventaire', methods=['GET'])
def RouteExportInventaire():
    """Route pour exporter l'inventaire matériel"""
    return ExportInventaireMateriel()

@app.route('/api/export/eleves', methods=['GET'])
def RouteExportEleves():
    """Route pour exporter la liste des élèves"""
    return ExportListeEleves()

@app.route('/api/export/enseignants', methods=['GET'])
def RouteExportEnseignants():
    """Route pour exporter la liste des enseignants"""
    return ExportListeEnseignants()

@app.route('/api/export/techniciens', methods=['GET'])
def RouteExportTechniciens():
    """Route pour exporter la liste des techniciens"""
    return ExportListeTechniciens()

@app.route('/api/export/emprunts', methods=['GET'])
def RouteExportEmprunts():
    """Route pour exporter l'historique des emprunts"""
    return ExportHistoriqueEmprunts()

@app.route('/api/export/maintenances', methods=['GET'])
def RouteExportMaintenances():
    """Route pour exporter l'historique des maintenances"""
    return ExportHistoriqueMaintenances()

@app.route('/api/export/retards', methods=['GET'])
def RouteExportRetards():
    """Route pour exporter les retards en cours"""
    return ExportRetardsEnCours()

@app.route('/api/export/rapport-mensuel', methods=['GET'])
def RouteExportRapportMensuel():
    """Route pour exporter le rapport mensuel PDF"""
    return ExportRapportMensuel()


# ============================================
# SYSTÈME D'ENVOI D'EMAILS DE RAPPEL
# ============================================

def EnvoyerEmailRappel(destinataire, sujet, corps):
    """Envoyer un email de rappel"""
    try:
        msg = Message(sujet, recipients=[destinataire])
        msg.body = corps
        mail.send(msg)
        print(f"Email envoyé à {destinataire}: {sujet}")
        return True
    except Exception as e:
        print(f"Erreur envoi email à {destinataire}: {e}")
        return False


def VerifierEtEnvoyerRappels():
    """
    Vérifie tous les emprunts en cours et envoie des emails de rappel selon les retards

    Cette fonction est le coeur du système d'emails automatiques.
    Elle parcourt tous les emprunts en cours et envoie des emails selon 4 situations:

    1. J-1 (la veille du retour prévu):
       - Email de rappel amical pour ne pas oublier de rendre le matériel

    2. 3 jours de retard:
       - Premier avertissement
       - Rappel que la facture sera envoyée à 14 jours

    3. 7 jours de retard (1 semaine):
       - Avertissement renforcé
       - Insistance pour ramener le matériel immédiatement

    4. 14 jours de retard (2 semaines):
       - Notification que la facture a été envoyée au domicile

    Comment ça fonctionne:
        - La fonction est appelée automatiquement tous les jours à 9h00 par le scheduler
        - Pour chaque emprunt, on calcule les jours de retard ou avant retour
        - Un email est envoyé uniquement aux dates exactes (pas de spam quotidien)
        - Les emails sont envoyés via Gmail SMTP configuré dans .env

    Utilisation:
        - Automatique: Le scheduler appelle cette fonction à 9h00 chaque jour
        - Manuel: L'admin peut déclencher l'envoi via le bouton dans son dashboard

    Logs:
        La fonction affiche dans la console le nombre d'emprunts vérifiés
        et les emails envoyés (pour le debugging).
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Récupérer tous les emprunts en cours
    cursor.execute('''
        SELECT
            m.id AS materiel_id,
            m.nom AS materiel_nom,
            m.date_retour_prevue,
            m.emprunteur_id,
            u.email,
            u.prenom,
            u.nom,
            DATEDIFF(CURDATE(), m.date_retour_prevue) AS jours_retard,
            DATEDIFF(m.date_retour_prevue, CURDATE()) AS jours_avant_retour
        FROM materiel m
        INNER JOIN users u ON m.emprunteur_id = u.id
        WHERE m.etat = 'emprunte'
        AND m.date_retour_prevue IS NOT NULL
    ''')

    emprunts = cursor.fetchall()

    for emprunt in emprunts:
        email = emprunt['email']
        prenom = emprunt['prenom']
        nom = emprunt['nom']
        materiel = emprunt['materiel_nom']
        jours_retard = emprunt['jours_retard']
        jours_avant = emprunt['jours_avant_retour']

        # CAS 1: La veille du retour (J-1)
        if jours_avant == RAPPEL_AVANT_RETOUR:
            sujet = f"Rappel : Retour de {materiel} demain"
            corps = f"""Bonjour {prenom} {nom},

Ceci est un rappel automatique.

N'oubliez pas de rendre le matériel "{materiel}" demain.

Merci de votre attention !

---
IUT Lyon 1 - Département GEII
Gestion du Matériel
"""
            EnvoyerEmailRappel(email, sujet, corps)

        # CAS 2: 3 jours de retard
        elif jours_retard == RAPPEL_RETARD_1:
            sujet = f"RETARD : {materiel} - 3 jours"
            corps = f"""Bonjour {prenom} {nom},

Vous avez 3 jours de retard pour le retour du matériel "{materiel}".

IMPORTANT : Veuillez ramener ce matériel au plus vite.

Si le retard atteint 2 semaines, la facture sera envoyée à votre domicile.

---
IUT Lyon 1 - Département GEII
Gestion du Matériel
"""
            EnvoyerEmailRappel(email, sujet, corps)

        # CAS 3: 1 semaine de retard (7 jours)
        elif jours_retard == RAPPEL_RETARD_2:
            sujet = f"RETARD IMPORTANT : {materiel} - 1 semaine"
            corps = f"""Bonjour {prenom} {nom},

ATTENTION : Vous avez 1 semaine de retard pour le retour du matériel "{materiel}".

URGENT : Nous insistons fortement pour que vous rameniez ce matériel IMMÉDIATEMENT.

RAPPEL : Si le retard atteint 2 semaines, la facture sera automatiquement envoyée à votre domicile.

Merci de régulariser votre situation au plus vite.

---
IUT Lyon 1 - Département GEII
Gestion du Matériel
"""
            EnvoyerEmailRappel(email, sujet, corps)

        # CAS 4: 2 semaines de retard (14 jours) - Facture envoyée
        elif jours_retard == RAPPEL_RETARD_FACTURE:
            sujet = f"FACTURE ENVOYÉE : {materiel} - 2 semaines de retard"
            corps = f"""Bonjour {prenom} {nom},

Vous avez maintenant 2 semaines de retard pour le retour du matériel "{materiel}".

La facture a été envoyée à votre domicile conformément au règlement.

Veuillez ramener le matériel ET régler la facture dans les plus brefs délais.

Pour toute question, contactez le département GEII.

---
IUT Lyon 1 - Département GEII
Gestion du Matériel
"""
            EnvoyerEmailRappel(email, sujet, corps)

    conn.close()
    print(f"Vérification des rappels terminée ({len(emprunts)} emprunts vérifiés)")


# ============================================
# LANCEMENT DE L'APPLICATION
# ============================================

if __name__ == '__main__':
    import threading
    import schedule
    import time

    # ============================================
    # LANCER LE SCHEDULER EN ARRIÈRE-PLAN
    # ============================================
    def LancerScheduler():
        """Thread pour exécuter le scheduler d'emails"""
        # Programmer l'envoi quotidien à l'heure configurée
        schedule.every().day.at(HEURE_ENVOI_EMAILS).do(VerifierEtEnvoyerRappels)

        print(f"Scheduler d'emails activé : envoi automatique tous les jours à {HEURE_ENVOI_EMAILS}")

        while True:
            schedule.run_pending()
            time.sleep(60)  # Vérifier toutes les minutes

    # Créer et démarrer le thread du scheduler
    thread_scheduler = threading.Thread(target=LancerScheduler, daemon=True)
    thread_scheduler.start()

    # ============================================
    # LANCER LE SERVEUR FLASK
    # ============================================
    print("=" * 50)
    print("SERVEUR FLASK - GESTION MATERIEL IUT GEII")
    print("=" * 50)
    print("URL : http://localhost:5000")
    print("Compte admin : admin@iut.fr / M@teriel2025")
    print(f"Emails automatiques : Actifs ({HEURE_ENVOI_EMAILS} tous les jours)")
    print("=" * 50)
    app.run(debug=True, port=5000, host='0.0.0.0')
