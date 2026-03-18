""" A renre dans la base 
USE gestion_iut;

UPDATE users 
SET password_hash = '$2b$12$t2Nn71.LvPcw4KlyJH4abeY0dI5GVhiyfNrP.LZzYgcXXrHu3Aw0u'
WHERE email = 'admin@iut.fr';

-- Vérifier
SELECT email, password_hash FROM users WHERE email = 'admin@iut.fr';

exit; """
import bcrypt

password = "M@teriel2025"
hash_mdp = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print(hash_mdp.decode('utf-8'))