// ============================================
// AUTHENTIFICATION - Gestion Matériel IUT GEII
// ============================================
// Inclut toasts et support thème
// ============================================

// Variables globales
let emailInscription = '';

// Expressions régulières pour la validation
const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MIN_PASSWORD_LENGTH = 6;

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Boutons basculer login/inscription
    document.getElementById('btn-show-inscription').addEventListener('click', AfficherInscription);
    document.getElementById('btn-show-login').addEventListener('click', AfficherLogin);

    // Formulaire de connexion
    document.getElementById('form-login').addEventListener('submit', Connexion);

    // Formulaire d'inscription
    document.getElementById('form-inscription').addEventListener('submit', Inscription);

    // Formulaire de vérification
    document.getElementById('form-verification').addEventListener('submit', VerifierCode);
    document.getElementById('btn-renvoyer-code').addEventListener('click', RenvoyerCode);

    // Validation en temps réel pour le formulaire d'inscription
    InitialiserValidationTempsReel();

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// ============================================
// VALIDATION EN TEMPS RÉEL
// ============================================

/**
 * Initialise la validation en temps réel sur les champs du formulaire d'inscription
 */
function InitialiserValidationTempsReel() {
    // Validation email
    const inputEmail = document.getElementById('inscription-email');
    if (inputEmail) {
        inputEmail.addEventListener('blur', function() {
            ValiderChampEmail(this);
        });
    }

    // Validation mot de passe
    const inputPassword = document.getElementById('inscription-password');
    if (inputPassword) {
        inputPassword.addEventListener('input', function() {
            ValiderChampPassword(this);
        });
    }

    // Validation confirmation mot de passe
    const inputConfirm = document.getElementById('inscription-password-confirm');
    if (inputConfirm) {
        inputConfirm.addEventListener('input', function() {
            ValiderConfirmationPassword();
        });
    }
}

/**
 * Valide le format de l'email et affiche un indicateur visuel
 */
function ValiderChampEmail(input) {
    const email = input.value.trim();

    // Retirer les classes précédentes
    input.classList.remove('input-valid', 'input-invalid');

    if (email === '') return;

    if (REGEX_EMAIL.test(email)) {
        input.classList.add('input-valid');
    } else {
        input.classList.add('input-invalid');
    }
}

/**
 * Valide la force du mot de passe et affiche un indicateur visuel
 */
function ValiderChampPassword(input) {
    const password = input.value;

    // Retirer les classes précédentes
    input.classList.remove('input-valid', 'input-invalid', 'input-warning');

    if (password === '') return;

    if (password.length >= MIN_PASSWORD_LENGTH) {
        input.classList.add('input-valid');
    } else {
        input.classList.add('input-invalid');
    }

    // Re-valider la confirmation si elle existe
    ValiderConfirmationPassword();
}

/**
 * Valide que les mots de passe correspondent
 */
function ValiderConfirmationPassword() {
    const password = document.getElementById('inscription-password').value;
    const confirm = document.getElementById('inscription-password-confirm');
    const confirmValue = confirm.value;

    // Retirer les classes précédentes
    confirm.classList.remove('input-valid', 'input-invalid');

    if (confirmValue === '') return;

    if (password === confirmValue && password.length >= MIN_PASSWORD_LENGTH) {
        confirm.classList.add('input-valid');
    } else {
        confirm.classList.add('input-invalid');
    }
}

/**
 * Valide tous les champs du formulaire d'inscription
 * Retourne true si valide, false sinon
 */
function ValiderFormulaireInscription(nom, prenom, email, password, passwordConfirm, role) {
    // Vérifier les champs obligatoires
    if (!nom || !prenom || !email || !password || !role) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('Tous les champs sont obligatoires');
        }
        return false;
    }

    // Valider le format de l'email
    if (!REGEX_EMAIL.test(email)) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('Adresse email invalide');
        }
        return false;
    }

    // Vérifier la longueur du mot de passe
    if (password.length < MIN_PASSWORD_LENGTH) {
        if (typeof Toast !== 'undefined') {
            Toast.warning(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`);
        }
        return false;
    }

    // Vérifier que les mots de passe correspondent
    if (password !== passwordConfirm) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('Les mots de passe ne correspondent pas');
        }
        return false;
    }

    return true;
}

// ============================================
// BASCULER ENTRE LOGIN ET INSCRIPTION
// ============================================

function AfficherInscription(e) {
    e.preventDefault();
    document.getElementById('form-login-container').classList.remove('active');
    document.getElementById('form-inscription-container').classList.add('active');

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function AfficherLogin(e) {
    e.preventDefault();
    document.getElementById('form-inscription-container').classList.remove('active');
    document.getElementById('form-login-container').classList.add('active');

    // Réinitialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ============================================
// CONNEXION
// ============================================

async function Connexion(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const messageErreur = document.getElementById('login-error');

    // Réinitialiser les messages d'erreur
    messageErreur.textContent = '';

    try {
        const reponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await reponse.json();

        if (reponse.ok) {
            // Connexion réussie : rediriger selon le rôle
            if (typeof Toast !== 'undefined') {
                Toast.success('Connexion réussie !');
            }
            setTimeout(() => {
                RedirigerSelonRole(data.role);
            }, 500);
        } else {
            // Afficher l'erreur
            messageErreur.textContent = data.error || 'Erreur de connexion';
            if (typeof Toast !== 'undefined') {
                Toast.error(data.error || 'Erreur de connexion');
            }
        }
    } catch (erreur) {
        messageErreur.textContent = 'Erreur de connexion au serveur';
        console.error('Erreur connexion:', erreur);
        if (typeof Toast !== 'undefined') {
            Toast.error('Erreur de connexion au serveur');
        }
    }
}

// ============================================
// INSCRIPTION
// ============================================

async function Inscription(e) {
    e.preventDefault();

    const nom = document.getElementById('inscription-nom').value.trim();
    const prenom = document.getElementById('inscription-prenom').value.trim();
    const email = document.getElementById('inscription-email').value.trim();
    const password = document.getElementById('inscription-password').value;
    const passwordConfirm = document.getElementById('inscription-password-confirm').value;
    const role = document.getElementById('inscription-role').value;
    const messageErreur = document.getElementById('inscription-error');

    // Réinitialiser les messages d'erreur
    messageErreur.textContent = '';

    // Validation complète du formulaire
    if (!ValiderFormulaireInscription(nom, prenom, email, password, passwordConfirm, role)) {
        return;
    }

    try {
        const reponse = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nom, prenom, email, password, role })
        });

        const data = await reponse.json();

        if (reponse.ok || reponse.status === 201) {
            // Inscription réussie : afficher popup de vérification
            emailInscription = email;
            document.getElementById('email-verification-display').textContent = email;
            document.getElementById('popup-verification').style.display = 'flex';

            // Réinitialiser le formulaire
            document.getElementById('form-inscription').reset();

            if (typeof Toast !== 'undefined') {
                Toast.info('Un code de vérification a été envoyé à votre email');
            }

            // Réinitialiser les icônes Lucide
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } else {
            // Afficher l'erreur
            messageErreur.textContent = data.error || 'Erreur lors de l\'inscription';
            if (typeof Toast !== 'undefined') {
                Toast.error(data.error || 'Erreur lors de l\'inscription');
            }
        }
    } catch (erreur) {
        messageErreur.textContent = 'Erreur de connexion au serveur';
        console.error('Erreur inscription:', erreur);
        if (typeof Toast !== 'undefined') {
            Toast.error('Erreur de connexion au serveur');
        }
    }
}

// ============================================
// VÉRIFICATION CODE EMAIL
// ============================================

async function VerifierCode(e) {
    e.preventDefault();

    const code = document.getElementById('verification-code').value.trim();
    const messageErreur = document.getElementById('verification-error');

    // Réinitialiser les messages d'erreur
    messageErreur.textContent = '';

    if (!code || code.length !== 6) {
        messageErreur.textContent = 'Le code doit contenir 6 chiffres';
        if (typeof Toast !== 'undefined') {
            Toast.warning('Le code doit contenir 6 chiffres');
        }
        return;
    }

    try {
        const reponse = await fetch('/api/auth/verify-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: emailInscription, code })
        });

        const data = await reponse.json();

        if (reponse.ok) {
            // Vérification réussie
            if (typeof Toast !== 'undefined') {
                Toast.success('Email vérifié ! Vous pouvez maintenant vous connecter.');
            }

            // Fermer la popup
            document.getElementById('popup-verification').style.display = 'none';

            // Retourner au formulaire de connexion
            AfficherLogin({ preventDefault: () => {} });

            // Pré-remplir l'email
            document.getElementById('login-email').value = emailInscription;
        } else {
            // Afficher l'erreur
            messageErreur.textContent = data.error || 'Code incorrect';
            if (typeof Toast !== 'undefined') {
                Toast.error(data.error || 'Code incorrect');
            }
        }
    } catch (erreur) {
        messageErreur.textContent = 'Erreur de connexion au serveur';
        console.error('Erreur vérification:', erreur);
        if (typeof Toast !== 'undefined') {
            Toast.error('Erreur de connexion au serveur');
        }
    }
}

// ============================================
// RENVOYER CODE
// ============================================

async function RenvoyerCode() {
    const messageErreur = document.getElementById('verification-error');
    messageErreur.textContent = '';

    try {
        const reponse = await fetch('/api/auth/send-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: emailInscription })
        });

        const data = await reponse.json();

        if (reponse.ok) {
            if (typeof Toast !== 'undefined') {
                Toast.success('Un nouveau code a été envoyé par email');
            }
        } else {
            messageErreur.textContent = data.error || 'Erreur lors du renvoi du code';
            if (typeof Toast !== 'undefined') {
                Toast.error(data.error || 'Erreur lors du renvoi du code');
            }
        }
    } catch (erreur) {
        messageErreur.textContent = 'Erreur de connexion au serveur';
        console.error('Erreur renvoi code:', erreur);
        if (typeof Toast !== 'undefined') {
            Toast.error('Erreur de connexion au serveur');
        }
    }
}

// ============================================
// REDIRECTION SELON RÔLE
// ============================================

function RedirigerSelonRole(role) {
    if (role === 'admin') {
        window.location.href = '/dashboard-admin';
    } else if (role === 'technicien') {
        window.location.href = '/dashboard-technicien';
    } else {
        // eleve ou enseignant
        window.location.href = '/dashboard-user';
    }
}
