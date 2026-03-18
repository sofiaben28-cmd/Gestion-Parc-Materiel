# ============================================
# SCHEDULER D'EMAILS DE RAPPEL
# ============================================
# Script pour envoyer automatiquement les emails de rappel
# ============================================

import schedule
import time
from app import VerifierEtEnvoyerRappels

def TacheQuotidienne():
    """Tâche exécutée tous les jours à 9h00"""
    print("\n" + "="*50)
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("Vérification et envoi des rappels...")
    print("="*50)

    VerifierEtEnvoyerRappels()

    print("="*50 + "\n")


# Programmer la tâche tous les jours à 9h00
schedule.every().day.at("09:00").do(TacheQuotidienne)

print("=" * 60)
print("SCHEDULER D'EMAILS - GESTION MATERIEL IUT GEII")
print("=" * 60)
print("Programmé pour s'exécuter tous les jours à 9h00")
print("Envoi automatique des rappels de retour")
print()
print("Types de rappels envoyés :")
print("  - J-1 : Rappel la veille du retour")
print("  - 3 jours de retard : Premier avertissement")
print("  - 7 jours de retard : Avertissement renforcé")
print("  - 14 jours de retard : Notification facture envoyée")
print()
print("Appuyez sur Ctrl+C pour arrêter le scheduler")
print("=" * 60 + "\n")

# Boucle infinie pour exécuter les tâches programmées
while True:
    schedule.run_pending()
    time.sleep(60)  # Vérifier toutes les minutes
