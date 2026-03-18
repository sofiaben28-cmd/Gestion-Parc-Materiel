# Gestion du Matériel - IUT Lyon 1 GEII

Application web de gestion du matériel pour le département GEII de l'IUT Lyon 1.

**SAE Bases de Données Avancées - BUT3 GEII - Janvier 2026**
### [Lien du site](https://sisterlike-interbranchial-chace.ngrok-free.dev)
(Avec un ESP32 utilisé comme point d'accès en raison de perte de connexion au wifi )
---

## Fonctionnalités

### Administrateur
- Dashboard avec statistiques et graphiques (Chart.js)
- Gestion complète du matériel (CRUD)
- Gestion des utilisateurs (activation, rôles, suppression)
- Création d'emprunts et validation des retours
- Exports Excel et PDF
- Suivi des retards

### Élève / Enseignant
- Consultation du catalogue matériel
- Visualisation de ses emprunts en cours
- Historique des emprunts
- Suivi des retards

### Technicien
- Démarrage de maintenances
- Suivi des maintenances en cours
- Saisie des composants, coûts et rapports
- Historique des interventions

---

## Technologies

| Couche | Technologies |
|--------|--------------|
| **Backend** | Python 3.12, Flask 3.0, MySQL 8.0 |
| **Frontend** | HTML5, CSS3, JavaScript, Chart.js |
| **Sécurité** | bcrypt, Sessions Flask |
| **Exports** | openpyxl (Excel), reportlab (PDF) |
| **Emails** | Flask-Mail, Gmail SMTP |

---

## Installation rapide

### 1. Prérequis

- Python 3.10+
- MySQL 8.0+
- pip

### 2. Installation des dépendances

```bash
cd Gestion_MaterielAG
pip install -r requirements.txt
```

### 3. Configuration de la base de données

```bash
mysql -u root -p < bdd_installation.sql
```

### 4. Configuration de l'application

Créer un fichier `.env` à la racine :

```env
SECRET_KEY=votre_cle_secrete_aleatoire
MAIL_USERNAME=votre.email@gmail.com
MAIL_PASSWORD=votre_mot_de_passe_application
```

Modifier `config.py` si nécessaire (mot de passe MySQL).

### 5. Lancement

```bash
python app.py
```

Accéder à : **http://localhost:5000**

---

## Compte administrateur par défaut

| Champ | Valeur |
|-------|--------|
| Email | `admin@iut.fr` |
| Mot de passe | `M@teriel2025` |

---

## Structure du projet

```
Gestion_MaterielAG/
├── app.py                 # Application Flask (routes API)
├── app_exports.py         # Exports Excel/PDF
├── config.py              # Configuration
├── requirements.txt       # Dépendances Python
├── .env                   # Variables d'environnement
│
├── bdd_installation.sql   # Script SQL (production)
├── bdd_test.sql           # Script SQL (avec données test)
│
├── static/
│   ├── index.html         # Page connexion
│   ├── dashboard_admin.html
│   ├── dashboard_user.html
│   ├── dashboard_technicien.html
│   ├── css/style.css
│   └── js/
│       ├── auth.js
│       ├── admin.js
│       ├── user.js
│       ├── technicien.js
│       ├── theme.js
│       └── toast.js
│
├── diagrammes/            # Diagrammes UML (PlantUML)
├── logs/                  # Logs applicatifs
└── Documents/
    ├── Document_Conception_Maintenance.docx
    ├── Documentation_Tests.docx
    └── Document_Implementation.docx
```

---

## Base de données

### Tables (5)
- `users` - Utilisateurs (admin, élève, enseignant, technicien)
- `materiel` - Inventaire du matériel
- `emprunts` - Historique des emprunts
- `maintenances` - Historique des maintenances
- `photos_materiel` - Photos du matériel

### Vues SQL (3)
- `vue_materiel_complet` - Matériel avec infos emprunteur/technicien
- `vue_emprunts_utilisateur` - Emprunts avec statut calculé
- `vue_maintenances_complet` - Maintenances avec durées

### Triggers (3)
- `trigger_emprunt_creation` - Création automatique d'emprunt
- `trigger_emprunt_retour` - Clôture automatique d'emprunt
- `trigger_maintenance_creation` - Création automatique de maintenance

---

## API REST

### Authentification
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/verify-code` | Vérification email |
| POST | `/api/auth/logout` | Déconnexion |

### Matériel
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/materiels` | Liste du matériel |
| POST | `/api/materiels` | Ajouter matériel |
| PATCH | `/api/materiels/:id` | Modifier matériel |
| DELETE | `/api/materiels/:id` | Supprimer matériel |
| PATCH | `/api/materiels/:id/etat` | Changer état |

### Utilisateurs
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/users` | Liste utilisateurs actifs |
| GET | `/api/users/all` | Tous les utilisateurs (admin) |
| PATCH | `/api/users/:id/toggle-actif` | Activer/Désactiver |
| PATCH | `/api/users/:id/role` | Modifier rôle |
| DELETE | `/api/users/:id` | Supprimer utilisateur |

### Exports
| Méthode | Route | Format |
|---------|-------|--------|
| GET | `/api/export/inventaire` | Excel |
| GET | `/api/export/eleves` | Excel |
| GET | `/api/export/enseignants` | Excel |
| GET | `/api/export/techniciens` | Excel |
| GET | `/api/export/emprunts` | Excel |
| GET | `/api/export/maintenances` | Excel |
| GET | `/api/export/retards` | Excel |
| GET | `/api/export/rapport-mensuel` | PDF |

---

## Emails automatiques

L'application envoie des emails de rappel automatiquement :

| Délai | Type d'email |
|-------|--------------|
| J-1 | Rappel veille du retour |
| J+3 | Premier avertissement retard |
| J+7 | Avertissement renforcé |
| J+14 | Notification facture envoyée |

Envoi quotidien à **09:00** via le scheduler intégré.

---

## Thème clair/sombre

L'application supporte le mode sombre. Le bouton de bascule est disponible dans la sidebar de chaque dashboard.

---

## Comptes de test 

| Email | Rôle | Mot de passe |
|-------|------|--------------|
| admin@iut.fr | Admin | M@teriel2025 |
| enseignant@iut.fr | enseigannt | M@teriel2025 |
| eleve@iut.fr | eleve | M@teriel2025 |
| technicien@iut.fr | technicien | M@teriel2025 |

---

## Documentation

| Document | Description |
|----------|-------------|
| `Document_Conception_Maintenance.docx` | Architecture, conception, maintenance |
| `Documentation_Tests.docx` | Stratégie et cas de tests |
| `Document_Implementation.docx` | Guide d'installation complet |

---

## Diagrammes UML

Les diagrammes sont au format PlantUML dans le dossier `diagrammes/` :

- Diagramme de classes
- Diagramme d'objets
- Modèle Entité-Association
- Schéma relationnel
- Architecture 3-tiers
- Cas d'utilisation
- Séquence (processus d'emprunt)

---

## Auteurs

**BUT3 GEII - IUT Lyon 1**

SAE Bases de Données Avancées - Janvier 2026

---

## Licence

Projet académique - IUT Lyon 1 - Université Claude Bernard
>>>>>>> 04236ba (Projet final | Livrables compris)
