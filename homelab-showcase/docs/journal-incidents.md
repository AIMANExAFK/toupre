# Journal d'incidents

Chaque panne du lab est consignée ici : symptôme observé, démarche de diagnostic, cause racine,
correction, puis mesure de prévention.

C'est la partie la plus utile du laboratoire. Installer un service s'apprend dans un cours ;
diagnostiquer pourquoi il ne marche plus ne s'apprend qu'en le vivant.

> **▸ À relire avant publication.** Ces trois fiches correspondent à des pannes réellement
> rencontrées sur le lab. Les causes retenues ci-dessous sont les plus probables pour chaque
> symptôme — vérifiez que les détails techniques correspondent à ce que vous avez constaté, et
> corrigez ce qui diffère. Des variantes sont proposées en fin de fiche quand plusieurs causes
> sont plausibles.

---

## INC-001 — Un poste refuse de rejoindre le domaine

**Gravité** : majeure · **Détection** : lors d'un déploiement de poste

### Symptôme

Tentative de jonction au domaine `lab.local` depuis un poste Windows fraîchement installé.
Échec avec un message d'erreur indiquant que le domaine est introuvable, ou que les
identifiants sont incorrects alors que le compte utilisé est bien administrateur du domaine.

### Diagnostic

Le message d'erreur de Windows est trompeur : il évoque souvent les identifiants alors que le
problème est ailleurs. J'ai donc procédé par couches, du bas vers le haut.

**1. Connectivité IP** — le contrôleur répond, la couche réseau est hors de cause :

```
ping 10.10.10.10
```

**2. Résolution de noms** — c'est là que ça bloque :

```
nslookup lab.local
ipconfig /all
```

`ipconfig /all` révèle que le poste utilise un serveur DNS externe (celui de la box, ou un
résolveur public) et non le contrôleur de domaine. Or un résolveur public ne connaît évidemment
pas la zone interne `lab.local`.

**3. Confirmation** — la requête sur les enregistrements de service Active Directory échoue :

```
nslookup -type=SRV _ldap._tcp.dc._msdcs.lab.local
```

Sans ces enregistrements SRV, le poste est incapable de localiser un contrôleur de domaine. La
jonction ne peut pas aboutir.

### Cause racine

Le poste ne pointait pas vers le DNS interne. L'étendue DHCP ne distribuait pas l'option 006
(serveurs DNS) correctement — les clients héritaient du résolveur de la box.

### Correction

Option 006 de l'étendue DHCP positionnée sur l'adresse du contrôleur de domaine, puis sur le
poste :

```
ipconfig /release && ipconfig /renew
ipconfig /flushdns
```

Vérification que `nslookup lab.local` résout bien, puis jonction au domaine — réussie.

### Prévention

- Contrôle systématique du DNS distribué par DHCP avant tout déploiement de poste.
- Ajout de la vérification `ipconfig /all` en première étape de la procédure de jonction
  ([PROC-001](procedures/proc-001-creation-utilisateur-ad.md)).
- Règle retenue : **sur un domaine Active Directory, les clients doivent pointer exclusivement
  vers le DNS interne.** Le résolveur externe se configure en redirecteur sur le serveur DNS,
  jamais sur le client.

> **▸ Variante — dérive d'horloge.** Si le constat était plutôt un écart de temps entre le poste
> et le contrôleur, la cause est la tolérance Kerberos : toute authentification dont
> l'horodatage dévie de plus de 5 minutes est rejetée, par protection contre le rejeu.
> Diagnostic : `w32tm /query /status` sur les deux machines. Correction : `w32tm /resync` après
> avoir désigné le contrôleur comme source de temps. Prévention : synchronisation NTP imposée
> par GPO. Si c'est ce que vous avez vécu, remplacez la fiche par cette version.

---

## INC-002 — Flux légitime bloqué par le pare-feu

**Gravité** : moyenne · **Détection** : signalement après mise en service d'une règle

### Symptôme

Un flux pourtant autorisé par une règle explicite n'aboutissait pas. La règle apparaissait bien
dans l'interface pfSense, correctement écrite (source, destination, port), mais le trafic était
malgré tout rejeté.

### Diagnostic

**1. Lecture des journaux de filtrage** — `Status → System Logs → Firewall`, avec un filtre sur
l'adresse source concernée. Le paquet apparaissait bien en `block`.

**2. Identification de la règle bloquante.** Le journal indique quelle règle a rejeté le paquet.
Ce n'était pas ma règle : c'était la règle implicite de refus par défaut, en fin de chaîne.

Autrement dit, **ma règle n'était jamais évaluée**.

**3. Vérification de l'interface.** C'est le point clé. Dans pfSense, les règles s'appliquent sur
**l'interface d'entrée du trafic**, c'est-à-dire celle par laquelle le paquet arrive dans le
pare-feu — pas celle vers laquelle il se dirige. Ma règle était placée sur l'interface de
destination, où le paquet n'arrivait jamais puisqu'il était déjà rejeté en amont.

### Cause racine

Règle positionnée sur la mauvaise interface. Erreur de raisonnement classique : on pense le
filtrage en termes de « vers où va le paquet » alors que pfSense l'évalue en « d'où il vient ».

S'y ajoute le fonctionnement en **première correspondance gagnante** : l'ordre des règles est
significatif, et une règle de refus plus haut dans la liste masque toute règle d'autorisation
placée en dessous.

### Correction

Règle déplacée sur l'interface source, puis remontée au-dessus des règles de refus plus
générales. Vérification immédiate dans les journaux : le paquet apparaît désormais en `pass`.

### Prévention

- Systématiquement vérifier, avant d'écrire une règle, **par quelle interface le trafic entre**.
- Contrôler l'ordre : sur pfSense, la première règle qui correspond l'emporte.
- Toute nouvelle règle est validée en observant les journaux de filtrage, pas seulement en
  testant le service.
- Les règles temporaires de dépannage portent un commentaire daté `TEMP-JJ/MM/AAAA` et sont
  purgées lors de la revue.

---

## INC-003 — Panne matérielle sur un poste du lab

**Gravité** : critique · **Détection** : dégradation puis indisponibilité

### Symptôme

Ralentissements progressifs de la machine, puis gel complet du système. Au redémarrage, temps de
démarrage anormalement long, et finalement échec de montage du système de fichiers.

C'est un type d'incident que l'on ne rencontre jamais en environnement purement virtualisé :
il n'existe que parce que le lab tourne sur du matériel réel, souvent du matériel de
récupération.

### Diagnostic

**1. Journaux système.** Erreurs d'entrée/sortie sur le périphérique de stockage :

```
dmesg | grep -iE 'error|i/o|ata|fail'
journalctl -p err -b
```

**2. État de santé du disque** — le diagnostic décisif :

```
smartctl -a /dev/sda
```

Les compteurs SMART montraient une dégradation nette : secteurs réalloués
(`Reallocated_Sector_Ct`) et secteurs en attente de réallocation
(`Current_Pending_Sector`) en augmentation.

**3. Test étendu** pour confirmer avant de conclure :

```
smartctl -t long /dev/sda
```

### Cause racine

Défaillance physique du disque dur — usure d'un support de récupération. Aucune erreur de
configuration en cause.

Le vrai problème n'était pas la panne elle-même, inévitable sur du matériel d'occasion, mais le
fait qu'elle n'ait été détectée qu'au moment de l'indisponibilité, alors que les compteurs SMART
se dégradaient depuis un moment.

### Correction

Remplacement du disque, réinstallation du système, restauration des données depuis la
sauvegarde.

### Prévention

- Contrôle SMART périodique sur toutes les machines du lab, avec alerte sur l'évolution des
  compteurs de secteurs réalloués — **surveiller la tendance, pas seulement le verdict global**,
  un disque peut être annoncé « PASSED » tout en se dégradant.
- Vérification que les données critiques (annuaire, base GLPI, configuration pfSense) sont bien
  couvertes par la sauvegarde, et **test de restauration** — une sauvegarde jamais restaurée
  n'est pas une sauvegarde.
- Sur du matériel de récupération, la panne matérielle n'est pas un accident : c'est une
  échéance. L'infrastructure doit être conçue pour y survivre.

### Ce que j'en retiens

C'est la même logique qu'en milieu hospitalier : ce qui compte n'est pas d'empêcher toute panne
— c'est impossible — mais de la détecter tôt et d'avoir prévu la reprise.

> **▸ Variantes.** Si la panne concernait l'**alimentation** (redémarrages aléatoires sous
> charge, extinctions brutales sans trace dans les journaux) ou la **carte réseau** (lien qui
> bascule, débit négocié à 100 Mb/s au lieu de 1 Gb/s, pertes de paquets — à diagnostiquer avec
> `ethtool eth0` et `ip -s link`), adaptez la fiche : la structure et la conclusion restent
> valables.

---

## Modèle pour un nouvel incident

```markdown
## INC-XXX — Titre court et factuel

**Gravité** : mineure / majeure / critique · **Détection** : …

### Symptôme
Ce qui a été observé, sans interprétation.

### Diagnostic
La démarche suivie, dans l'ordre, avec les commandes utilisées et ce que chaque
résultat a permis d'écarter.

### Cause racine
La cause réelle, pas le symptôme.

### Correction
Ce qui a rétabli le service.

### Prévention
Ce qui a été mis en place pour que cela ne se reproduise pas.
```
