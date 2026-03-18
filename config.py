# ============================================
# CONFIGURATION CENTRALISÉE - GESTION MATÉRIEL
# ============================================
# Fichier de configuration pour l'application
# Toutes les constantes sont regroupées ici
# ============================================

import mysql.connector
import os

# ============================================
# CONFIGURATION BASE DE DONNÉES
# ============================================

def get_db_connection():
    """
    Crée et retourne une connexion à la base de données MySQL

    Retourne:
        mysql.connector.connection: Connexion active à la base de données

    Utilisation:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # ... exécuter les requêtes ...
        conn.close()
    """
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Gestion_IUT691",
        database="gestion_iut",
        charset="utf8mb4"
    )
    return conn


# ============================================
# CONSTANTES DE L'APPLICATION
# ============================================

# Durée de validité du code de vérification email (en minutes)
DUREE_CODE_VERIFICATION = 15

# Durée par défaut d'un emprunt (en jours)
DUREE_EMPRUNT_DEFAULT = 14

# Nombre d'items par page pour la pagination
ITEMS_PAR_PAGE = 10

# Nombre maximum de tentatives de connexion avant blocage
MAX_TENTATIVES_LOGIN = 5


# ============================================
# CONFIGURATION UPLOAD DE FICHIERS
# ============================================

# Dossier où sont stockées les photos uploadées
DOSSIER_UPLOAD = os.path.join('static', 'uploads')

# Extensions de fichiers autorisées pour les photos
EXTENSIONS_AUTORISEES = {'png', 'jpg', 'jpeg', 'gif'}

# Taille maximale des fichiers uploadés (en octets)
TAILLE_MAX_FICHIER = 5 * 1024 * 1024  # 5 MB


# ============================================
# CONFIGURATION EMAILS
# ============================================

# Délais pour les rappels d'emprunt (en jours)
RAPPEL_AVANT_RETOUR = 1       # J-1 : rappel la veille
RAPPEL_RETARD_1 = 3           # Premier avertissement après 3 jours
RAPPEL_RETARD_2 = 7           # Deuxième avertissement après 1 semaine
RAPPEL_RETARD_FACTURE = 14    # Envoi facture après 2 semaines

# Heure d'envoi des emails automatiques
HEURE_ENVOI_EMAILS = "09:00"


# ============================================
# MESSAGES D'ERREUR STANDARDISÉS
# ============================================

ERREURS = {
    'champs_requis': 'Tous les champs sont obligatoires',
    'email_invalide': 'Adresse email invalide',
    'mdp_court': 'Le mot de passe doit contenir au moins 6 caractères',
    'email_existant': 'Un compte existe déjà avec cette adresse email',
    'role_invalide': 'Rôle invalide',
    'non_connecte': 'Non connecté',
    'acces_refuse': 'Accès refusé',
    'ressource_introuvable': 'Ressource introuvable',
    'email_mdp_incorrect': 'Email ou mot de passe incorrect',
    'email_non_verifie': 'Email non vérifié. Veuillez vérifier votre email.',
    'compte_desactive': 'Compte désactivé',
    'code_incorrect': 'Code de vérification incorrect',
    'code_expire': 'Code expiré. Demandez un nouveau code.',
    'extension_invalide': 'Extension non autorisée (png, jpg, jpeg, gif)',
    'fichier_vide': 'Aucun fichier fourni',
    'erreur_serveur': 'Erreur serveur. Veuillez réessayer.'
}
