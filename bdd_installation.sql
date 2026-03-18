-- ============================================
-- REMISE À ZÉRO TOTALE
-- Supprime TOUT et recrée proprement
-- ============================================

-- Supprimer la base complètement
DROP DATABASE IF EXISTS gestion_iut;

-- Recréer la base
CREATE DATABASE gestion_iut CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Utiliser la base
USE gestion_iut;

-- ============================================
-- TABLE MATERIEL
-- ============================================
CREATE TABLE materiel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    categorie VARCHAR(100),
    etat ENUM('en_stock', 'emprunte', 'en_maintenance') DEFAULT 'en_stock',
    localisation VARCHAR(100),
    description TEXT,
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_mouvement TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    date_retour_prevue DATE NULL,
    emprunteur_id INT NULL,
    technicien_id INT NULL,
    INDEX idx_etat (etat),
    INDEX idx_emprunteur (emprunteur_id),
    INDEX idx_technicien (technicien_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE USERS
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'eleve', 'enseignant', 'technicien') NOT NULL,
    email_verifie BOOLEAN DEFAULT 0,
    code_verification VARCHAR(6) NULL,
    date_code_expiration TIMESTAMP NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_derniere_connexion TIMESTAMP NULL,
    actif BOOLEAN DEFAULT 1,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE EMPRUNTS
-- ============================================
CREATE TABLE emprunts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materiel_id INT NOT NULL,
    emprunteur_id INT NOT NULL,
    date_emprunt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_retour_prevue DATE NOT NULL,
    date_retour_effective TIMESTAMP NULL,
    jours_retard INT DEFAULT 0,
    commentaire TEXT,
    FOREIGN KEY (materiel_id) REFERENCES materiel(id) ON DELETE CASCADE,
    FOREIGN KEY (emprunteur_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_materiel (materiel_id),
    INDEX idx_emprunteur (emprunteur_id),
    INDEX idx_date_emprunt (date_emprunt),
    INDEX idx_retard (jours_retard)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE MAINTENANCES
-- ============================================
CREATE TABLE maintenances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materiel_id INT NOT NULL,
    technicien_id INT NOT NULL,
    date_debut TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_fin TIMESTAMP NULL,
    deadline DATE NOT NULL,
    composants_commandes TEXT,
    couts DECIMAL(10,2) DEFAULT 0.00,
    rapport TEXT,
    statut ENUM('en_cours', 'terminee') DEFAULT 'en_cours',
    FOREIGN KEY (materiel_id) REFERENCES materiel(id) ON DELETE CASCADE,
    FOREIGN KEY (technicien_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_materiel (materiel_id),
    INDEX idx_technicien (technicien_id),
    INDEX idx_statut (statut),
    INDEX idx_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE PHOTOS_MATERIEL
-- ============================================
CREATE TABLE photos_materiel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materiel_id INT NOT NULL,
    chemin_photo VARCHAR(255) NOT NULL,
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (materiel_id) REFERENCES materiel(id) ON DELETE CASCADE,
    INDEX idx_materiel (materiel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- COMPTE  PAR DÉFAUT
-- ============================================
-- Mot de passe: M@teriel2025

INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, date_creation)
VALUES (
    'Admin',
    'IUT GEII',
    'admin@iut.fr',
    '$2b$12$ESwdyBqxDiPLuDxITn3FO.IYeJVUNvxL/iFiPp3UB97Qv1cVy74yG',
    'admin',
    1,
    NOW()
);
INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, date_creation)
VALUES (
    'Enseignant',
    'IUT GEII',
    'enseignant@iut.fr',
    '$2b$12$ESwdyBqxDiPLuDxITn3FO.IYeJVUNvxL/iFiPp3UB97Qv1cVy74yG',
    'enseignant',
    1,
    NOW()
);
INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, date_creation)
VALUES (
    'Eleve',
    'IUT GEII',
    'eleve@iut.fr',
    '$2b$12$ESwdyBqxDiPLuDxITn3FO.IYeJVUNvxL/iFiPp3UB97Qv1cVy74yG',
    'eleve',
    1,
    NOW()
);
INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, date_creation)
VALUES (
    'Technicien',
    'IUT GEII',
    'technicien@iut.fr',
    '$2b$12$ESwdyBqxDiPLuDxITn3FO.IYeJVUNvxL/iFiPp3UB97Qv1cVy74yG',
    'technicien',
    1,
    NOW()
);

-- ============================================
-- CONTRAINTES CLÉ ÉTRANGÈRE SUR MATERIEL
-- ============================================
ALTER TABLE materiel
ADD CONSTRAINT fk_materiel_emprunteur
FOREIGN KEY (emprunteur_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE materiel
ADD CONSTRAINT fk_materiel_technicien
FOREIGN KEY (technicien_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- VUES
-- ============================================
CREATE OR REPLACE VIEW vue_materiel_complet AS
SELECT
    m.id,
    m.nom,
    m.categorie,
    m.etat,
    m.localisation,
    m.description,
    m.date_ajout,
    m.date_mouvement,
    m.date_retour_prevue,
    m.emprunteur_id,
    CONCAT(e.prenom, ' ', e.nom) AS emprunteur_nom_complet,
    e.email AS emprunteur_email,
    e.role AS emprunteur_role,
    m.technicien_id,
    CONCAT(t.prenom, ' ', t.nom) AS technicien_nom_complet,
    t.email AS technicien_email,
    CASE
        WHEN m.date_retour_prevue IS NOT NULL AND m.date_retour_prevue < CURDATE()
        THEN DATEDIFF(CURDATE(), m.date_retour_prevue)
        ELSE 0
    END AS jours_retard,
    (SELECT COUNT(*) FROM photos_materiel p WHERE p.materiel_id = m.id) AS nb_photos
FROM materiel m
LEFT JOIN users e ON m.emprunteur_id = e.id
LEFT JOIN users t ON m.technicien_id = t.id;

-- Vue pour l'historique des emprunts d'un utilisateur
CREATE OR REPLACE VIEW vue_emprunts_utilisateur AS
SELECT
    emp.id,
    emp.emprunteur_id,
    CONCAT(u.prenom, ' ', u.nom) AS emprunteur_nom,
    u.email AS emprunteur_email,
    u.role AS emprunteur_role,
    emp.materiel_id,
    m.nom AS materiel_nom,
    m.categorie AS materiel_categorie,
    emp.date_emprunt,
    emp.date_retour_prevue,
    emp.date_retour_effective,
    emp.jours_retard,
    emp.commentaire,
    -- Statut de l'emprunt
    CASE
        WHEN emp.date_retour_effective IS NULL THEN 'en_cours'
        WHEN emp.jours_retard > 0 THEN 'retourne_en_retard'
        ELSE 'retourne_a_temps'
    END AS statut_emprunt,
    -- Durée de l'emprunt
    CASE
        WHEN emp.date_retour_effective IS NOT NULL
        THEN DATEDIFF(emp.date_retour_effective, emp.date_emprunt)
        ELSE DATEDIFF(CURDATE(), emp.date_emprunt)
    END AS duree_jours
FROM emprunts emp
INNER JOIN users u ON emp.emprunteur_id = u.id
INNER JOIN materiel m ON emp.materiel_id = m.id;

-- Vue pour les maintenances
CREATE OR REPLACE VIEW vue_maintenances_complet AS
SELECT
    maint.id,
    maint.materiel_id,
    mat.nom AS materiel_nom,
    mat.categorie AS materiel_categorie,
    maint.technicien_id,
    CONCAT(u.prenom, ' ', u.nom) AS technicien_nom,
    u.email AS technicien_email,
    maint.date_debut,
    maint.date_fin,
    maint.deadline,
    maint.composants_commandes,
    maint.couts,
    maint.rapport,
    maint.statut,
    -- Calcul de la durée
    CASE
        WHEN maint.date_fin IS NOT NULL
        THEN DATEDIFF(maint.date_fin, maint.date_debut)
        ELSE DATEDIFF(CURDATE(), maint.date_debut)
    END AS duree_jours,
    -- Jours restants avant deadline
    CASE
        WHEN maint.statut = 'en_cours' AND maint.deadline IS NOT NULL
        THEN DATEDIFF(maint.deadline, CURDATE())
        ELSE NULL
    END AS jours_avant_deadline
FROM maintenances maint
INNER JOIN materiel mat ON maint.materiel_id = mat.id
INNER JOIN users u ON maint.technicien_id = u.id;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger : Créer un enregistrement d'emprunt
DROP TRIGGER IF EXISTS trigger_emprunt_creation;
DELIMITER //
CREATE TRIGGER trigger_emprunt_creation
AFTER UPDATE ON materiel
FOR EACH ROW
BEGIN
    IF OLD.etat != 'emprunte' AND NEW.etat = 'emprunte' AND NEW.emprunteur_id IS NOT NULL THEN
        INSERT INTO emprunts (materiel_id, emprunteur_id, date_emprunt, date_retour_prevue, jours_retard)
        VALUES (NEW.id, NEW.emprunteur_id, NOW(),
                COALESCE(NEW.date_retour_prevue, DATE_ADD(CURDATE(), INTERVAL 7 DAY)),
                0);
    END IF;
END //
DELIMITER ;

-- Trigger : Mettre à jour l'emprunt au retour
DROP TRIGGER IF EXISTS trigger_emprunt_retour;
DELIMITER //
CREATE TRIGGER trigger_emprunt_retour
AFTER UPDATE ON materiel
FOR EACH ROW
BEGIN
    IF OLD.etat = 'emprunte' AND NEW.etat = 'en_stock' THEN
        UPDATE emprunts
        SET date_retour_effective = NOW(),
            jours_retard = CASE
                WHEN date_retour_prevue < CURDATE()
                THEN DATEDIFF(CURDATE(), date_retour_prevue)
                ELSE 0
            END
        WHERE materiel_id = NEW.id
        AND date_retour_effective IS NULL
        ORDER BY date_emprunt DESC
        LIMIT 1;
    END IF;
END //
DELIMITER ;

-- Trigger : Créer un enregistrement de maintenance
DROP TRIGGER IF EXISTS trigger_maintenance_creation;
DELIMITER //
CREATE TRIGGER trigger_maintenance_creation
AFTER UPDATE ON materiel
FOR EACH ROW
BEGIN
    IF OLD.etat != 'en_maintenance' AND NEW.etat = 'en_maintenance' AND NEW.technicien_id IS NOT NULL THEN
        INSERT INTO maintenances (materiel_id, technicien_id, date_debut, deadline, statut)
        VALUES (NEW.id, NEW.technicien_id, NOW(),
                DATE_ADD(CURDATE(), INTERVAL 14 DAY),
                'en_cours');
    END IF;
END //
DELIMITER ;

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================
SELECT 'Base de donnees creee avec succes !' AS Statut;
SELECT COUNT(*) AS 'Nombre de tables' FROM information_schema.tables WHERE table_schema = 'gestion_iut';
SELECT COUNT(*) AS 'Nombre de vues' FROM information_schema.views WHERE table_schema = 'gestion_iut';
SELECT COUNT(*) AS 'Nombre de triggers' FROM information_schema.triggers WHERE trigger_schema = 'gestion_iut';
SELECT COUNT(*) AS 'Nombre utilisateurs' FROM users;

-- Afficher le compte admin par defaut
SELECT
    CONCAT(prenom, ' ', nom) AS 'Nom complet',
    email AS 'Email de connexion',
    'M@teriel2025' AS 'Mot de passe par defaut',
    role AS 'Role'
FROM users
WHERE role = 'admin'
LIMIT 1;
