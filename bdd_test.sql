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
-- COMPTE ADMIN PAR DÉFAUT
-- ============================================
-- Email: admin@iut.fr
-- Mot de passe: M@teriel2025

INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, date_creation)
VALUES (
    'Admin',
    'IUT GEII',
    'admin@iut.fr',
    '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u',
    'admin',
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
-- DONNÉES DE TEST - UTILISATEURS
-- ============================================
-- Mot de passe pour tous les comptes de test : M@teriel2025
-- Hash bcrypt généré avec coût 12

-- Techniciens (2)
INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, actif, date_creation) VALUES
('Martin', 'Pierre', 'technicien@iut.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'technicien', 1, 1, DATE_SUB(NOW(), INTERVAL 6 MONTH)),
('Dubois', 'Marie', 'marie.dubois@iut.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'technicien', 1, 1, DATE_SUB(NOW(), INTERVAL 4 MONTH));

-- Enseignants (3)
INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, actif, date_creation) VALUES
('Bernard', 'Jean', 'enseignant@iut.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'enseignant', 1, 1, DATE_SUB(NOW(), INTERVAL 8 MONTH)),
('Petit', 'Sophie', 'sophie.petit@iut.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'enseignant', 1, 1, DATE_SUB(NOW(), INTERVAL 5 MONTH)),
('Moreau', 'Laurent', 'laurent.moreau@iut.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'enseignant', 1, 1, DATE_SUB(NOW(), INTERVAL 3 MONTH));

-- Élèves (6)
INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, actif, date_creation) VALUES
('Durand', 'Lucas', 'eleve@iut.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'eleve', 1, 1, DATE_SUB(NOW(), INTERVAL 4 MONTH)),
('Leroy', 'Emma', 'emma.leroy@etu.univ-lyon1.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'eleve', 1, 1, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
('Roux', 'Thomas', 'thomas.roux@etu.univ-lyon1.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'eleve', 1, 1, DATE_SUB(NOW(), INTERVAL 3 MONTH)),
('Simon', 'Camille', 'camille.simon@etu.univ-lyon1.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'eleve', 1, 1, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
('Michel', 'Hugo', 'hugo.michel@etu.univ-lyon1.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'eleve', 1, 1, DATE_SUB(NOW(), INTERVAL 2 MONTH)),
('Garcia', 'Lea', 'lea.garcia@etu.univ-lyon1.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'eleve', 1, 1, DATE_SUB(NOW(), INTERVAL 1 MONTH));

-- Compte désactivé pour tests
INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, actif, date_creation) VALUES
('Test', 'Inactif', 'test.inactif@iut.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'eleve', 1, 0, DATE_SUB(NOW(), INTERVAL 1 MONTH));

-- Compte email non vérifié pour tests
INSERT INTO users (nom, prenom, email, password_hash, role, email_verifie, actif, code_verification, date_code_expiration, date_creation) VALUES
('Test', 'NonVerifie', 'test.nonverifie@iut.fr', '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u', 'eleve', 0, 1, '123456', DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW());

-- ============================================
-- DONNÉES DE TEST - MATÉRIEL EN STOCK
-- ============================================

-- Matériel de mesure (en stock)
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout) VALUES
('Oscilloscope Rigol DS1054Z', 'Mesure', 'en_stock', 'Salle TP Électronique B-04', 'Oscilloscope 4 voies 50MHz - REF-2024-001', DATE_SUB(NOW(), INTERVAL 6 MONTH)),
('Oscilloscope Tektronix TBS1052B', 'Mesure', 'en_stock', 'Salle TP Électronique B-04', 'Oscilloscope 2 voies 50MHz - REF-2024-002', DATE_SUB(NOW(), INTERVAL 6 MONTH)),
('Multimètre Fluke 117', 'Mesure', 'en_stock', 'Armoire A-12', 'Multimètre numérique TRMS - REF-2024-003', DATE_SUB(NOW(), INTERVAL 5 MONTH)),
('Multimètre Fluke 117 #2', 'Mesure', 'en_stock', 'Armoire A-12', 'Multimètre numérique TRMS - REF-2024-004', DATE_SUB(NOW(), INTERVAL 5 MONTH)),
('Générateur de fonctions GW Instek AFG-2225', 'Mesure', 'en_stock', 'Salle TP Électronique B-04', 'Générateur 25MHz 2 voies - REF-2024-005', DATE_SUB(NOW(), INTERVAL 4 MONTH)),
('Alimentation stabilisée 30V/5A', 'Mesure', 'en_stock', 'Armoire A-13', 'Alimentation de laboratoire - REF-2024-006', DATE_SUB(NOW(), INTERVAL 4 MONTH)),
('Alimentation stabilisée 30V/5A #2', 'Mesure', 'en_stock', 'Armoire A-13', 'Alimentation de laboratoire - REF-2024-007', DATE_SUB(NOW(), INTERVAL 4 MONTH));

-- Matériel informatique (en stock)
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout) VALUES
('Raspberry Pi 4 Model B 8GB', 'Informatique', 'en_stock', 'Armoire B-05', 'Kit complet avec alimentation et boîtier - REF-2024-010', DATE_SUB(NOW(), INTERVAL 3 MONTH)),
('Raspberry Pi 4 Model B 8GB #2', 'Informatique', 'en_stock', 'Armoire B-05', 'Kit complet avec alimentation et boîtier - REF-2024-011', DATE_SUB(NOW(), INTERVAL 3 MONTH)),
('Arduino Mega 2560', 'Informatique', 'en_stock', 'Armoire B-05', 'Carte microcontrôleur ATmega2560 - REF-2024-012', DATE_SUB(NOW(), INTERVAL 3 MONTH)),
('Arduino Uno R3', 'Informatique', 'en_stock', 'Armoire B-05', 'Carte microcontrôleur ATmega328P - REF-2024-013', DATE_SUB(NOW(), INTERVAL 3 MONTH)),
('Arduino Uno R3 #2', 'Informatique', 'en_stock', 'Armoire B-05', 'Carte microcontrôleur ATmega328P - REF-2024-014', DATE_SUB(NOW(), INTERVAL 3 MONTH));

-- Matériel robotique (en stock)
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout) VALUES
('Kit Robot Bras Articulé 6 axes', 'Robotique', 'en_stock', 'Salle Robotique C-01', 'Bras robotique éducatif - REF-2024-020', DATE_SUB(NOW(), INTERVAL 2 MONTH)),
('Kit Capteurs Grove', 'Robotique', 'en_stock', 'Armoire B-05', 'Pack 20 capteurs compatibles Arduino - REF-2024-021', DATE_SUB(NOW(), INTERVAL 2 MONTH)),
('Moteur pas à pas NEMA 17', 'Robotique', 'en_stock', 'Armoire B-06', 'Moteur bipolaire 1.8° - REF-2024-022', DATE_SUB(NOW(), INTERVAL 2 MONTH));

-- Équipements divers (en stock)
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout) VALUES
('Fer à souder Weller WE1010', 'Outillage', 'en_stock', 'Atelier Soudure D-02', 'Station de soudage 70W - REF-2024-030', DATE_SUB(NOW(), INTERVAL 5 MONTH)),
('Loupe binoculaire x20', 'Outillage', 'en_stock', 'Atelier Soudure D-02', 'Pour inspection CMS - REF-2024-031', DATE_SUB(NOW(), INTERVAL 5 MONTH)),
('Caméra Thermique FLIR C3-X', 'Mesure', 'en_stock', 'Bureau Techniciens', 'Caméra infrarouge compacte - REF-2024-032', DATE_SUB(NOW(), INTERVAL 1 MONTH));

-- ============================================
-- DONNÉES DE TEST - MATÉRIEL EMPRUNTÉ
-- ============================================

-- Emprunt en cours (pas en retard) - Élève Lucas
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout, emprunteur_id, date_retour_prevue) VALUES
('Oscilloscope Rigol DS1054Z #3', 'Mesure', 'emprunte', 'Élève - Lucas Durand', 'Oscilloscope 4 voies 50MHz - REF-2024-040', DATE_SUB(NOW(), INTERVAL 4 MONTH), 7, DATE_ADD(CURDATE(), INTERVAL 7 DAY));

-- Emprunt en cours (pas en retard) - Enseignant Jean
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout, emprunteur_id, date_retour_prevue) VALUES
('Kit STM32 Nucleo-F446RE', 'Informatique', 'emprunte', 'Enseignant - Jean Bernard', 'Kit développement STM32 - REF-2024-041', DATE_SUB(NOW(), INTERVAL 3 MONTH), 4, DATE_ADD(CURDATE(), INTERVAL 14 DAY));

-- Emprunt EN RETARD - Élève Emma (5 jours de retard)
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout, emprunteur_id, date_retour_prevue) VALUES
('Multimètre Fluke 87V', 'Mesure', 'emprunte', 'Élève - Emma Leroy', 'Multimètre industriel - REF-2024-042', DATE_SUB(NOW(), INTERVAL 2 MONTH), 8, DATE_SUB(CURDATE(), INTERVAL 5 DAY));

-- Emprunt EN RETARD - Élève Thomas (12 jours de retard)
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout, emprunteur_id, date_retour_prevue) VALUES
('Analyseur logique Saleae Logic 8', 'Mesure', 'emprunte', 'Élève - Thomas Roux', 'Analyseur 8 canaux USB - REF-2024-043', DATE_SUB(NOW(), INTERVAL 2 MONTH), 9, DATE_SUB(CURDATE(), INTERVAL 12 DAY));

-- Emprunt en cours - Enseignant Sophie
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout, emprunteur_id, date_retour_prevue) VALUES
('Drone DJI Tello EDU', 'Robotique', 'emprunte', 'Enseignant - Sophie Petit', 'Drone programmable éducatif - REF-2024-044', DATE_SUB(NOW(), INTERVAL 1 MONTH), 5, DATE_ADD(CURDATE(), INTERVAL 3 DAY));

-- ============================================
-- DONNÉES DE TEST - MATÉRIEL EN MAINTENANCE
-- ============================================

-- Maintenance en cours - Technicien Pierre
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout, technicien_id) VALUES
('Oscilloscope Agilent DSO-X 2024A', 'Mesure', 'en_maintenance', 'Atelier Maintenance', 'Problème écran - REF-2024-050', DATE_SUB(NOW(), INTERVAL 8 MONTH), 2);

-- Maintenance en cours - Technicien Marie
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout, technicien_id) VALUES
('Imprimante 3D Creality Ender 3 V2', 'Fabrication', 'en_maintenance', 'Atelier Maintenance', 'Remplacement extrudeur - REF-2024-051', DATE_SUB(NOW(), INTERVAL 6 MONTH), 3);

-- Maintenance en cours urgente - Technicien Pierre
INSERT INTO materiel (nom, categorie, etat, localisation, description, date_ajout, technicien_id) VALUES
('Alimentation Programmable Keysight E36312A', 'Mesure', 'en_maintenance', 'Atelier Maintenance', 'Calibration annuelle - REF-2024-052', DATE_SUB(NOW(), INTERVAL 1 YEAR), 2);

-- ============================================
-- DONNÉES DE TEST - EMPRUNTS HISTORIQUES
-- ============================================

-- Emprunts terminés à temps
INSERT INTO emprunts (materiel_id, emprunteur_id, date_emprunt, date_retour_prevue, date_retour_effective, jours_retard, commentaire) VALUES
(1, 7, DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 46 DAY), DATE_SUB(NOW(), INTERVAL 48 DAY), 0, 'Projet TP Électronique - rendu anticipé'),
(1, 8, DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 26 DAY), DATE_SUB(NOW(), INTERVAL 26 DAY), 0, 'TP Mesures'),
(2, 4, DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 76 DAY), DATE_SUB(NOW(), INTERVAL 78 DAY), 0, 'Démonstration cours magistral'),
(3, 9, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 16 DAY), 0, 'Projet personnel étudiant'),
(8, 10, DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 31 DAY), DATE_SUB(NOW(), INTERVAL 31 DAY), 0, 'Projet IoT'),
(10, 7, DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 0, 'TP Arduino');

-- Emprunts terminés EN RETARD
INSERT INTO emprunts (materiel_id, emprunteur_id, date_emprunt, date_retour_prevue, date_retour_effective, jours_retard, commentaire) VALUES
(5, 8, DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 36 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY), 3, 'Retard de 3 jours - projet prolongé'),
(6, 11, DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 21 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY), 7, 'Retard de 7 jours - matériel oublié'),
(9, 9, DATE_SUB(NOW(), INTERVAL 55 DAY), DATE_SUB(NOW(), INTERVAL 41 DAY), DATE_SUB(NOW(), INTERVAL 39 DAY), 2, 'Retard de 2 jours');

-- Emprunts en cours (liés au matériel emprunté)
INSERT INTO emprunts (materiel_id, emprunteur_id, date_emprunt, date_retour_prevue, date_retour_effective, jours_retard, commentaire) VALUES
(21, 7, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY), NULL, 0, 'Projet SAE en cours'),
(22, 4, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 14 DAY), NULL, 0, 'Préparation TP Microcontrôleurs'),
(23, 8, DATE_SUB(NOW(), INTERVAL 19 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY), NULL, 5, 'RETARD - À relancer'),
(24, 9, DATE_SUB(NOW(), INTERVAL 26 DAY), DATE_SUB(CURDATE(), INTERVAL 12 DAY), NULL, 12, 'RETARD IMPORTANT - Contact urgent'),
(25, 5, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY), NULL, 0, 'Démonstration programmation drone');

-- ============================================
-- DONNÉES DE TEST - MAINTENANCES HISTORIQUES
-- ============================================

-- Maintenances terminées
INSERT INTO maintenances (materiel_id, technicien_id, date_debut, date_fin, deadline, composants_commandes, couts, rapport, statut) VALUES
(1, 2, DATE_SUB(NOW(), INTERVAL 120 DAY), DATE_SUB(NOW(), INTERVAL 115 DAY), DATE_SUB(NOW(), INTERVAL 106 DAY), NULL, 0.00, 'Nettoyage préventif et mise à jour firmware. RAS.', 'terminee'),
(2, 2, DATE_SUB(NOW(), INTERVAL 100 DAY), DATE_SUB(NOW(), INTERVAL 95 DAY), DATE_SUB(NOW(), INTERVAL 86 DAY), 'Sonde de remplacement', 45.50, 'Remplacement sonde CH1 défectueuse. Test OK.', 'terminee'),
(5, 3, DATE_SUB(NOW(), INTERVAL 80 DAY), DATE_SUB(NOW(), INTERVAL 73 DAY), DATE_SUB(NOW(), INTERVAL 66 DAY), NULL, 0.00, 'Calibration annuelle effectuée. Certificat émis.', 'terminee'),
(18, 2, DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 52 DAY), DATE_SUB(NOW(), INTERVAL 46 DAY), 'Panne sèche neuve', 12.00, 'Remplacement panne usée. Test soudure OK.', 'terminee'),
(8, 3, DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 42 DAY), DATE_SUB(NOW(), INTERVAL 31 DAY), 'Carte SD 64GB', 15.00, 'Remplacement carte SD corrompue. Réinstallation OS.', 'terminee');

-- Maintenances en cours (liées au matériel en maintenance)
INSERT INTO maintenances (materiel_id, technicien_id, date_debut, date_fin, deadline, composants_commandes, couts, rapport, statut) VALUES
(26, 2, DATE_SUB(NOW(), INTERVAL 10 DAY), NULL, DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'Écran LCD en commande', 120.00, 'Diagnostic : écran HS. Commande passée, en attente livraison.', 'en_cours'),
(27, 3, DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'Extrudeur tout métal, buse 0.4mm', 35.00, 'Démontage effectué. Pièces reçues, remontage prévu demain.', 'en_cours'),
(28, 2, DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, DATE_ADD(CURDATE(), INTERVAL 12 DAY), NULL, 50.00, 'Calibration en cours avec équipement certifié.', 'en_cours');

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================
SELECT '========================================' AS '';
SELECT 'Base de donnees creee avec succes !' AS Statut;
SELECT '========================================' AS '';

SELECT 'STATISTIQUES DE LA BASE :' AS '';
SELECT COUNT(*) AS 'Nombre de tables' FROM information_schema.tables WHERE table_schema = 'gestion_iut' AND table_type = 'BASE TABLE';
SELECT COUNT(*) AS 'Nombre de vues' FROM information_schema.views WHERE table_schema = 'gestion_iut';
SELECT COUNT(*) AS 'Nombre de triggers' FROM information_schema.triggers WHERE trigger_schema = 'gestion_iut';

SELECT '' AS '';
SELECT 'DONNÉES DE TEST INSÉRÉES :' AS '';
SELECT COUNT(*) AS 'Total utilisateurs' FROM users;
SELECT
    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS 'Admins',
    SUM(CASE WHEN role = 'technicien' THEN 1 ELSE 0 END) AS 'Techniciens',
    SUM(CASE WHEN role = 'enseignant' THEN 1 ELSE 0 END) AS 'Enseignants',
    SUM(CASE WHEN role = 'eleve' THEN 1 ELSE 0 END) AS 'Élèves'
FROM users;

SELECT COUNT(*) AS 'Total matériels' FROM materiel;
SELECT
    SUM(CASE WHEN etat = 'en_stock' THEN 1 ELSE 0 END) AS 'En stock',
    SUM(CASE WHEN etat = 'emprunte' THEN 1 ELSE 0 END) AS 'Empruntés',
    SUM(CASE WHEN etat = 'en_maintenance' THEN 1 ELSE 0 END) AS 'En maintenance'
FROM materiel;

SELECT COUNT(*) AS 'Total emprunts' FROM emprunts;
SELECT
    SUM(CASE WHEN date_retour_effective IS NULL THEN 1 ELSE 0 END) AS 'En cours',
    SUM(CASE WHEN date_retour_effective IS NOT NULL AND jours_retard = 0 THEN 1 ELSE 0 END) AS 'Terminés à temps',
    SUM(CASE WHEN date_retour_effective IS NOT NULL AND jours_retard > 0 THEN 1 ELSE 0 END) AS 'Terminés en retard',
    SUM(CASE WHEN date_retour_effective IS NULL AND date_retour_prevue < CURDATE() THEN 1 ELSE 0 END) AS 'En retard actuellement'
FROM emprunts;

SELECT COUNT(*) AS 'Total maintenances' FROM maintenances;
SELECT
    SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) AS 'En cours',
    SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END) AS 'Terminées'
FROM maintenances;

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'COMPTES DE TEST DISPONIBLES :' AS '';
SELECT '========================================' AS '';
SELECT
    email AS 'Email',
    'M@teriel2025' AS 'Mot de passe',
    role AS 'Rôle',
    CASE WHEN actif = 1 THEN 'Actif' ELSE 'Inactif' END AS 'Statut',
    CASE WHEN email_verifie = 1 THEN 'Oui' ELSE 'Non' END AS 'Email vérifié'
FROM users
ORDER BY
    FIELD(role, 'admin', 'technicien', 'enseignant', 'eleve'),
    actif DESC;